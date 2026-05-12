use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

// Guards against spawning more than one tracker subprocess.
static TRACKER_RUNNING: AtomicBool = AtomicBool::new(false);

// ---------------------------------------------------------------------------
// Permission state
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub enum PermissionState {
    #[default]
    NotDetermined,
    Authorized,
    Denied,
    Restricted,
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct StoredPermissions {
    camera: PermissionState,
}

fn permissions_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir unavailable")
        .join("permissions.json")
}

fn load_permissions(app: &tauri::AppHandle) -> StoredPermissions {
    let path = permissions_path(app);
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_permissions(app: &tauri::AppHandle, perms: &StoredPermissions) {
    let path = permissions_path(app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(perms) {
        let _ = fs::write(path, json);
    }
}

#[tauri::command]
fn get_permission_state(app: tauri::AppHandle) -> PermissionState {
    load_permissions(&app).camera
}

#[tauri::command]
fn store_permission_state(app: tauri::AppHandle, state: PermissionState) {
    let mut perms = load_permissions(&app);
    perms.camera = state;
    save_permissions(&app, &perms);
}

#[tauri::command]
fn open_camera_settings() {
    let _ = Command::new("open")
        .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Camera")
        .spawn();
}

#[tauri::command]
fn toggle_fullscreen(app: tauri::AppHandle) -> Result<bool, String> {
    let window = app.get_webview_window("main")
        .ok_or_else(|| "window not found".to_string())?;
    let is_fs = window.is_fullscreen().map_err(|e| e.to_string())?;
    window.set_fullscreen(!is_fs).map_err(|e| e.to_string())?;
    Ok(!is_fs)
}

// ---------------------------------------------------------------------------
// Mascot profile
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub enum MascotState {
    #[default]
    Idle,
    Attentive,
    Listening,
    Speaking,
    Happy,
    Tired,
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct MascotProfile {
    name: String,
    last_state: MascotState,
}

fn mascot_profile_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir unavailable")
        .join("mascot_profile.json")
}

fn load_mascot_profile(app: &tauri::AppHandle) -> MascotProfile {
    let path = mascot_profile_path(app);
    fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| MascotProfile {
            name: "CyberPet".to_string(),
            last_state: MascotState::Idle,
        })
}

fn save_mascot_profile(app: &tauri::AppHandle, profile: &MascotProfile) {
    let path = mascot_profile_path(app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(profile) {
        let _ = fs::write(path, json);
    }
}

#[tauri::command]
fn get_mascot_state(app: tauri::AppHandle) -> MascotProfile {
    load_mascot_profile(&app)
}

#[tauri::command]
fn set_mascot_state(app: tauri::AppHandle, state: MascotState) {
    let mut profile = load_mascot_profile(&app);
    // Clamp name to 64 ASCII-printable characters to prevent unbounded writes
    profile.name = profile.name.chars()
        .filter(|c| c.is_ascii_graphic() || *c == ' ')
        .take(64)
        .collect();
    profile.last_state = state;
    save_mascot_profile(&app, &profile);
}

// ---------------------------------------------------------------------------
// Tracker bridge
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
struct HeadPose {
    yaw: f32,
    pitch: f32,
    roll: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
struct TrackerFrame {
    face_detected: bool,
    head_pose: HeadPose,
    blink: f32,
    smile: f32,
    mouth_open: f32,
    // Pass appearance through as opaque JSON — keeps Rust in sync automatically
    // when Python adds new appearance fields without requiring Rust changes.
    #[serde(skip_serializing_if = "Option::is_none")]
    appearance: Option<JsonValue>,
}

fn tracker_script(app: &tauri::AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../services/face-tracker/main.py")
    } else {
        app.path()
            .resource_dir()
            .expect("resource dir unavailable")
            .join("face-tracker/main.py")
    }
}

// Find the first Python 3.10+ executable available on this machine.
// Tries versioned names first so we never accidentally use Python 2 or 3.7.
// Resolve a Python 3.10+ executable to its absolute path via `which`.
// Using an absolute path prevents PATH-based substitution attacks where a
// malicious binary earlier in PATH could shadow the real interpreter.
fn find_python() -> Option<PathBuf> {
    let candidates = [
        "python3.14", "python3.13", "python3.12", "python3.11", "python3.10",
        "python3", "python",
    ];
    for name in &candidates {
        // Resolve to absolute path first
        let abs = match Command::new("which").arg(name).output() {
            Ok(out) if out.status.success() => {
                let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
                PathBuf::from(path)
            }
            _ => continue,
        };
        if !abs.exists() { continue; }

        // Verify it is actually Python 3.10+
        if let Ok(out) = Command::new(&abs).arg("--version").output() {
            let ver = String::from_utf8_lossy(&out.stdout).to_string()
                + &String::from_utf8_lossy(&out.stderr);
            if let Some(v) = ver.strip_prefix("Python ") {
                let parts: Vec<&str> = v.trim().splitn(3, '.').collect();
                if parts.len() >= 2 {
                    let major: u32 = parts[0].parse().unwrap_or(0);
                    let minor: u32 = parts[1].parse().unwrap_or(0);
                    if major == 3 && minor >= 10 {
                        return Some(abs);
                    }
                }
            }
        }
    }
    None
}

#[tauri::command]
fn start_tracker(app: tauri::AppHandle) -> Result<(), String> {
    // Prevent multiple concurrent tracker subprocesses
    if TRACKER_RUNNING.compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst).is_err() {
        return Ok(()); // already running — silently succeed
    }

    let script = tracker_script(&app);
    if !script.exists() {
        TRACKER_RUNNING.store(false, Ordering::SeqCst);
        return Err(format!("tracker not found: {}", script.display()));
    }

    let python_path = match find_python() {
        Some(p) => p,
        None => {
            TRACKER_RUNNING.store(false, Ordering::SeqCst);
            let _ = app.emit("tracker:error", "python_not_found: Python 3.10+ is required. Install it from https://python.org");
            return Ok(());
        }
    };

    // Forward CYBERPET_* env vars to the Python subprocess so .env values reach the tracker
    let cam_index  = std::env::var("CYBERPET_CAMERA_INDEX").unwrap_or_else(|_| "0".into());
    let detect_cf  = std::env::var("CYBERPET_DETECTION_CONFIDENCE").unwrap_or_else(|_| "0.5".into());
    let track_cf   = std::env::var("CYBERPET_TRACKING_CONFIDENCE").unwrap_or_else(|_| "0.5".into());

    std::thread::spawn(move || {
        let mut child = match Command::new(&python_path)
            .arg(&script)
            .env("CYBERPET_CAMERA_INDEX",           &cam_index)
            .env("CYBERPET_DETECTION_CONFIDENCE",   &detect_cf)
            .env("CYBERPET_TRACKING_CONFIDENCE",    &track_cf)
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
        {
            Ok(c) => c,
            Err(e) => {
                TRACKER_RUNNING.store(false, Ordering::SeqCst);
                let _ = app.emit("tracker:error", e.to_string());
                return;
            }
        };

        let stdout = child.stdout.take().expect("stdout piped");
        for line in BufReader::new(stdout).lines() {
            match line {
                Ok(l) if !l.is_empty() => {
                    if let Ok(frame) = serde_json::from_str::<TrackerFrame>(&l) {
                        let _ = app.emit("tracker:frame", frame);
                    } else {
                        let _ = app.emit("tracker:error", l);
                    }
                }
                _ => {}
            }
        }

        let _ = child.wait();
        TRACKER_RUNNING.store(false, Ordering::SeqCst);
    });

    Ok(())
}

// ---------------------------------------------------------------------------
// Tray state — current mascot label for tooltip
// ---------------------------------------------------------------------------

static TRAY_LABEL: Mutex<String> = Mutex::new(String::new());

#[tauri::command]
fn update_tray_tooltip(app: tauri::AppHandle, mascot: String, state: String) {
    if let Ok(mut label) = TRAY_LABEL.lock() {
        *label = format!("{} · {}", mascot, state);
    }
    if let Some(tray) = app.tray_by_id("main") {
        let tip = format!("CyberPet — {} · {}", mascot, state);
        let _ = tray.set_tooltip(Some(&tip));
    }
}

// ---------------------------------------------------------------------------
// App entry point
// ---------------------------------------------------------------------------

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_hide = MenuItem::with_id(app, "show_hide", "Show / Hide", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit      = MenuItem::with_id(app, "quit", "Quit CyberPet", true, None::<&str>)?;
    let menu      = Menu::with_items(app, &[&show_hide, &separator, &quit])?;

    TrayIconBuilder::with_id("main")
        .icon(app.default_window_icon().cloned().unwrap())
        .icon_as_template(true)   // macOS: renders as template (auto dark/light)
        .menu(&menu)
        .tooltip("CyberPet")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show_hide" => toggle_main_window(app),
            "quit"      => app.exit(0),
            _           => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event {
                toggle_main_window(tray.app_handle())
            }
        })
        .build(app)?;
    Ok(())
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_permission_state,
            store_permission_state,
            open_camera_settings,
            start_tracker,
            get_mascot_state,
            set_mascot_state,
            toggle_fullscreen,
            update_tray_tooltip,
        ])
        .setup(|app| {
            build_tray(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
