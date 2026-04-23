import type { MascotState } from '@cyberpet/mascot-core'
import { clamp } from '@cyberpet/shared'

// ---------------------------------------------------------------------------
// SVG mascot renderer
//
// Builds a robot face SVG with named parts driven by data-state on the root.
// State transitions are CSS-only. Pupil position is updated per tracker frame
// via setPupilOffset() for continuous, sub-state responsiveness.
// ---------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg'

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v))
  return e
}

// Base pupil centers in SVG coordinate space (cy mutated per state for tired droop)
const LEFT_PUPIL_BASE  = { cx: 37, cy: 42 }
const RIGHT_PUPIL_BASE = { cx: 63, cy: 42 }
const PUPIL_MAX_OFFSET = 3   // px within the 8px eye socket radius

// Per-state pupil geometry — driven by setAttribute, not CSS (cx/cy/ry are not CSS properties)
const PUPIL_SHAPE: Record<MascotState, { ry: number; baseCy: number }> = {
  idle:      { ry: 5, baseCy: 42 },
  attentive: { ry: 6, baseCy: 42 },
  listening: { ry: 5, baseCy: 42 },
  speaking:  { ry: 5, baseCy: 42 },
  happy:     { ry: 3, baseCy: 42 },
  tired:     { ry: 3, baseCy: 44 },
}

// ---------------------------------------------------------------------------
// Build SVG
// ---------------------------------------------------------------------------

export function buildMascotSvg(): SVGSVGElement {
  const svg = el('svg', {
    viewBox: '0 0 100 100',
    width: '120',
    height: '120',
    'aria-hidden': 'true',
    class: 'mascot-svg',
  })

  // Head — rounded rect
  svg.appendChild(el('rect', {
    x: 18, y: 14, width: 64, height: 72,
    rx: 18, ry: 18,
    class: 'mascot-head',
  }))

  // Antenna
  svg.appendChild(el('line', { x1: 50, y1: 14, x2: 50, y2: 6, class: 'mascot-antenna' }))
  svg.appendChild(el('circle', { cx: 50, cy: 4, r: 3, class: 'mascot-antenna-ball' }))

  // Left eye group
  const leftEye = el('g', { class: 'mascot-eye mascot-eye-left' })
  leftEye.appendChild(el('ellipse', { cx: 37, cy: 40, rx: 8, ry: 9, class: 'eye-bg' }))
  leftEye.appendChild(el('ellipse', {
    cx: LEFT_PUPIL_BASE.cx, cy: LEFT_PUPIL_BASE.cy, rx: 4, ry: 5,
    class: 'eye-pupil',
  }))
  leftEye.appendChild(el('line', { x1: 29, y1: 34, x2: 45, y2: 34, class: 'eye-lid' }))
  svg.appendChild(leftEye)

  // Right eye group
  const rightEye = el('g', { class: 'mascot-eye mascot-eye-right' })
  rightEye.appendChild(el('ellipse', { cx: 63, cy: 40, rx: 8, ry: 9, class: 'eye-bg' }))
  rightEye.appendChild(el('ellipse', {
    cx: RIGHT_PUPIL_BASE.cx, cy: RIGHT_PUPIL_BASE.cy, rx: 4, ry: 5,
    class: 'eye-pupil',
  }))
  rightEye.appendChild(el('line', { x1: 55, y1: 34, x2: 71, y2: 34, class: 'eye-lid' }))
  svg.appendChild(rightEye)

  // Mouth group
  const mouth = el('g', { class: 'mascot-mouth', transform: 'translate(50 65)' })
  mouth.appendChild(el('line',    { x1: -10, y1: 0, x2: 10, y2: 0,       class: 'mouth-neutral' }))
  mouth.appendChild(el('path',    { d: 'M -11 -2 Q 0 8 11 -2',            class: 'mouth-happy' }))
  mouth.appendChild(el('ellipse', { cx: 0, cy: 2, rx: 7, ry: 5,           class: 'mouth-open' }))
  mouth.appendChild(el('ellipse', { cx: 0, cy: 2, rx: 8, ry: 8,           class: 'mouth-wide' }))
  mouth.appendChild(el('path',    { d: 'M -10 2 Q 0 -4 10 2',             class: 'mouth-tired' }))
  svg.appendChild(mouth)

  // Blush
  svg.appendChild(el('circle', { cx: 26, cy: 55, r: 5, class: 'mascot-blush mascot-blush-left' }))
  svg.appendChild(el('circle', { cx: 74, cy: 55, r: 5, class: 'mascot-blush mascot-blush-right' }))

  return svg
}

// ---------------------------------------------------------------------------
// State update — CSS handles colours/visibility; JS drives geometry attributes
// ---------------------------------------------------------------------------

export function updateMascotState(svg: SVGSVGElement, state: MascotState): void {
  svg.dataset.state = state

  const { ry, baseCy } = PUPIL_SHAPE[state]
  LEFT_PUPIL_BASE.cy  = baseCy
  RIGHT_PUPIL_BASE.cy = baseCy

  svg.querySelectorAll<SVGEllipseElement>('.eye-pupil').forEach(p => {
    p.setAttribute('ry', String(ry))
    // Reset cy to state base; setPupilOffset will add tracking delta on top
    p.setAttribute('cy', String(baseCy))
  })
}

// ---------------------------------------------------------------------------
// Pupil tracking — called every tracker frame, bypasses CSS transitions
// for sub-frame-rate responsiveness.
//
// dx: horizontal offset in SVG units, positive = right  (-PUPIL_MAX_OFFSET..+PUPIL_MAX_OFFSET)
// dy: vertical offset in SVG units, positive = down     (-PUPIL_MAX_OFFSET..+PUPIL_MAX_OFFSET)
// ---------------------------------------------------------------------------

export function setPupilOffset(svg: SVGSVGElement, dx: number, dy: number): void {
  const cdx = clamp(dx, -PUPIL_MAX_OFFSET, PUPIL_MAX_OFFSET)
  const cdy = clamp(dy, -PUPIL_MAX_OFFSET, PUPIL_MAX_OFFSET)

  const pupils = svg.querySelectorAll<SVGEllipseElement>('.eye-pupil')
  if (pupils.length < 2) return

  const bases = [LEFT_PUPIL_BASE, RIGHT_PUPIL_BASE]
  pupils.forEach((p, i) => {
    p.setAttribute('cx', String(bases[i].cx + cdx))
    p.setAttribute('cy', String(bases[i].cy + cdy))
  })
}
