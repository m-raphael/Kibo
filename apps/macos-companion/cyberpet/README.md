# CyberPet

> A local-first macOS companion that watches your face and reacts — no cloud, no storage, no tracking.

CyberPet sits in the corner of your screen as a reactive 3D animal mascot. It uses your webcam to read geometric signals per frame (head pose, blink, smile, mouth opening) and maps them to six expressive states — the mascot perks up when you turn your head, squints when you smile, and droops when you blink slowly. Everything runs on-device. No video, no biometrics, and no personal data ever leaves your machine.

[![Security](https://github.com/m-raphael/cyberpet/actions/workflows/security.yml/badge.svg)](https://github.com/m-raphael/cyberpet/actions/workflows/security.yml)
[![Staging Build](https://github.com/m-raphael/cyberpet/actions/workflows/staging.yml/badge.svg)](https://github.com/m-raphael/cyberpet/actions/workflows/staging.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Table of contents

- [Features](#features)
- [Real-life applications](#real-life-applications)
- [Quick start](#quick-start)
- [Usage](#usage)
- [Configuration](#configuration)
- [Integration / Deployment](#integration--deployment)
- [Architecture](#architecture)
- [Mascot states](#mascot-states)
- [Project structure](#project-structure)
- [Contributing](#contributing)
- [Privacy](#privacy)
- [Security](#security)
- [License](#license)
- [Maintainers](#maintainers)

## Features

- **Real-time face tracking** — MediaPipe FaceMesh extracts head pose (yaw/pitch/roll), blink, smile, and mouth openness at ~30 fps. No raw frames are stored or transmitted.
- **Six reactive mascot states** — `idle`, `attentive`, `listening`, `speaking`, `happy`, and `tired`, each with distinct animation and expression. 400 ms hysteresis prevents flicker.
- **Multiple mascot species** — choose from several 3D animal mascots with swappable accessories and color palettes. Rendering via Three.js (WebGL), with Orb and SVG fallbacks.
- **Person-aware switching** — detects when a different person sits down and silently restores their chosen mascot. Uses coarse visual categories only — no biometric identification.
- **LLM-powered mascot assignment** — optionally use an LLM (Anthropic, Gemini, Groq, OpenRouter, Ollama, or any OpenAI-compatible endpoint) to assign a mascot based on facial traits. Works fully offline with `LLM_PROVIDER=none`.
- **macOS-native shell** — transparent, always-on-top 320x320 window with system tray icon, camera permission flow, and Apple-inspired design language.
- **Secret scanning** — gitleaks pre-commit hook and CI workflow block secrets from ever reaching the repository.

## Real-life applications

- **Focus companion** — keep the mascot in the corner of your screen while you work. It reacts to your head turns and expressions, giving you a subtle awareness of your own posture and affect without breaking flow.
- **Video call practice** — use the mascot's state feedback to see when you're smiling, speaking, or looking engaged. Helpful for rehearsing presentations or becoming more aware of your on-camera presence.
- **Accessibility cue** — the mascot provides a visual, non-intrusive readout of mouth movement and head orientation, useful as a lightweight speech or attention indicator without any diagnostic claims.
- **Desktop personalisation** — a whimsical alternative to a static desktop widget. The mascot learns your face and swaps to your preferred animal automatically when you sit down.

## Quick start

### Requirements

| Tool | Version | Install |
|---|---|---|
| macOS | 13 Ventura+ | — |
| Node.js | **22+** | `nvm install 22` |
| pnpm | **9+** | `npm i -g pnpm` |
| Rust | stable **1.77+** | [rustup.rs](https://rustup.rs) |
| Python | **3.10+** | [python.org](https://www.python.org/downloads/) |
| Docker | 24+ | [docker.com](https://www.docker.com) — optional |

> The system Python on macOS Ventura is 3.9. Use [pyenv](https://github.com/pyenv/pyenv) or `brew install python@3.11` to get 3.10+.

### Install

```bash
# 1. Clone
git clone https://github.com/m-raphael/cyberpet.git
cd cyberpet

# 2. Pin Node version
nvm install          # reads .nvmrc → Node 22
nvm use

# 3. Install JS dependencies
pnpm install

# 4. Install Python face-tracker dependencies
pip3 install -r services/face-tracker/requirements.txt

# 5. Configure environment
cp .env.example .env

# 6. Activate the secret-scan pre-commit hook (one-time per clone)
bash ../../scripts/setup-hooks.sh
```

### Run

```bash
pnpm tauri:dev     # Full Tauri app (Vite + Rust + Python tracker)
```

The mascot window appears on screen, camera activates, and everything hot-reloads on code changes.

### Docker (frontend only — cross-platform)

```bash
pnpm docker:dev    # Vite dev server on port 1420, no native deps needed
```

Open `http://localhost:1420` in a browser. The mascot renders but won't react to your face (no camera, no tracker in Docker).

## Usage

```bash
# ── Local Development ─────────────────────────────────────
pnpm tauri:dev      # Full Tauri app (Vite + Rust + Python tracker)
pnpm dev            # Vite frontend only (port 1420, no Tauri shell)

# ── Docker Development ────────────────────────────────────
pnpm docker:dev      # Vite dev server in Docker (port 1420)
pnpm docker:dev:bg   # Same, detached (background)
pnpm docker:down     # Stop and remove container

# ── Type checking ────────────────────────────────────────
pnpm typecheck      # tsc --noEmit across src/ and all packages/

# ── Production build ─────────────────────────────────────
pnpm build          # Vite production bundle → dist/
pnpm tauri:build    # Full Tauri .app bundle (requires Rust + macOS)
                    # Output: src-tauri/target/release/bundle/macos/CyberPet.app

# ── Staging build ────────────────────────────────────────
pnpm build:staging  # Vite staging bundle
pnpm tauri:staging  # Tauri build in staging mode

# ── Asset management ─────────────────────────────────────
pnpm assets:import  # Import mascot assets from source
pnpm assets:gallery # Generate asset gallery preview

# ── Security ─────────────────────────────────────────────
gitleaks detect --source . --log-opts="HEAD"  # Full history scan
```

## Configuration

Copy `.env.example` to `.env` and fill in values as needed.

### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_DEV_PORT` | `1420` | Vite dev server port |
| `VITE_DEBUG_TRACKER` | `false` | Log verbose tracker output to the browser console |

### LLM provider (mascot assignment)

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `none` | Provider: `anthropic`, `gemini`, `groq`, `openrouter`, `openai-compatible`, `huggingface`, `nvidia-nim`, `together`, or `none` |
| `LLM_MODEL` | — | Model name for the chosen provider |
| `LLM_FALLBACK_PROVIDER` | `none` | Fallback provider if primary fails |
| `LLM_FALLBACK_MODEL` | — | Fallback model name |

Set `LLM_PROVIDER=none` to use rule-based assignment with no network calls. Provider-specific API keys (below) are only needed when that provider is selected.

### Provider API keys

| Variable | Required for |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic (`claude api-key` for Pro subscribers) |
| `GEMINI_API_KEY` | Gemini (free tier at aistudio.google.com) |
| `GROQ_API_KEY` | Groq (free tier at console.groq.com) |
| `OPENROUTER_API_KEY` | OpenRouter (free-tier models at openrouter.ai) |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` | OpenAI-compatible endpoints (Ollama, vLLM, LiteLLM) |
| `HUGGINGFACE_API_KEY` | HuggingFace Inference |
| `TOGETHER_API_KEY` | Together AI |
| `NVIDIA_API_KEY` / `NVIDIA_NIM_API_KEY` | NVIDIA NIM |

### Face tracker

| Variable | Default | Description |
|---|---|---|
| `CYBERPET_CAMERA_INDEX` | `0` | Camera device index (`0` = built-in webcam) |
| `CYBERPET_DETECTION_CONFIDENCE` | `0.5` | MediaPipe face detection threshold |
| `CYBERPET_TRACKING_CONFIDENCE` | `0.5` | MediaPipe face tracking threshold |

### macOS code signing (CI only)

| Variable | Description |
|---|---|
| `APPLE_CERTIFICATE` | Base64-encoded `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: ...` |
| `APPLE_ID` | Apple ID email for notarisation |
| `APPLE_PASSWORD` | App-specific password for notarisation |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

All signing variables are only required for notarised distribution builds. Local and staging development runs fine without them.

## Integration / Deployment

### Docker

The included `Dockerfile` and `docker-compose.yml` run the Vite frontend dev server in a container. Source files in `src/` and `packages/` are volume-mounted, so edits trigger hot reload.

**What Docker covers:** Vite dev server with HMR, all TypeScript packages.  
**What Docker does NOT cover:** Tauri native shell, Python face tracker, `.app` bundle builds.

```bash
pnpm docker:setup   # Build the image (first time)
pnpm docker:dev     # Launch dev server (foreground)
pnpm docker:dev:bg  # Launch dev server (detached)
pnpm docker:down    # Stop and remove container
```

### GitHub Actions CI

Every push to `main` and every PR triggers **`security.yml`** — gitleaks secret scan, TypeScript typecheck, and Vite production build.

Pushes to `main` also trigger **`staging.yml`** — full Tauri macOS `.app` bundle, uploaded as a 14-day artifact. Download from **Actions → Staging Build → CyberPet-macos-staging**.

### Manual staging build

```bash
pnpm install
pip3 install -r services/face-tracker/requirements.txt
pnpm tauri:build
# Output: src-tauri/target/release/bundle/macos/CyberPet.app
```

For code signing, set the `APPLE_*` environment variables before building. Set these in **Settings → Secrets → Actions** for CI. Builds succeed without them — the `.app` just won't be signed or notarised.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  macOS Window  (Tauri 2 · transparent · 320×320 · AOT)  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  WebView  (Vite 6 · TypeScript 5)                │   │
│  │                                                  │   │
│  │  @cyberpet/mascot-renderer   ◄── 3D (Three.js)   │   │
│  │  @cyberpet/mascot-profile   ◄── LLM assignment   │   │
│  │  @cyberpet/mascot-core       ◄── state machine    │   │
│  │  @cyberpet/shared            ◄── math utilities   │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │  Tauri IPC (invoke / emit)             │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  Rust (lib.rs)                                   │   │
│  │  • Permission state  →  permissions.json         │   │
│  │  • Mascot profile    →  mascot_profile.json      │   │
│  │  • Tracker bridge    →  spawns Python subprocess │   │
│  │  • Tray icon         →  Show/Hide, Quit          │   │
│  └──────────────┬───────────────────────────────────┘   │
│                 │  stdout  (JSON lines, ~30 fps)         │
│  ┌──────────────▼───────────────────────────────────┐   │
│  │  Python 3.10+  ·  MediaPipe FaceMesh             │   │
│  │  • solvePnP head pose (yaw / pitch / roll)       │   │
│  │  • EAR blink score                               │   │
│  │  • Lip geometry → smile + mouth_open             │   │
│  │  • Coarse appearance (face/eye shape)            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | TypeScript 5, Vite 6 |
| Face tracking | Python 3.10+, MediaPipe FaceMesh, OpenCV, NumPy |
| Rendering | Three.js 3D (WebGL), Orb canvas, inline SVG |
| LLM integration | Provider-agnostic adapter (Anthropic, Gemini, Groq, OpenRouter, Ollama, local) |
| Persistence | JSON files in `$APP_DATA/cyberpet/` + localStorage |
| CI/CD | GitHub Actions |
| Secret scanning | gitleaks v8 (pre-commit + CI) |

## Mascot states

| State | Expression | Trigger |
|---|---|---|
| `idle` | Gentle breathing, auto-blinks every 4s | No face detected |
| `attentive` | Ears perk up, head lifts, eyes widen | Head turned/tilted > 12° |
| `listening` | Head tilts, one ear rotates forward | Mouth open 0.18–0.45 |
| `speaking` | Mouth opens, subtle body bounce | Mouth open > 0.45 |
| `happy` | Eyes squint, body bounces, tail wags | Smile score > 0.55 |
| `tired` | Eyes droop, head lowers, body slumps | Blink score > 0.75 |

State priority order: `tired` > `happy` > `speaking` > `listening` > `attentive` > `idle`. Transitions are debounced with 400 ms hysteresis. Pupils track head pose in real time with an exponential moving average smoother (α = 0.25).

## Project structure

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
│   ├── cyberpet-main.ts          # App bootstrap, Tauri IPC, tracker, person detection
│   ├── styles.css                # Design tokens, layout, mascot card, settings
│   ├── styles/
│   │   ├── trait-review.css      # Face scan trait review UI
│   │   └── assignment-result.css # Mascot assignment result UI
│   └── components/
│       ├── trait-review.ts       # Trait review Web Component
│       └── assignment-result.ts  # Assignment result Web Component
│
├── packages/                     # Internal TypeScript packages
│   ├── mascot-core/              # MascotState types, tracker→state mapping, hysteresis, scan accumulator
│   ├── mascot-profile/           # LLM adapter, trait inference, mascot assignment
│   ├── mascot-renderer/          # Three.js 3D, Orb canvas, and SVG renderers; mascot/accessory/palette lists
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
│       └── lib.rs                # IPC: permissions, mascot profile, tracker bridge, tray, fullscreen
│
├── scripts/
│   ├── import-mascot-asset.mjs   # Asset import pipeline
│   └── asset-gallery.mjs         # Asset gallery generator
│
├── .github/
│   └── workflows/
│       ├── security.yml          # Gitleaks scan + typecheck + build (all PRs + main)
│       └── staging.yml           # Full Tauri .app build + artifact upload (main + manual)
│
└── docs/
    ├── spec.md                   # Product and technical scope
    ├── privacy.md                # Data flow and forbidden inference categories
    ├── security.md               # Secret scanning setup and incident response
    ├── primer.md                 # Quick bootstrap guide
    ├── hindsight.md              # Lessons learned
    ├── references.md             # External references
    └── design/DESIGN.md          # Visual system: color tokens, layout, motion, mascot rules
```

## Contributing

1. Read [`docs/primer.md`](docs/primer.md) and [`docs/spec.md`](docs/spec.md) first.
2. Pick a single task from [`docs/backlog/claude_code_build_guide_detailed.csv`](docs/backlog/claude_code_build_guide_detailed.csv).
3. Plan before coding. Keep changes PR-sized.
4. Run `pnpm typecheck` and verify the build before pushing.
5. All commits are scanned by gitleaks — never commit `.env`, keys, or secrets.
6. Open a PR against `main`. CI must pass (secret scan + typecheck + build).

See [`CLAUDE.md`](CLAUDE.md) for the full working rules and security gate.

## Privacy

All camera processing is local. The tracker derives dimensionless geometric ratios per frame and discards the raw frame immediately. No video, no biometric identifiers, and no personal data are stored or transmitted. See [`docs/privacy.md`](docs/privacy.md) for the full data flow and forbidden inference categories.

## Security

Every commit is scanned for secrets by [gitleaks](https://github.com/gitleaks/gitleaks) via a pre-commit hook and in CI. See [`docs/security.md`](docs/security.md) for setup instructions and incident response guidance.

## License

[MIT](LICENSE) © 2026 Raphael

## Maintainers

- **Raphael** — [@m-raphael](https://github.com/m-raphael) — [raphael@paaolms.com](mailto:raphael@paaolms.com)
