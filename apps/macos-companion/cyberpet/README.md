# CyberPet

> A local-first macOS companion that watches your face and reacts — no cloud, no storage, no tracking.

CyberPet sits in the corner of your screen as a small robot. It uses your webcam to read five geometric signals per frame (head pose, blink, smile, mouth opening) and maps them to six expressive states. Everything runs on-device. No video, no biometrics, and no personal data ever leaves your machine.

[![Security](https://github.com/m-raphael/cyberpet/actions/workflows/security.yml/badge.svg)](https://github.com/m-raphael/cyberpet/actions/workflows/security.yml)
[![Staging Build](https://github.com/m-raphael/cyberpet/actions/workflows/staging.yml/badge.svg)](https://github.com/m-raphael/cyberpet/actions/workflows/staging.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│  macOS Window  (Tauri 2 · transparent · 320×320 · AOT)  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  WebView  (Vite 6 · TypeScript 5 · CSS)          │   │
│  │                                                  │   │
│  │  @cyberpet/mascot-renderer  ◄── SVG robot face   │   │
│  │  @cyberpet/mascot-core      ◄── state machine    │   │
│  │  @cyberpet/shared           ◄── math utilities   │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │  Tauri IPC (invoke / emit)             │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  Rust (lib.rs)                                   │   │
│  │  • Permission state  →  permissions.json         │   │
│  │  • Mascot profile    →  mascot_profile.json      │   │
│  │  • Tracker bridge    →  spawns Python subprocess │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │  stdout  (JSON lines, ~30 fps)         │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  Python 3.10+  ·  MediaPipe FaceMesh             │   │
│  │  • solvePnP head pose (yaw / pitch / roll)       │   │
│  │  • EAR blink score                               │   │
│  │  • Lip geometry → smile + mouth_open             │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | TypeScript 5, Vite 6 |
| Face tracking | Python 3.10+, MediaPipe FaceMesh, OpenCV, NumPy |
| Rendering | Inline SVG, CSS custom properties, `setAttribute` for geometry |
| Persistence | JSON files in `$APP_DATA/cyberpet/` |
| CI/CD | GitHub Actions |
| Secret scanning | gitleaks v8 (pre-commit + CI) |

---

## Mascot States

| State | Expression | Trigger |
|---|---|---|
| `idle` | Neutral face, breathing loop | No face detected |
| `attentive` | Wide pupils | Head turned/tilted > 12° |
| `listening` | Small open mouth | Mouth open 0.18–0.45 |
| `speaking` | Large open mouth | Mouth open > 0.45 |
| `happy` | Arc smile, blush, narrow pupils | Smile score > 0.55 |
| `tired` | Drooped eyelids, droop mouth | Blink score > 0.75 |

State transitions are debounced with a 400 ms hysteresis to prevent flickering. Pupils track head pose in real time at ~30 fps with an exponential moving average smoother (α = 0.25).

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| macOS | 13 Ventura+ | — |
| Node.js | **22+** | `nvm install 22` |
| npm | 10+ | bundled with Node 22 |
| Rust | stable **1.77+** | [rustup.rs](https://rustup.rs) |
| Python | **3.10+** | [python.org](https://www.python.org/downloads/) |
| Tauri CLI v2 | latest | `cargo install tauri-cli` |

> **Note:** The system Python on macOS Monterey/Ventura is 3.9 or earlier. Use [pyenv](https://github.com/pyenv/pyenv) or Homebrew (`brew install python@3.11`) to get 3.10+.

---

## Local Setup

```bash
# 1. Clone
git clone https://github.com/m-raphael/cyberpet.git
cd cyberpet

# 2. Pin Node version
nvm install          # reads .nvmrc → Node 22
nvm use

# 3. Install JS dependencies
npm install

# 4. Install Python face-tracker dependencies
pip3 install -r services/face-tracker/requirements.txt

# 5. Activate the secret-scan pre-commit hook (one-time per clone)
bash ../../scripts/setup-hooks.sh
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in values as needed.

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `VITE_DEV_PORT` | `1420` | Vite dev server port — must match `tauri.conf.json devUrl` |
| `VITE_DEBUG_TRACKER` | `false` | Log verbose tracker output to the browser console |
| `CYBERPET_CAMERA_INDEX` | `0` | Camera device index (`0` = built-in webcam) |
| `CYBERPET_DETECTION_CONFIDENCE` | `0.5` | MediaPipe face detection threshold |
| `CYBERPET_TRACKING_CONFIDENCE` | `0.5` | MediaPipe face tracking threshold |
| `APPLE_CERTIFICATE` | — | Base64-encoded `.p12` for macOS code signing (CI only) |
| `APPLE_CERTIFICATE_PASSWORD` | — | Password for the `.p12` (CI only) |
| `APPLE_SIGNING_IDENTITY` | — | `Developer ID Application: ...` string (CI only) |
| `APPLE_ID` | — | Apple ID email for notarisation (CI only) |
| `APPLE_PASSWORD` | — | App-specific password for notarisation (CI only) |
| `APPLE_TEAM_ID` | — | Apple Developer Team ID (CI only) |

> All signing variables are only required for notarised distribution builds. Local and staging development runs fine without them.

---

## Commands

```bash
# ── Development ──────────────────────────────────────────
npm run dev            # Start Vite frontend dev server (port 1420)
npm run tauri:dev      # Start full Tauri app (Vite + Rust hot-reload)

# ── Type checking ────────────────────────────────────────
npm run typecheck      # tsc --noEmit across src/ and all packages/

# ── Production build ─────────────────────────────────────
npm run build          # Vite production bundle → dist/
npm run tauri:build    # Full Tauri .app bundle (requires Rust + macOS)
                       # Output: src-tauri/target/release/bundle/macos/CyberPet.app

# ── Security ─────────────────────────────────────────────
pre-commit run --staged         # Scan staged files for secrets
gitleaks detect --source . --log-opts="HEAD"  # Full history scan
```

---

## Project Structure

```
cyberpet/
├── .env.example                  # Environment variable template
├── .nvmrc                        # Node version pin (22)
├── .pre-commit-config.yaml       # gitleaks hook config
├── vite.config.ts                # Vite config + @cyberpet/* path aliases
├── tsconfig.json                 # TypeScript config with workspace paths
│
├── src/                          # Frontend entry point
│   ├── index.html
│   ├── cyberpet-main.ts          # App bootstrap, Tauri IPC, tracker listener
│   └── styles.css                # All UI styles + mascot SVG CSS
│
├── packages/                     # Internal TypeScript packages
│   ├── mascot-core/              # MascotState types, tracker→state mapping, hysteresis
│   ├── mascot-renderer/          # SVG mascot builder, updateMascotState(), setPupilOffset()
│   └── shared/                   # clamp, lerp, expLerp, mapRange
│
├── services/
│   └── face-tracker/
│       ├── main.py               # MediaPipe FaceMesh tracker — emits JSON lines to stdout
│       └── requirements.txt      # mediapipe, opencv-python-headless, numpy
│
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json           # Window config, CSP, bundle resources
│   ├── entitlements.plist        # com.apple.security.device.camera
│   └── src/
│       ├── main.rs               # Tauri entry point
│       └── lib.rs                # IPC commands: permissions, mascot state, tracker bridge
│
├── .github/
│   └── workflows/
│       ├── security.yml          # Gitleaks scan + typecheck + build (all PRs + main)
│       └── staging.yml           # Full Tauri .app build + artifact upload (main + manual)
│
└── docs/
    ├── spec.md                   # Product and technical scope
    ├── privacy.md                # Data handling and forbidden inference categories
    ├── security.md               # Secret scanning setup and incident response
    └── design/DESIGN.md          # Visual system: color tokens, layout, motion, mascot rules
```

---

## Staging & Deployment

### Automated (GitHub Actions)

Every push to `main` triggers two workflows:

1. **`security.yml`** — gitleaks secret scan, TypeScript typecheck, Vite production build
2. **`staging.yml`** — full Tauri macOS `.app` bundle, uploaded as a 14-day artifact

Download the latest staging build from the **Actions** tab → **Staging Build** → **CyberPet-macos-staging**.

### Manual staging build

```bash
# Ensure Rust, Node 22, and Python 3.10+ are installed
npm ci
pip3 install -r services/face-tracker/requirements.txt
npm run tauri:build

# The notarised .app and .dmg appear at:
# src-tauri/target/release/bundle/macos/
```

For code signing and notarisation, set the `APPLE_*` environment variables (see `.env.example`) before running `tauri build`.

### Required GitHub Secrets (for CI signing)

Set these in **Settings → Secrets → Actions** on the repository:

```
APPLE_CERTIFICATE
APPLE_CERTIFICATE_PASSWORD
APPLE_SIGNING_IDENTITY
APPLE_ID
APPLE_PASSWORD
APPLE_TEAM_ID
```

Builds succeed without these secrets — the `.app` will not be code-signed or notarised.

---

## Privacy

All camera processing is local. The tracker derives five dimensionless geometric ratios per frame and discards the raw frame immediately. No video, no biometric identifiers, and no personal data are stored or transmitted. See [docs/privacy.md](docs/privacy.md) for the full data flow and the list of forbidden inference categories.

## Security

Every commit is scanned for secrets by [gitleaks](https://github.com/gitleaks/gitleaks) via a pre-commit hook and in CI. See [docs/security.md](docs/security.md) for setup instructions and incident response guidance.

## License

[MIT](LICENSE) © 2026 Raphael
