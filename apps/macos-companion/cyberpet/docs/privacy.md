# Privacy and Data Scope

## Summary

CyberPet processes camera input entirely on the user's device. No video frames, no biometric data, and no derived signals are sent to any network endpoint. The camera feed is read, processed, and discarded in memory. Nothing is stored or transmitted.

## What the tracker reads

The face tracker produces five numerical signals per frame:

| Signal | Description | Range |
|---|---|---|
| `face_detected` | Whether a face is visible | boolean |
| `head_pose.yaw` | Left/right head rotation | degrees |
| `head_pose.pitch` | Up/down head tilt | degrees |
| `blink` | Eye closure level (EAR-derived) | 0–1 |
| `smile` | Lip corner spread (geometry only) | 0–1 |
| `mouth_open` | Vertical lip separation ratio | 0–1 |

These are low-dimensional geometric measurements derived from facial landmark positions. They are not biometric identifiers, not sufficient to reconstruct a face, and not stored beyond the current frame.

## What the mascot does with these signals

The mascot maps signals to one of six visual states:

- **idle** — no face detected
- **attentive** — head is turned or tilted
- **listening** — slight mouth opening
- **speaking** — larger mouth opening
- **happy** — lip corners spread
- **tired** — eyes closing

The state is used only to select which emoji variant to display. State transitions are debounced at 400 ms to avoid visual flicker. The most recent state is persisted locally (in `$APP_DATA/mascot_profile.json`) so the mascot can restore to its last known state on restart.

## What is never inferred or stored

The following categories are out of scope and will never be added without an explicit product review:

- Race, ethnicity, or skin tone
- Gender or age
- Identity or recognition (no face matching)
- Emotion classification beyond the six geometric states listed above
- Health indicators (e.g., fatigue scores, stress)
- Eye-tracking or gaze direction
- Raw video frames or image data
- Any data uploaded to a server

## Data flow

```
Camera hardware
  → Python MediaPipe FaceMesh (in-process, local)
  → 5 numeric values per frame (JSON on stdout)
  → Rust process reads stdout line by line
  → Tauri event emitted to WebView (tracker:frame)
  → TypeScript maps to mascot state
  → Emoji and badge updated in UI
  → Previous state written to mascot_profile.json
```

No step in this chain leaves the local machine.

## Stored files

| File | Location | Contents | When written |
|---|---|---|---|
| `permissions.json` | `$APP_DATA/cyberpet/` | Camera permission state | On grant or denial |
| `mascot_profile.json` | `$APP_DATA/cyberpet/` | Mascot name, last state | On each state change |

Both files contain only application preferences. Neither contains biometric data or personal information.

## Camera permission

CyberPet requests camera access through the standard macOS permission dialog. The user can revoke access at any time via **System Settings → Privacy & Security → Camera**. If access is revoked, the tracker stops and the mascot enters idle state.

## Compliance notes

CyberPet does not process sensitive biometric data as defined by GDPR Article 9 or CCPA §1798.140(e) because it does not store or transmit data and the derived signals are insufficient to identify a natural person.
