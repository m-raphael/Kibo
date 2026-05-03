import type { MascotState } from '@cyberpet/mascot-core'
import { clamp } from '@cyberpet/shared'

// ---------------------------------------------------------------------------
// SVG mascot renderer (Apple theme)
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

const LEFT_PUPIL_BASE  = { cx: 37, cy: 42 }
const RIGHT_PUPIL_BASE = { cx: 63, cy: 42 }
const PUPIL_MAX_OFFSET = 3

const PUPIL_SHAPE: Record<MascotState, { ry: number; baseCy: number }> = {
  idle:      { ry: 5, baseCy: 42 },
  attentive: { ry: 6, baseCy: 42 },
  listening: { ry: 5, baseCy: 42 },
  speaking:  { ry: 5, baseCy: 42 },
  happy:     { ry: 3, baseCy: 42 },
  tired:     { ry: 3, baseCy: 44 },
}

export function buildMascotSvg(): SVGSVGElement {
  const svg = el('svg', {
    viewBox: '0 0 100 100', width: '120', height: '120',
    'aria-hidden': 'true', class: 'mascot-svg',
  })
  svg.appendChild(el('rect', { x: 18, y: 14, width: 64, height: 72, rx: 18, ry: 18, class: 'mascot-head' }))
  svg.appendChild(el('line', { x1: 50, y1: 14, x2: 50, y2: 6, class: 'mascot-antenna' }))
  svg.appendChild(el('circle', { cx: 50, cy: 4, r: 3, class: 'mascot-antenna-ball' }))

  const leftEye = el('g', { class: 'mascot-eye mascot-eye-left' })
  leftEye.appendChild(el('ellipse', { cx: 37, cy: 40, rx: 8, ry: 9, class: 'eye-bg' }))
  leftEye.appendChild(el('ellipse', { cx: LEFT_PUPIL_BASE.cx, cy: LEFT_PUPIL_BASE.cy, rx: 4, ry: 5, class: 'eye-pupil' }))
  leftEye.appendChild(el('line', { x1: 29, y1: 34, x2: 45, y2: 34, class: 'eye-lid' }))
  svg.appendChild(leftEye)

  const rightEye = el('g', { class: 'mascot-eye mascot-eye-right' })
  rightEye.appendChild(el('ellipse', { cx: 63, cy: 40, rx: 8, ry: 9, class: 'eye-bg' }))
  rightEye.appendChild(el('ellipse', { cx: RIGHT_PUPIL_BASE.cx, cy: RIGHT_PUPIL_BASE.cy, rx: 4, ry: 5, class: 'eye-pupil' }))
  rightEye.appendChild(el('line', { x1: 55, y1: 34, x2: 71, y2: 34, class: 'eye-lid' }))
  svg.appendChild(rightEye)

  const mouth = el('g', { class: 'mascot-mouth', transform: 'translate(50 65)' })
  mouth.appendChild(el('line',    { x1: -10, y1: 0, x2: 10, y2: 0,  class: 'mouth-neutral' }))
  mouth.appendChild(el('path',    { d: 'M -11 -2 Q 0 8 11 -2',       class: 'mouth-happy' }))
  mouth.appendChild(el('ellipse', { cx: 0, cy: 2, rx: 7, ry: 5,      class: 'mouth-open' }))
  mouth.appendChild(el('ellipse', { cx: 0, cy: 2, rx: 8, ry: 8,      class: 'mouth-wide' }))
  mouth.appendChild(el('path',    { d: 'M -10 2 Q 0 -4 10 2',        class: 'mouth-tired' }))
  svg.appendChild(mouth)

  svg.appendChild(el('circle', { cx: 26, cy: 55, r: 5, class: 'mascot-blush mascot-blush-left' }))
  svg.appendChild(el('circle', { cx: 74, cy: 55, r: 5, class: 'mascot-blush mascot-blush-right' }))
  return svg
}

export function updateMascotState(svg: SVGSVGElement, state: MascotState): void {
  svg.dataset.state = state
  const { ry, baseCy } = PUPIL_SHAPE[state]
  LEFT_PUPIL_BASE.cy  = baseCy
  RIGHT_PUPIL_BASE.cy = baseCy
  svg.querySelectorAll<SVGEllipseElement>('.eye-pupil').forEach(p => {
    p.setAttribute('ry', String(ry))
    p.setAttribute('cy', String(baseCy))
  })
}

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

// ---------------------------------------------------------------------------
// Orb mascot renderer (Xiaomi theme)
// ---------------------------------------------------------------------------

// Particle colors per state
const ORB_PARTICLE_COLOR: Record<MascotState, string> = {
  idle:      'rgba(255,140,0,0.85)',
  attentive: 'rgba(255,170,0,0.90)',
  listening: 'rgba(255,208,0,0.90)',
  speaking:  'rgba(255,140,0,0.90)',
  happy:     'rgba(57,255,20,0.90)',
  tired:     'rgba(140,80,200,0.80)',
}

export function buildMascotOrb(): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.className = 'mascot-orb'
  wrapper.dataset.state = 'idle'
  wrapper.setAttribute('aria-hidden', 'true')

  const core = document.createElement('div')
  core.className = 'orb-core'

  const eyes = document.createElement('div')
  eyes.className = 'orb-eyes'

  const eyeL = document.createElement('div')
  eyeL.className = 'orb-eye orb-eye-left'

  const eyeR = document.createElement('div')
  eyeR.className = 'orb-eye orb-eye-right'

  eyes.appendChild(eyeL)
  eyes.appendChild(eyeR)
  core.appendChild(eyes)
  wrapper.appendChild(core)

  return wrapper
}

export function updateOrbState(orb: HTMLElement, state: MascotState): void {
  orb.dataset.state = state
  spawnOrbParticles(orb, state)
}

export function setOrbEyesVisible(orb: HTMLElement, visible: boolean): void {
  orb.querySelector('.orb-eyes')?.classList.toggle('visible', visible)
}

// Eye tracking: sets CSS variables --tx / --ty on each eye element.
// State-based transforms (scaleY for squint/droop) live in CSS and compose via the same transform.
export function setOrbEyeOffset(orb: HTMLElement, dx: number, dy: number): void {
  const cdx = clamp(dx, -8, 8)
  const cdy = clamp(dy, -6, 6)
  orb.querySelectorAll<HTMLElement>('.orb-eye').forEach(eye => {
    eye.style.setProperty('--tx', `${cdx}px`)
    eye.style.setProperty('--ty', `${cdy}px`)
  })
}

function spawnOrbParticles(orb: HTMLElement, state: MascotState): void {
  const color  = ORB_PARTICLE_COLOR[state]
  const count  = 7
  const existing = orb.querySelectorAll('.orb-particle')
  // Clean up any still-running particles from a rapid previous transition
  existing.forEach(p => p.remove())

  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    p.className = 'orb-particle'
    const angle = (360 / count) * i + Math.random() * 10
    const dist  = 52 + Math.random() * 18
    p.style.setProperty('--angle', `${angle}deg`)
    p.style.setProperty('--dist',  `${dist}px`)
    p.style.setProperty('--color', color)
    p.style.setProperty('--delay', `${i * 18}ms`)
    orb.appendChild(p)
    p.addEventListener('animationend', () => p.remove(), { once: true })
  }
}

// ---------------------------------------------------------------------------
// 3D mascot renderer (animal theme)
// ---------------------------------------------------------------------------

export { buildMascot3d } from './3d/index.js'
export type { ThreeMascotHandle } from './3d/index.js'
