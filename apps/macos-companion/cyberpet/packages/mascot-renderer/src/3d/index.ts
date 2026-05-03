import * as THREE from 'three'
import type { MascotState } from '@cyberpet/mascot-core'
import { initThreeScene } from './buildScene'
import { buildCat, type CatParts } from './cat'

// ---------------------------------------------------------------------------
// Three.js 3D mascot renderer
// ---------------------------------------------------------------------------

export interface ThreeMascotHandle {
  element:  HTMLCanvasElement
  update:   (state?: MascotState, dx?: number, dy?: number, faceDetected?: boolean) => void
  dispose:  () => void
}

// ---------------------------------------------------------------------------
// Animation target values
// ---------------------------------------------------------------------------

interface AnimTargets {
  bodyScaleY: number
  bodyPosY:   number
  headPosY:   number
  headRotZ:   number
  headRotX:   number
  earLRotX:   number
  earRRotX:   number
  eyeScaleY:  number
  pupilL_X:   number
  pupilL_Y:   number
  pupilR_X:   number
  pupilR_Y:   number
  mouthScaleY: number
  tailRotZ:   number
  tailRotX:   number
}

const TARGET_NEUTRAL: AnimTargets = {
  bodyScaleY: 1,
  bodyPosY:   0,
  headPosY:   0,
  headRotZ:   0,
  headRotX:   0,
  earLRotX:   0,
  earRRotX:   0,
  eyeScaleY:  1,
  pupilL_X:   0,
  pupilL_Y:   0,
  pupilR_X:   0,
  pupilR_Y:   0,
  mouthScaleY: 0.3,
  tailRotZ:   0,
  tailRotX:   0.6,
}

function stateTargets(state: MascotState, dx: number, dy: number): AnimTargets {
  const t = { ...TARGET_NEUTRAL }

  // Apply pupil offset from face tracking (passed in from main)
  t.pupilL_X = dx * 0.02
  t.pupilL_Y = dy * 0.02
  t.pupilR_X = dx * 0.02
  t.pupilR_Y = dy * 0.02

  switch (state) {
    case 'idle':
      // Neutral — breathing added in the animation loop
      break

    case 'attentive':
      // Perk up — ears forward, head up, eyes slightly wider
      t.headPosY   = 0.05
      t.headRotX   = -0.08
      t.earLRotX   = -0.25
      t.earRRotX   = -0.25
      t.eyeScaleY  = 1.15
      break

    case 'listening':
      // Tilt head, one ear forward
      t.headRotZ   = 0.10
      t.headRotX   = 0.05
      t.earLRotX   = -0.35
      t.earRRotX   = 0.1
      break

    case 'speaking':
      // Mouth opens, subtle bounce
      t.mouthScaleY = 0.7
      t.headPosY    = 0.02
      t.bodyScaleY  = 1.02
      break

    case 'happy':
      // Squint, bounce, tail wag
      t.eyeScaleY   = 0.4
      t.bodyScaleY  = 1.04
      t.headRotZ    = -0.04
      t.tailRotZ    = 0.25
      break

    case 'tired':
      // Droop, slouch
      t.eyeScaleY   = 0.15
      t.headPosY    = -0.12
      t.headRotX    = 0.15
      t.bodyScaleY  = 0.92
      t.bodyPosY    = -0.05
      t.tailRotZ    = -0.1
      break
  }

  return t
}

// ---------------------------------------------------------------------------
// Simple exponential lerp (one-pole filter)
// ---------------------------------------------------------------------------

function expLerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha
}

const LERP_ALPHA = 0.07

// ---------------------------------------------------------------------------
// Build the full 3D mascot
// ---------------------------------------------------------------------------

