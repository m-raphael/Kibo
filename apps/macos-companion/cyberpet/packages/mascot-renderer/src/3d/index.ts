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

function expLerp(cur: number, tgt: number, a: number): number {
  return cur + (tgt - cur) * a
}

const LERP_FAST   = 0.14  // pupil tracking
const LERP_NORMAL = 0.07  // state transitions

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

  let tgt: AnimTargets = { ...TARGET_NEUTRAL }
  let cur: AnimTargets = { ...TARGET_NEUTRAL }

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

    // Lerp targets
    const lerp = (c: number, t: number, a: number) => expLerp(c, t, a)

    cur.bodyScaleY  = lerp(cur.bodyScaleY,  tgt.bodyScaleY,  LERP_NORMAL)
    cur.bodyPosY    = lerp(cur.bodyPosY,    tgt.bodyPosY,    LERP_NORMAL)
    cur.headPosY    = lerp(cur.headPosY,    tgt.headPosY,    LERP_NORMAL)
    cur.headRotZ    = lerp(cur.headRotZ,    tgt.headRotZ,    LERP_NORMAL)
    cur.headRotX    = lerp(cur.headRotX,    tgt.headRotX,    LERP_NORMAL)
    cur.earLRotX    = lerp(cur.earLRotX,    tgt.earLRotX,    LERP_NORMAL)
    cur.earRRotX    = lerp(cur.earRRotX,    tgt.earRRotX,    LERP_NORMAL)
    cur.eyeScaleY   = lerp(cur.eyeScaleY,   tgt.eyeScaleY,   LERP_NORMAL)
    cur.pupilL_X    = lerp(cur.pupilL_X,    tgt.pupilL_X,    LERP_FAST)
    cur.pupilL_Y    = lerp(cur.pupilL_Y,    tgt.pupilL_Y,    LERP_FAST)
    cur.pupilR_X    = lerp(cur.pupilR_X,    tgt.pupilR_X,    LERP_FAST)
    cur.pupilR_Y    = lerp(cur.pupilR_Y,    tgt.pupilR_Y,    LERP_FAST)
    cur.mouthScaleY = lerp(cur.mouthScaleY, tgt.mouthScaleY, LERP_NORMAL)
    cur.tailRotZ    = lerp(cur.tailRotZ,    tgt.tailRotZ,    LERP_NORMAL)
    cur.tailRotX    = lerp(cur.tailRotX,    tgt.tailRotX,    LERP_NORMAL)

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
        tgt = stateTargets(state, dx, dy)
      } else {
        tgt.pupilL_X = dx * 0.02
        tgt.pupilL_Y = dy * 0.02
        tgt.pupilR_X = dx * 0.02
        tgt.pupilR_Y = dy * 0.02
      }
    },

    setMascot(id: MascotId) {
      if (id === mascotId) return
      handle.group.remove(mascot.group)
      mascotId = id
      mascot   = buildMascot(id)
      handle.group.add(mascot.group)
      cur = { ...TARGET_NEUTRAL }
      tgt = { ...TARGET_NEUTRAL }
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
