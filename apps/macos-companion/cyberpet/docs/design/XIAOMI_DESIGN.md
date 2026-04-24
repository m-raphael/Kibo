# XIAOMI_DESIGN.md — CyberPet · Xiaomi HyperOS Companion Style

> Reference design system for a Xiaomi-flavoured skin of CyberPet.
> Draws from HyperOS / MIUI 15 visual language and the Xiao Ai (小爱同学)
> companion application aesthetic.
>
> Compare with `DESIGN.md` (Apple skin) — all decisions here deliberately
> diverge where the two design languages conflict.

---

## Design Philosophy

Where the Apple skin is **quiet and restrained**, the Xiaomi companion style is
**expressive and alive**. The mascot is the primary UI — it carries all emotional
state through shape, color temperature, and motion rather than text labels or
chrome. Surfaces are dark and glassy; the character glows against them. Animation
is never subtle when it can be *felt*.

Core principles:

- **Orb-first** — the mascot is a morphing luminous blob, not a geometric face
- **Color tells state** — warm orange/amber = engaged; cool blue/cyan = processing; dim = idle
- **Motion is continuous** — the character is never fully still
- **Glow as depth** — elevation is expressed through colored light, not gray shadows
- **Dark-first, high-contrast** — deep near-black surfaces make the orb pop

---

## Layout

