import * as THREE from 'three'
import type { MascotState } from '@cyberpet/mascot-core'
import { initThreeScene } from './buildScene.js'
import {
  buildMascot,
  type MascotId, type MascotParts, type AnimTargets, TARGET_NEUTRAL,
} from './mascots/index.js'
import {
  buildAccessory,
  type AccessoryId,
} from './accessories/index.js'
import {
  PALETTE_LIST,
  type PaletteId,
} from './palettes/index.js'

export type { AccessoryId, PaletteId }
export { ACCESSORY_LIST } from './accessories/index.js'
export { PALETTE_LIST } from './palettes/index.js'

// ---------------------------------------------------------------------------
// Three.js 3D mascot renderer — Mi Bunny mascot system
// ---------------------------------------------------------------------------

export interface ThreeMascotHandle {
  element:       HTMLCanvasElement
  update:        (state?: MascotState, dx?: number, dy?: number, faceDetected?: boolean) => void
  setMascot:     (id: MascotId) => void
  setAccessory:  (id: AccessoryId | null) => void
  setPalette:    (id: PaletteId) => void
  dispose:       () => void
}

// ---------------------------------------------------------------------------
// State targets per MascotState
// ---------------------------------------------------------------------------

function stateTargets(state: MascotState, dx: number, dy: number): AnimTargets {
  const t: AnimTargets = { ...TARGET_NEUTRAL }

  t.pupilL_X = dx * 0.02
  t.pupilL_Y = dy * 0.02
  t.pupilR_X = dx * 0.02
  t.pupilR_Y = dy * 0.02

  switch (state) {
    case 'attentive':
      t.headPosY  = 0.05
      t.headRotX  = -0.08
      t.earLRotX  = -0.25
      t.earRRotX  = -0.25
      t.eyeScaleY = 1.18
      break

    case 'listening':
      t.headRotZ  = 0.10
      t.headRotX  = 0.05
      t.earLRotX  = -0.30
      t.earRRotX  =  0.08
      break

    case 'speaking':
      t.mouthScaleY = 1.4
      t.headPosY    = 0.02
      t.bodyScaleY  = 1.02
      break

    case 'happy':
      t.eyeScaleY  = 0.35
      t.bodyScaleY = 1.04
      t.headRotZ   = -0.04
      t.tailRotZ   = 0.28
      t.mouthScaleY = 1.3
      break

    case 'tired':
      t.eyeScaleY  = 0.18
      t.headPosY   = -0.12
      t.headRotX   = 0.15
      t.bodyScaleY = 0.92
      t.bodyPosY   = -0.05
      t.tailRotZ   = -0.08
      t.mouthScaleY = 0.7
      break
  }

  return t
}

// Frame-rate independent exponential decay lerp.
// k controls speed: k=14 → ~50ms to half-way; k=6 → ~115ms; k=2.5 → ~280ms; k=1.2 → ~580ms
function dlerp(cur: number, tgt: number, k: number, dt: number): number {
  return cur + (tgt - cur) * (1 - Math.exp(-k * dt))
}

const K_FAST = 14   // pupils — snappy eye tracking
const K_MED  = 6    // head, eyes, mouth, body — responsive
const K_SLOW = 2.5  // ears — floppy, inertial
const K_TAIL = 1.2  // tail — laziest, maximum physical lag

// Brief "entry pose" that plays before the real target, creating natural
// anticipation and overshoot without velocity tracking.
// e.g. happy: eyes widen first (surprise) → then squint (joy)
const ENTRY_MS = 180

const ENTRY_BOOST: Partial<Record<MascotState, Partial<AnimTargets>>> = {
  happy:     { eyeScaleY: 1.45, headPosY: 0.10, tailRotZ: 0.55 },
  attentive: { earLRotX: -0.52, earRRotX: -0.52, headPosY: 0.14, eyeScaleY: 1.35 },
  tired:     { headPosY: -0.24, eyeScaleY: 0.04, bodyPosY: -0.09 },
  speaking:  { mouthScaleY: 2.4, headPosY: 0.06 },
  listening: { headRotZ: 0.20, earLRotX: -0.52, earRRotX: 0.20 },
}

// ---------------------------------------------------------------------------
// Build the full 3D mascot renderer
// ---------------------------------------------------------------------------

