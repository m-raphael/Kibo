# DESIGN.md — CyberPet Visual System

## Design language

Apple-inspired: clean, restrained, premium. Soft depth. Subtle translucency. Strong typographic hierarchy. Minimal chrome. Calm motion. Generous spacing.

---

## Layout

### Window
- **Size**: 320 × 320 pt (fixed, non-resizable)
- **Shape**: 20 pt corner radius
- **Background**: `rgba(22, 22, 24, 0.93)` — nearly-opaque dark neutral with slight translucency
- **Border**: `1px solid rgba(255, 255, 255, 0.07)` — hairline separator from desktop
- **Decoration**: none (custom chrome, window server shadow enabled)
- **Always on top**: yes

### Mascot card (main view)
- Full-bleed within window
- Vertically and horizontally centered content
- Mascot face: 68 px font size, centered, 10 px bottom margin
- State badge: 10 px / 600 weight / 0.08em letter spacing / uppercase

### Settings panel
- Overlays the mascot card, same inset
- Background: `rgba(36, 36, 40, 0.97)` — slightly lighter surface
- Header: 18 px padding, 1 px separator
- Body: 16–18 px padding, 14 px gap between sections
- Slides in from below: `translateY(12px)` → `translateY(0)` on open

### Control placement
- Settings button: top-right, 13 px inset, 28 × 28 pt
- Tracker dot: top-left, 14 px inset, 6 × 6 pt

---

## Color

### Base palette
| Token | Value | Role |
|---|---|---|
| `--bg` | `rgba(22, 22, 24, 0.93)` | Main window background |
| `--surface` | `rgba(36, 36, 40, 0.97)` | Overlay / panel surface |
| `--border` | `rgba(255, 255, 255, 0.07)` | All separators and hairlines |
| `--accent` | `#0A84FF` | Primary interactive blue |
| `--accent-hover` | `#2D9CFF` | Hover state of accent |
| `--text-primary` | `rgba(255, 255, 255, 0.88)` | Headings, labels |
| `--text-secondary` | `rgba(255, 255, 255, 0.42)` | Secondary labels, values |
| `--text-tertiary` | `rgba(255, 255, 255, 0.22)` | Hints, decorative text |
| `--success` | `#30D158` | Authorized / running |
| `--warning` | `#FF9F0A` | Restricted / tired state |
| `--danger` | `#FF453A` | Denied / error |
| `--radius` | `20px` | Window and panel corner radius |

### State-specific ambient glow
Each mascot state subtly tints the mascot card background via a `::after` overlay:

| State | Glow |
|---|---|
| `happy` | `rgba(48, 209, 88, 0.12)` — green |
| `tired` | `rgba(255, 159, 10, 0.10)` — amber |
| `speaking` | `rgba(10, 132, 255, 0.12)` — blue |
| `listening` | `rgba(10, 132, 255, 0.08)` — blue (dimmer) |
| `attentive` | `rgba(255, 255, 255, 0.06)` — cool white |
| `idle` | transparent |

State badge text also inherits semantic color: green for happy, amber for tired, accent for speaking/listening.

---

## Typography

- **Font stack**: `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- **Rendering**: `-webkit-font-smoothing: antialiased`
- **Mascot face**: 68 px emoji, not a text element — treated as an icon
- **State badge**: 10 px, 600 weight, 0.08em letter spacing, uppercase
- **Panel titles**: 14 px, 600 weight
- **Setting labels**: 13 px, 500 weight
- **Setting values**: 12 px, 500 weight
- **Privacy note**: 11 px, 1.55 line height
- **Debug rows**: 11 px, tabular-nums

---

## Mascot presentation

### States and emoji

| State | Emoji | Condition |
|---|---|---|
| `idle` | `◕‿◕` | No face detected |
| `attentive` | `◉‿◉` | Head moved > 12° (yaw + pitch sum) |
| `listening` | `◕_◕` | Mouth open 0.18–0.45 |
| `speaking` | `◕◡◕` | Mouth open > 0.45 |
| `happy` | `◕ᴗ◕` | Smile > 0.55 |
| `tired` | `◔_◔` | Blink > 0.75 |

Priority order: tired > happy > speaking > listening > attentive > idle.

### State transitions
- **Hysteresis**: a candidate state must be stable for 400 ms before committing
- **Enter animation**: `mascot-enter` keyframe — scale from 0.88 to 1.0, opacity from 0.4 to 1.0
- **Easing**: `cubic-bezier(0.34, 1.56, 0.64, 1)` — slight spring overshoot
- **Duration**: 260 ms
- **Ambient glow**: transitions at 400 ms ease on `::after` overlay

### Mascot viewport
- The mascot face is the dominant element — no competing visual noise
- The state badge is tertiary: small, uppercase, low-contrast
- The tracker dot is present but understated: 6 pt, top-left corner

---

## Motion

| Interaction | Duration | Easing |
|---|---|---|
| Settings panel open | 220 ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Settings panel close | 180 ms | `ease` |
| Mascot state enter | 260 ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| Ambient glow change | 400 ms | `ease` |
| State badge color | 300 ms | `ease` |
| Tracker dot status | 400 ms | `ease` |
| Button hover | 120 ms | — |

### Principles
- Transitions must feel responsive but not twitchy
- Spring overshoot is acceptable on enter; never on exit
- State badge and glow changes are slower than face changes — layered pacing
- No looping animations in the default idle state (no breathing cycle at MVP)

---

## Controls

### Primary button
- Full width, 9 px vertical padding
- `#0A84FF` background, white text
- 13 px / 600 weight / −0.01em letter spacing
- 10 pt corner radius
- Hover: `#2D9CFF`; Active: 0.78 opacity

### Ghost button (debug toggle)
- No background, no border
- 12 px, 500 weight, `--text-secondary`
- Hover: `--text-primary`
- Icon chevron rotates 180° when expanded, 180 ms ease

### Icon buttons (settings, close)
- 28–26 × 28–26 pt, 7–8 pt corner radius
- `rgba(255, 255, 255, 0.05)` background, `--border` stroke
- Hover: `rgba(255, 255, 255, 0.09)` background, `--text-primary` icon
- Focus: 2 px `--accent` outline, 2 px offset

---

## Do and don't

| Do | Don't |
|---|---|
| Use neutral dark surfaces | Use gradients or loud backgrounds |
| Keep the mascot as the focal point | Add UI chrome around the mascot |
| Use single accent color for interactive elements | Use multiple accent colors |
| Express state with subtle emoji change | Use cartoon animations or bounces |
| Support dark mode first | Design for light mode first |
| Use system font stack | Load external fonts |
