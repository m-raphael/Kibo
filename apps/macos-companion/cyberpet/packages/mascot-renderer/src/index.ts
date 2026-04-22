import type { MascotState } from '@cyberpet/mascot-core'

// ---------------------------------------------------------------------------
// SVG mascot renderer
//
// Builds a robot face SVG with named parts that are driven by data-state
// on the root element. All visual transitions happen in CSS; this module
// just creates the DOM structure and exposes an update function.
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
  const head = el('rect', {
    x: 18, y: 14, width: 64, height: 72,
    rx: 18, ry: 18,
    class: 'mascot-head',
  })
  svg.appendChild(head)

  // Antenna base
  const antennaLine = el('line', {
    x1: 50, y1: 14, x2: 50, y2: 6,
    class: 'mascot-antenna',
  })
  const antennaBall = el('circle', {
    cx: 50, cy: 4, r: 3,
    class: 'mascot-antenna-ball',
  })
  svg.appendChild(antennaLine)
  svg.appendChild(antennaBall)

  // Left eye group
  const leftEye = el('g', { class: 'mascot-eye mascot-eye-left' })
  leftEye.appendChild(el('ellipse', { cx: 37, cy: 40, rx: 8, ry: 9, class: 'eye-bg' }))
  leftEye.appendChild(el('ellipse', { cx: 37, cy: 42, rx: 4, ry: 5, class: 'eye-pupil' }))
  leftEye.appendChild(el('line',    { x1: 29, y1: 34, x2: 45, y2: 34, class: 'eye-lid' }))
  svg.appendChild(leftEye)

  // Right eye group
  const rightEye = el('g', { class: 'mascot-eye mascot-eye-right' })
  rightEye.appendChild(el('ellipse', { cx: 63, cy: 40, rx: 8, ry: 9, class: 'eye-bg' }))
  rightEye.appendChild(el('ellipse', { cx: 63, cy: 42, rx: 4, ry: 5, class: 'eye-pupil' }))
  rightEye.appendChild(el('line',    { x1: 55, y1: 34, x2: 71, y2: 34, class: 'eye-lid' }))
  svg.appendChild(rightEye)

  // Mouth group — contains all mouth shapes, CSS shows/hides per state
  const mouthGroup = el('g', { class: 'mascot-mouth', transform: 'translate(50 65)' })

  // neutral line (idle / attentive)
  mouthGroup.appendChild(el('line', {
    x1: -10, y1: 0, x2: 10, y2: 0,
    class: 'mouth-neutral',
  }))

  // happy arc (up-curve)
  mouthGroup.appendChild(el('path', {
    d: 'M -11 -2 Q 0 8 11 -2',
    class: 'mouth-happy',
  }))

  // open oval — listening/speaking
  mouthGroup.appendChild(el('ellipse', {
    cx: 0, cy: 2, rx: 7, ry: 5,
    class: 'mouth-open',
  }))

  // wide open oval — speaking (larger)
  mouthGroup.appendChild(el('ellipse', {
    cx: 0, cy: 2, rx: 8, ry: 8,
    class: 'mouth-wide',
  }))

  // tired drooping line
  mouthGroup.appendChild(el('path', {
    d: 'M -10 2 Q 0 -4 10 2',
    class: 'mouth-tired',
  }))

  svg.appendChild(mouthGroup)

  // Cheek blush dots (visible in happy state)
  svg.appendChild(el('circle', { cx: 26, cy: 55, r: 5, class: 'mascot-blush mascot-blush-left' }))
  svg.appendChild(el('circle', { cx: 74, cy: 55, r: 5, class: 'mascot-blush mascot-blush-right' }))

  return svg
}

// ---------------------------------------------------------------------------
// Update — sets data-state on the SVG root so CSS takes over
// ---------------------------------------------------------------------------

export function updateMascotState(svg: SVGSVGElement, state: MascotState): void {
  svg.dataset.state = state
}