export function buildMascot3d(container?: HTMLElement): ThreeMascotHandle {
  const el     = container ?? document.getElementById('mascot-face')!
  const handle = initThreeScene(el)

  let mascotId: MascotId      = 'cat'
  let mascot: MascotParts     = buildMascot(mascotId)
  handle.group.add(mascot.group)

  let currentAccessoryId: AccessoryId | null = null
  let accessoryGroup:     THREE.Group | null  = null

  function attachAccessory(id: AccessoryId | null) {
    if (accessoryGroup) { mascot.head.remove(accessoryGroup); accessoryGroup = null }
    if (id) { accessoryGroup = buildAccessory(id); mascot.head.add(accessoryGroup) }
    currentAccessoryId = id
  }

  // Palette — snapshot original colors on load, restore on 'original'
  let currentPaletteId: PaletteId = 'original'
  const snapshotBodyColor = () =>
    (mascot.body.material as THREE.MeshStandardMaterial).color.getHex()
  const snapshotHeadColor = () =>
    (mascot.head.material as THREE.MeshStandardMaterial).color.getHex()

  let originalBodyHex = snapshotBodyColor()
  let originalHeadHex = snapshotHeadColor()

  function applyPalette(id: PaletteId) {
    currentPaletteId = id
    const palette = PALETTE_LIST.find(p => p.id === id)
    const bodyHex  = palette?.body ?? originalBodyHex
    const headHex  = palette?.body ?? originalHeadHex
    ;(mascot.body.material as THREE.MeshStandardMaterial).color.setHex(bodyHex)
    ;(mascot.head.material as THREE.MeshStandardMaterial).color.setHex(headHex)
  }

  let tgt:     AnimTargets = { ...TARGET_NEUTRAL }
  let realTgt: AnimTargets = { ...TARGET_NEUTRAL }
  let cur:     AnimTargets = { ...TARGET_NEUTRAL }

  let prevState:  MascotState | undefined
  let entryTimer: ReturnType<typeof setTimeout> | null = null

  function setStateTargets(state: MascotState, dx: number, dy: number) {
    realTgt = stateTargets(state, dx, dy)
    const boost = ENTRY_BOOST[state]
    if (boost && state !== prevState) {
      tgt = { ...realTgt, ...boost }
      if (entryTimer) clearTimeout(entryTimer)
      entryTimer = setTimeout(() => { tgt = realTgt; entryTimer = null }, ENTRY_MS)
    } else {
      tgt = realTgt
    }
    prevState = state
  }

  let breathePhase = 0
  let blinkPhase   = 0
  let lastTime     = performance.now()

  // ---------------------------------------------------------------------------
  // Animation loop
  // ---------------------------------------------------------------------------

  function animate(now: number): void {
    const dt = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now

    // Mi Bunny idle: slower, floatier breathing (0.65 Hz)
    breathePhase += dt * 0.65 * Math.PI * 2

    // Auto-blink every ~3.8 s, 90 ms window
    blinkPhase += dt
    const isBlink = blinkPhase > 3.8 && blinkPhase < 3.89
    if (blinkPhase >= 3.89) blinkPhase = 0

    // Frame-rate independent lerp with per-channel inertia
    cur.bodyScaleY  = dlerp(cur.bodyScaleY,  tgt.bodyScaleY,  K_MED,  dt)
    cur.bodyPosY    = dlerp(cur.bodyPosY,    tgt.bodyPosY,    K_MED,  dt)
    cur.headPosY    = dlerp(cur.headPosY,    tgt.headPosY,    K_MED,  dt)
    cur.headRotZ    = dlerp(cur.headRotZ,    tgt.headRotZ,    K_MED,  dt)
    cur.headRotX    = dlerp(cur.headRotX,    tgt.headRotX,    K_MED,  dt)
    cur.earLRotX    = dlerp(cur.earLRotX,    tgt.earLRotX,    K_SLOW, dt)
    cur.earRRotX    = dlerp(cur.earRRotX,    tgt.earRRotX,    K_SLOW, dt)
    cur.eyeScaleY   = dlerp(cur.eyeScaleY,   tgt.eyeScaleY,   K_MED,  dt)
    cur.pupilL_X    = dlerp(cur.pupilL_X,    tgt.pupilL_X,    K_FAST, dt)
    cur.pupilL_Y    = dlerp(cur.pupilL_Y,    tgt.pupilL_Y,    K_FAST, dt)
    cur.pupilR_X    = dlerp(cur.pupilR_X,    tgt.pupilR_X,    K_FAST, dt)
    cur.pupilR_Y    = dlerp(cur.pupilR_Y,    tgt.pupilR_Y,    K_FAST, dt)
    cur.mouthScaleY = dlerp(cur.mouthScaleY, tgt.mouthScaleY, K_MED,  dt)
    cur.tailRotZ    = dlerp(cur.tailRotZ,    tgt.tailRotZ,    K_TAIL, dt)
    cur.tailRotX    = dlerp(cur.tailRotX,    tgt.tailRotX,    K_TAIL, dt)

    const breatheSin = Math.sin(breathePhase)
    mascot.apply(cur, isBlink, breatheSin)

    handle.renderer.render(handle.scene, handle.camera)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  return {
    element: handle.canvas,

    update(state?: MascotState, dx = 0, dy = 0) {
      if (state !== undefined) {
        setStateTargets(state, dx, dy)
      } else {
        // Pupil-only update — keep in sync with both tgt and realTgt
        const px = dx * 0.02, py = dy * 0.02
        tgt.pupilL_X = px;  tgt.pupilL_Y = py
        tgt.pupilR_X = px;  tgt.pupilR_Y = py
        realTgt.pupilL_X = px; realTgt.pupilL_Y = py
        realTgt.pupilR_X = px; realTgt.pupilR_Y = py
      }
    },

    setMascot(id: MascotId) {
      if (id === mascotId) return
      handle.group.remove(mascot.group)
      mascotId = id
      mascot   = buildMascot(id)
      handle.group.add(mascot.group)
      cur     = { ...TARGET_NEUTRAL }
      tgt     = { ...TARGET_NEUTRAL }
      realTgt = { ...TARGET_NEUTRAL }
      prevState = undefined
      if (entryTimer) { clearTimeout(entryTimer); entryTimer = null }
      blinkPhase = 0
      // Snapshot new mascot's original colors then re-apply current palette
      originalBodyHex = snapshotBodyColor()
      originalHeadHex = snapshotHeadColor()
      applyPalette(currentPaletteId)
      if (currentAccessoryId) attachAccessory(currentAccessoryId)
    },

    setAccessory(id: AccessoryId | null) {
      attachAccessory(id)
    },

    setPalette(id: PaletteId) {
      applyPalette(id)
    },

    dispose() {
      handle.dispose()
    },
  }
}