export function buildMascot3d(container?: HTMLElement): ThreeMascotHandle {
  const el = container ?? document.getElementById('mascot-face')!
  const handle = initThreeScene(el)
  const cat: CatParts = buildCat()
  handle.group.add(cat.group)

  // State
  let currentState: MascotState = 'idle'
  let faceDetected = false
  let blinkPhase = 0
  let breathePhase = 0

  // Target / current animation values
  let cur: AnimTargets = { ...TARGET_NEUTRAL }
  let tgt: AnimTargets = { ...TARGET_NEUTRAL }
  let lastTime = performance.now()

  // --- Animation loop ---
  function animate(time: number) {
    const dt = Math.min((time - lastTime) / 1000, 0.05) // cap dt to avoid spiral
    lastTime = time

    breathePhase += dt * 1.2
    blinkPhase   += dt

    // --- Idle breathing ---
    const breathe = Math.sin(breathePhase) * 0.03
    const breatheBody = Math.sin(breathePhase) * 0.015

    // --- Auto-blink ---
    let blink = 0
    if (blinkPhase > 3.5 && blinkPhase < 3.6) { // 100ms blink window
      blink = 1
    } else if (blinkPhase >= 3.6) {
      blinkPhase = 0
    }

    // Lerp all targets
    const a = LERP_ALPHA
    cur.bodyScaleY  = expLerp(cur.bodyScaleY,  tgt.bodyScaleY,  a)
    cur.bodyPosY    = expLerp(cur.bodyPosY,    tgt.bodyPosY,    a)
    cur.headPosY    = expLerp(cur.headPosY,    tgt.headPosY,    a)
    cur.headRotZ    = expLerp(cur.headRotZ,    tgt.headRotZ,    a)
    cur.headRotX    = expLerp(cur.headRotX,    tgt.headRotX,    a)
    cur.earLRotX    = expLerp(cur.earLRotX,    tgt.earLRotX,    a)
    cur.earRRotX    = expLerp(cur.earRRotX,    tgt.earRRotX,    a)
    cur.eyeScaleY   = expLerp(cur.eyeScaleY,   tgt.eyeScaleY,   a)
    cur.pupilL_X    = expLerp(cur.pupilL_X,    tgt.pupilL_X,    a * 2)
    cur.pupilL_Y    = expLerp(cur.pupilL_Y,    tgt.pupilL_Y,    a * 2)
    cur.pupilR_X    = expLerp(cur.pupilR_X,    tgt.pupilR_X,    a * 2)
    cur.pupilR_Y    = expLerp(cur.pupilR_Y,    tgt.pupilR_Y,    a * 2)
    cur.mouthScaleY = expLerp(cur.mouthScaleY, tgt.mouthScaleY, a)
    cur.tailRotZ    = expLerp(cur.tailRotZ,    tgt.tailRotZ,    a)
    cur.tailRotX    = expLerp(cur.tailRotX,    tgt.tailRotX,    a)

    // --- Apply to meshes ---

    // Body — breathing + state scale + bounce
    const bodyS = cur.bodyScaleY + breatheBody
    cat.body.scale.y   = 0.82 * bodyS
    cat.body.position.y = -0.7 + cur.bodyPosY

    // Head — position + tilt
    cat.head.position.y = 0.75 + cur.headPosY + breathe * 0.5
    cat.head.rotation.z = cur.headRotZ
    cat.head.rotation.x = cur.headRotX

    // Ears
    cat.earL.rotation.x     = -0.18 + cur.earLRotX
    cat.earLInner.rotation.x = -0.18 + cur.earLRotX
    cat.earR.rotation.x     = -0.18 + cur.earRRotX
    cat.earRInner.rotation.x = -0.18 + cur.earRRotX

    // Eyes sclera — blink + state squint
    const blinkScale = blink > 0.5 ? 0.08 : cur.eyeScaleY
    cat.scleraL.scale.y = blinkScale
    cat.scleraR.scale.y = blinkScale

    // Pupils — tracking offset
    cat.pupilL.position.x = -0.35 + clamp(cur.pupilL_X, -0.06, 0.06)
    cat.pupilL.position.y = 0.82  + clamp(cur.pupilL_Y, -0.06, 0.06)
    cat.pupilR.position.x = 0.35  + clamp(cur.pupilR_X, -0.06, 0.06)
    cat.pupilR.position.y = 0.82  + clamp(cur.pupilR_Y, -0.06, 0.06)

    // Mouth
    cat.mouth.scale.y = cur.mouthScaleY

    // Tail — state wag + breathing wag
    cat.tail.rotation.z = cur.tailRotZ + breathe * 0.3
    cat.tail.rotation.x = cur.tailRotX

    handle.renderer.render(handle.scene, handle.camera)
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)

  // --- Public API ---
  return {
    element: handle.canvas,

    update(state?: MascotState, dx = 0, dy = 0, detected?: boolean) {
      if (detected !== undefined) faceDetected = detected
      if (state !== undefined) {
        currentState = state
        tgt = stateTargets(state, dx, dy)
      } else {
        // Pupil-only update — preserve state, just update tracking targets
        tgt.pupilL_X = dx * 0.02
        tgt.pupilL_Y = dy * 0.02
        tgt.pupilR_X = dx * 0.02
        tgt.pupilR_Y = dy * 0.02
      }
    },

    dispose() {
      handle.dispose()
    },
  }
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
