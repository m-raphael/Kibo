import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Accessory system — Task 14
// Each accessory is a THREE.Group parented to mascot.head.
// Head-local coords: head center = (0,0,0), eyes ≈ (±0.26, +0.06, 0.93)
// ---------------------------------------------------------------------------

export type AccessoryId = 'glasses' | 'scarf' | 'bow' | 'headset'

export interface AccessoryMeta {
  id:    AccessoryId
  label: string
  emoji: string
}

export const ACCESSORY_LIST: AccessoryMeta[] = [
  { id: 'glasses', label: 'Glasses', emoji: '👓' },
  { id: 'scarf',   label: 'Scarf',   emoji: '🧣' },
  { id: 'bow',     label: 'Bow',     emoji: '🎀' },
  { id: 'headset', label: 'Headset', emoji: '🎧' },
]

function mat(color: number, roughness = 0.80, metalness = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

// ---------------------------------------------------------------------------
// Glasses — round gold wire-frame spectacles at eye level
// ---------------------------------------------------------------------------

function buildGlasses(): THREE.Group {
  const g = new THREE.Group()
  const frameMat = mat(0xC8A83A, 0.30, 0.70)

  const lensGeo = new THREE.TorusGeometry(0.195, 0.022, 8, 28)
  const lensL = new THREE.Mesh(lensGeo, frameMat)
  const lensR = new THREE.Mesh(lensGeo, frameMat.clone())
  lensL.position.set(-0.28, 0.07, 0.94)
  lensR.position.set( 0.28, 0.07, 0.94)
  g.add(lensL, lensR)

  // Bridge between lenses
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.087, 5), frameMat.clone())
  bridge.rotation.z = Math.PI / 2
  bridge.position.set(0, 0.07, 0.95)
  g.add(bridge)

  // Temples
  const armGeo = new THREE.CylinderGeometry(0.010, 0.010, 0.55, 5)
  const armL = new THREE.Mesh(armGeo, frameMat.clone())
  armL.rotation.z = Math.PI / 2
  armL.position.set(-0.75, 0.07, 0.62)
  g.add(armL)
  const armR = armL.clone()
  armR.position.x = 0.75
  g.add(armR)

  return g
}

// ---------------------------------------------------------------------------
// Scarf — red fluffy wrap at neck with cream stripe
// ---------------------------------------------------------------------------

function buildScarf(): THREE.Group {
  const g = new THREE.Group()

  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.20, 10, 32), mat(0xE8300A, 0.92))
  wrap.rotation.x = Math.PI / 2
  wrap.position.set(0, -0.70, 0.08)
  g.add(wrap)

  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 6, 32), mat(0xF5F0E0, 0.90))
  stripe.rotation.x = Math.PI / 2
  stripe.position.set(0, -0.60, 0.08)
  g.add(stripe)

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.44, 4, 10), mat(0xE8300A, 0.92))
  tail.position.set(0.22, -0.96, 0.72)
  tail.rotation.z = 0.30
  g.add(tail)

  return g
}

// ---------------------------------------------------------------------------
// Bow — pink bow-tie at neck
// ---------------------------------------------------------------------------

function buildBow(): THREE.Group {
  const g = new THREE.Group()
  const bowMat = mat(0xE8508A, 0.85)
  const wingGeo = new THREE.SphereGeometry(0.22, 10, 8)

  const wingL = new THREE.Mesh(wingGeo, bowMat)
  wingL.scale.set(1.30, 0.80, 0.40)
  wingL.position.set(-0.25, -0.72, 0.78); wingL.rotation.z = -0.18
  g.add(wingL)

  const wingR = new THREE.Mesh(wingGeo, bowMat.clone())
  wingR.scale.set(1.30, 0.80, 0.40)
  wingR.position.set( 0.25, -0.72, 0.78); wingR.rotation.z = 0.18
  g.add(wingR)

  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 8), mat(0xF5D0E0, 0.82))
  knot.scale.set(0.9, 0.9, 0.50)
  knot.position.set(0, -0.72, 0.84)
  g.add(knot)

  return g
}

// ---------------------------------------------------------------------------
// Headset — dark over-ear headphones with mic boom
// ---------------------------------------------------------------------------

function buildHeadset(): THREE.Group {
  const g = new THREE.Group()
  const DARK = 0x1E1E28

  // Headband arc (half-torus)
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.90, 0.038, 8, 24, Math.PI), mat(DARK, 0.65))
  band.rotation.z = Math.PI / 2
  band.position.set(0, 0.50, 0.04)
  g.add(band)

  // Left cup
  const cupMat = mat(DARK, 0.70)
  const cupL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), cupMat)
  cupL.scale.set(1, 1, 0.52); cupL.position.set(-1.08, 0.06, 0.10)
  g.add(cupL)
  const padL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0x2E2E40, 0.88))
  padL.scale.set(1, 1, 0.35); padL.position.set(-1.13, 0.06, 0.12)
  g.add(padL)

  // Right cup
  const cupR = cupL.clone(); cupR.position.x = 1.08; g.add(cupR)
  const padR = padL.clone(); padR.position.x = 1.13; g.add(padR)

  // Mic boom
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.40, 5), mat(DARK, 0.60))
  mic.rotation.z = -0.85; mic.position.set(-1.20, -0.28, 0.16)
  g.add(mic)
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.032, 7, 7), mat(0x40404A, 0.50))
  ball.position.set(-1.44, -0.48, 0.16)
  g.add(ball)

  return g
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function buildAccessory(id: AccessoryId): THREE.Group {
  switch (id) {
    case 'glasses': return buildGlasses()
    case 'scarf':   return buildScarf()
    case 'bow':     return buildBow()
    case 'headset': return buildHeadset()
  }
}
