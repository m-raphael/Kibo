# CyberPet

A local-first macOS companion for Kibo. Uses camera-driven facial geometry to animate a robotic mascot with calm, reactive expressions. No video is stored or transmitted.

## What it does

- Reads your webcam locally via MediaPipe FaceMesh
- Derives 5 geometric signals per frame: head pose (yaw/pitch/roll), blink, smile, mouth open
- Maps those to 6 mascot states: **idle · attentive · listening · speaking · happy · tired**
- Renders an SVG robot face whose eyes track your head movement in real time
- Idles with a gentle breathing loop when no face is detected

## Requirements

| Tool | Version |
|---|---|
| macOS | 13 Ventura or later |
| Node | 22 (via nvm) |
| Rust | stable (1.77+) |
| Python | 3.10+ |
| Tauri CLI | v2 (`cargo install tauri-cli`) |

## Setup

```bash
# 1. Install Node 22
nvm install 22 && nvm use 22

# 2. Install JS dependencies
npm install

# 3. Install Python tracker dependencies
pip3 install -r services/face-tracker/requirements.txt

# 4. Activate the secret-scan pre-commit hook (one-time per clone)
bash ../../scripts/setup-hooks.sh
```

## Development

```bash
npm run tauri dev
```

The app opens a 320×320 floating window. On first launch it asks for camera permission. Grant access to start the tracker.

## Build

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/macos/CyberPet.app`

## Project structure

```
cyberpet/
├── src/                      # Frontend (TypeScript + Vite)
│   ├── index.html
│   ├── cyberpet-main.ts      # App entry point
│   └── styles.css
├── packages/
│   ├── mascot-core/          # State types, tracker mapping, hysteresis
│   ├── mascot-renderer/      # SVG mascot DOM builder + pupil tracking
│   └── shared/               # clamp, lerp, expLerp, mapRange utilities
├── services/
│   └── face-tracker/
│       ├── main.py           # MediaPipe FaceMesh tracker (stdout JSON)
│       └── requirements.txt
├── src-tauri/
│   └── src/lib.rs            # Rust commands: permissions, tracker bridge, mascot state
└── docs/
    ├── spec.md               # Product and technical scope
    ├── privacy.md            # Data handling and forbidden inference categories
    ├── security.md           # Secret scan and pre-commit hook setup
    └── design/DESIGN.md      # Visual system: color, layout, motion, mascot
```

## Privacy

All processing is local. See [docs/privacy.md](docs/privacy.md).

## Security

Commits are scanned for secrets by gitleaks. See [docs/security.md](docs/security.md).
