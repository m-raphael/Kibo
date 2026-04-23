use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};

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
}

fn tracker_script(app: &tauri::AppHandle) -> PathBuf {
    if cfg!(debug_assertions) {
        // Dev: resolve from Cargo manifest dir (src-tauri/) → project root
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../services/face-tracker/main.py")
    } else {
        app.path()
            .resource_dir()
            .expect("resource dir unavailable")
            .join("face-tracker/main.py")
    }
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

    std::thread::spawn(move || {
        let mut child = match Command::new("python3")
            .arg(&script)
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
// App entry point
// ---------------------------------------------------------------------------

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}