### Window
- **Size**: 320 × 320 pt (matches current shell — unchanged)
- **Shape**: 28 pt corner radius (squircle, slightly larger than Apple skin's 20 pt)
- **Background**: `#0D0D12` — deep navy-black, no transparency
- **Border**: `1px solid rgba(255, 255, 255, 0.06)`
- **Inner texture**: dot grid at 32 pt spacing, `rgba(255,255,255,0.03)` — adds
  subtle depth behind the orb without competing
- **Always on top**: yes

### Mascot stage
- Full-bleed within window
- Orb centered, 128 × 128 pt bounding box
- Orb sits 16 pt above vertical center to leave room for state label below
- State label: 20 pt below orb center

### Settings panel
- Slides up from bottom edge (not from top): `translateY(100%)` → `translateY(0)`
- Background: `rgba(18, 18, 26, 0.97)` with `backdrop-filter: blur(24px)`
- Top edge: 24 pt squircle radius only on top corners
- Header drag handle: 32 × 4 pt pill, `rgba(255,255,255,0.15)`, centered, 12 pt from top

### Control placement
- Settings button: bottom-right, 16 pt inset (moved from top to avoid competing with orb glow)
- Tracker dot: top-left, 14 pt inset, 8 × 8 pt (slightly larger)

---

## Color

### Brand palette

| Token | Value | Role |
|---|---|---|
| `--mi-orange` | `#FF6900` | Xiaomi primary brand orange |
| `--mi-orange-warm` | `#FF8C00` | Orb center / highlight |
| `--mi-orange-deep` | `#CC3300` | Orb outer edge / shadow gradient stop |
| `--mi-amber` | `#FFAA00` | Listening / attentive bright state |
| `--mi-cyan` | `#00E5FF` | Processing / thinking accent |
| `--mi-green` | `#39FF14` | Active / happy neon accent |
| `--mi-purple` | `#9B51E0` | Tired / low-energy state |

### Surface palette

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0D0D12` | Window background |
| `--surface` | `rgba(255, 255, 255, 0.06)` | Glassmorphism card base |
| `--surface-raised` | `rgba(255, 255, 255, 0.10)` | Hovered / elevated card |
| `--border` | `rgba(255, 255, 255, 0.08)` | Panel borders |
| `--text-primary` | `#FFFFFF` | Labels, headings |
| `--text-secondary` | `rgba(255, 255, 255, 0.60)` | Secondary labels |
| `--text-tertiary` | `rgba(255, 255, 255, 0.28)` | Hints, captions |

### Orb gradient per state

The orb uses a **radial gradient** (`center → edge`) whose stops shift with each state.
Outer glow uses a layered `box-shadow` (or SVG `filter: drop-shadow`).

| State | Center | Edge | Outer glow |
|---|---|---|---|
| `idle` | `#FF6900` | `#AA2200` | `0 0 28px rgba(255,105,0,0.35), 0 0 64px rgba(255,60,0,0.15)` |
| `attentive` | `#FFAA00` | `#FF6900` | `0 0 36px rgba(255,170,0,0.55), 0 0 80px rgba(255,105,0,0.25)` |
| `listening` | `#FFD000` | `#FF8C00` | `0 0 40px rgba(255,200,0,0.60), 0 0 96px rgba(255,140,0,0.28)` |
| `speaking` | `#FF8C00` | `#FF4500` | `0 0 48px rgba(255,140,0,0.70), 0 0 120px rgba(255,70,0,0.30)` |
| `happy` | `#39FF14` | `#00CC88` | `0 0 44px rgba(57,255,20,0.65), 0 0 96px rgba(0,200,100,0.25)` |
| `tired` | `#6A3FA0` | `#2D1A5E` | `0 0 28px rgba(106,63,160,0.45), 0 0 60px rgba(45,26,94,0.20)` |

State badge / label color matches the orb center color for each state.

---

## Typography

### Font stack

```css
font-family: "MiSans", "PingFang SC", "SF Pro Text", "Helvetica Neue",
             system-ui, sans-serif;
```

MiSans is free to embed — download from `https://hyperos.mi.com/font`.
For CI/web fallback use `"Nunito"` (Google Fonts) as the closest open-source match.

### Scale

| Role | Size | Weight | Letter spacing |
|---|---|---|---|
| State label | 13 px | 500 | 0.04em |
| Panel title | 17 px | 600 | −0.01em |
| Setting label | 15 px | 400 | 0 |
| Setting value | 13 px | 400 | 0 |
| Caption / hint | 11 px | 300 | 0.02em |
| Debug rows | 11 px | 400 | 0 (tabular-nums) |

> State label is **not** uppercase — Xiaomi labels use sentence case with medium weight.

---

## Mascot — The Orb

The Xiaomi skin replaces the geometric SVG robot face with a **morphing luminous orb**.
The orb is implemented as a single SVG `<ellipse>` (or CSS `border-radius` blob) with:

1. A radial gradient fill that shifts per state
2. A layered `drop-shadow` filter for glow
3. Shape morphing via CSS `border-radius` keyframes (blob deformation)
4. Pupil/eye elements that appear only in active states

### Orb shape

```css
/* Base squircle-blob */
.orb {
  width: 128px;
  height: 128px;
  border-radius: 50%;
  /* Idle: perfect circle — morphs per state (see below) */
}
```

### Shape per state

```css
/* idle — perfect circle, slow pulse */
[data-state="idle"]      .orb { border-radius: 50%; }

/* attentive — slightly squished vertically (alert) */
[data-state="attentive"] .orb { border-radius: 50% 50% 50% 50% / 44% 44% 56% 56%; }

/* listening — tall oval (receptive) */
[data-state="listening"] .orb { border-radius: 50% 50% 50% 50% / 58% 58% 42% 42%; }

/* speaking — pulsing — keyframe handles shape */
[data-state="speaking"]  .orb { border-radius: 50%; }

/* happy — wide/squashed (expressive) */
[data-state="happy"]     .orb { border-radius: 50% 50% 50% 50% / 38% 38% 62% 62%; }

/* tired — drooped, heavy */
[data-state="tired"]     .orb { border-radius: 50% 50% 46% 54% / 42% 42% 58% 58%; }
```

### Eyes

Eyes appear only when face is detected. Two white ellipses rendered inside the orb SVG:

| State | Shape | Position |
|---|---|---|
| `idle` | Hidden (orb only) | — |
| `attentive` | Wide circles, 14×14 pt | cx±22, cy−8 |
| `listening` | Medium circles, 12×12 pt | cx±20, cy−6 |
| `speaking` | Animated narrow ovals | cx±20, cy−6, ry oscillates 4↔10 |
| `happy` | Arc crescents (squinting) | cx±22, cy−6 |
| `tired` | Half-closed (rectangle clip top 50%) | cx±20, cy−4 |

Eye fill: `rgba(255, 255, 255, 0.92)` with `filter: blur(0.5px)` for softness.

### Particle effects

On state **enter** (any transition): 6–8 small dots (3–5 pt) radiate outward from
the orb center, fade from `rgba(255,170,0,0.8)` → transparent over 400 ms.
Color matches the incoming state's center color.

---

## Motion

### Principles

- The orb is **never fully still** — idle breathing runs at all times
- State transitions are **morphs**, not swaps — shape, color, and glow change simultaneously
- **Layered timing**: shape completes first (200 ms), then glow settles (400 ms)
- Overshoot is welcome — spring physics for enter, ease-out for exit

### Timing table

| Interaction | Duration | Easing |
|---|---|---|
| Idle breathing (scale) | 3 000 ms loop | `ease-in-out` |
| State enter — shape morph | 200 ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| State enter — gradient shift | 350 ms | `ease-out` |
| State enter — glow transition | 400 ms | `ease` |
| State enter — particle burst | 400 ms | `ease-out` (opacity only) |
| Eye appear / disappear | 180 ms | `ease` |
| Speaking orb oscillation | 140 ms loop | `ease-in-out` |
| Settings panel slide up | 300 ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Settings panel dismiss | 220 ms | `cubic-bezier(0.4, 0, 1, 1)` |
| Button press feedback | 80 ms | `ease` |

### Idle breathing (always on)

```css
@keyframes mi-breathe {
  0%, 100% { transform: scale(1.00); filter: drop-shadow(0 0 28px rgba(255,105,0,0.35)); }
  50%       { transform: scale(1.06); filter: drop-shadow(0 0 44px rgba(255,105,0,0.55)); }
}
.orb { animation: mi-breathe 3s ease-in-out infinite; }
```

### Speaking oscillation

```css
@keyframes mi-speaking {
  0%, 100% { transform: scale(1.00) scaleX(1.00); }
  25%       { transform: scale(1.05) scaleX(0.96); }
  75%       { transform: scale(0.97) scaleX(1.04); }
}
[data-state="speaking"] .orb { animation: mi-speaking 140ms ease-in-out infinite; }
```

---

## Controls & Chrome

### Primary button

```css
background: linear-gradient(135deg, #FF8C00 0%, #FF6900 60%, #E55000 100%);
border-radius: 18px;          /* squircle, not pill */
padding: 10px 0;
font-size: 15px;
font-weight: 600;
letter-spacing: -0.01em;
color: #fff;
box-shadow: 0 4px 20px rgba(255,105,0,0.40);
transition: box-shadow 120ms, transform 80ms;
```

Hover: `box-shadow` expands to `0 6px 32px rgba(255,105,0,0.60)`, `scale(1.01)`.
Active: `scale(0.97)`, shadow collapses to `0 2px 8px`.

### Ghost / secondary button

```css
background: rgba(255, 255, 255, 0.07);
border: 1px solid rgba(255, 255, 255, 0.12);
border-radius: 14px;
```

Hover: `background: rgba(255,255,255,0.12)`.

### Icon buttons (settings, close)

```css
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.10);
border-radius: 12px;          /* squircle SM */
transition: background 100ms;
```

Focus ring: `outline: 2px solid #FF6900; outline-offset: 2px`.

### Tracker status dot

- Size: 8 × 8 pt (larger than Apple skin — more visible against dark bg)
- Active: `#39FF14` + `box-shadow: 0 0 0 3px rgba(57,255,20,0.25)`
- Inactive: `rgba(255,255,255,0.20)`
- Error: `#FF3B30` + `box-shadow: 0 0 0 3px rgba(255,59,48,0.25)`

### Dot-grid background texture

```css
.mascot-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  border-radius: inherit;
  pointer-events: none;
}
```

---

## Side-by-side Comparison

| Dimension | Apple skin (`DESIGN.md`) | Xiaomi skin (this doc) |
|---|---|---|
| Background | `rgba(22,22,24,0.93)` translucent | `#0D0D12` opaque + dot grid |
| Mascot | Geometric SVG robot face | Morphing luminous orb |
| Accent color | `#0A84FF` — cool blue | `#FF6900` — Xiaomi orange |
| State expression | Emoji swap + CSS class | Orb gradient + shape morph + glow |
| Glow | Subtle ambient tint overlay | Full colored `drop-shadow` + radial gradient |
| Animation | Restrained spring, minimal | Continuous breathing + morphing + particles |
| Typography | SF Pro, uppercase badge | MiSans, sentence-case label |
| Corner radius | 20 pt consistent | 28 pt window, 24–6 pt scale per component |
| Settings entry | Slides down from top | Slides up from bottom |
| Motion style | Calm, intentional | Expressive, continuous, alive |

---

## Implementation Notes

1. **MiSans** — embed via `@font-face` in `styles.css` using the woff2 builds
   from the HyperOS font download. Add `"Nunito"` as Google Fonts fallback for CI.

2. **Orb rendering** — implement as a CSS `div` (easier gradient transitions than SVG) inside the existing `#mascot-face` slot. The radial gradient and border-radius are CSS-animatable; no JS per-frame work needed for the orb itself.

3. **Particle system** — generate 6–8 `<span>` elements on each state commit in
   `applyMascotState()`, animate with Web Animations API, remove on `animationend`.
   Keep the DOM clean — never more than 8 particles alive at once.

4. **Dot grid** — pure CSS `background-image: radial-gradient(...)` on `::before`,
   zero DOM cost.

5. **Eye elements** — same `querySelector('.eye-pupil')` approach used in
   `mascot-renderer` — just different SVG geometry and show/hide logic.

6. **Theme switching** — a `data-theme="xiaomi"` attribute on `<body>` or
   `#mascot-card` lets both skins coexist in one CSS file via selector scoping.
   The `mascot-renderer` package can expose a `buildMascotOrb()` function
   alongside `buildMascotSvg()`.
