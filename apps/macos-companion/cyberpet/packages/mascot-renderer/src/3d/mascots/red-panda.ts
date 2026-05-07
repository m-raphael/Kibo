import * as THREE from 'three'
import { type MascotParts, type AnimTargets, clamp } from './shared.js'

// Mi Bunny Red Panda — rust orange, distinctive white eye-ring patches, dark legs, striped tail
const BODY    = 0xB8452A   // rust orange-red
const CREAM   = 0xEEEAE0   // off-white eye rings + inner ears
const DARK    = 0x18181E   // near-black legs

function mat(c: number, r = 0.90): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 })
}

export function buildMiBunnyRedPanda(): MascotParts {
  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 22), mat(BODY))
  body.scale.set(1, 0.82, 0.88)
  body.position.y = -0.68
  group.add(body)

  // Dark legs (distinctive feature from reference)
  const legMat = mat(DARK, 0.85)
  const legGeo = new THREE.CapsuleGeometry(0.18, 0.30, 4, 8)
  const legL = new THREE.Mesh(legGeo, legMat)
  legL.position.set(-0.32, -1.22, 0.18); group.add(legL)
  const legR = new THREE.Mesh(legGeo, legMat)
  legR.position.set(0.32, -1.22, 0.18); group.add(legR)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.96, 32, 26), mat(BODY))
  head.position.y = 0.64
  group.add(head)

  // Pointed ears — orange outer + cream inner (cat-like)
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mat(BODY))
  earL.scale.set(0.90, 1.10, 0.52); earL.position.set(-0.72, 1.28, 0.04); group.add(earL)
  const earLIn = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(CREAM, 0.88))
  earLIn.scale.set(0.85, 0.95, 0.34); earLIn.position.set(-0.72, 1.28, 0.08); group.add(earLIn)
  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), mat(BODY))
  earR.scale.set(0.90, 1.10, 0.52); earR.position.set(0.72, 1.28, 0.04); group.add(earR)
  const earRIn = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(CREAM, 0.88))
  earRIn.scale.set(0.85, 0.95, 0.34); earRIn.position.set(0.72, 1.28, 0.08); group.add(earRIn)

  // Distinctive white oval eye-ring patches (raccoon-style, key feature from reference)
  const eyeRingMat = mat(CREAM, 0.94)
  const ringL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), eyeRingMat)
  ringL.scale.set(0.88, 0.92, 0.42); ringL.position.set(-0.26, 0.70, 0.87); group.add(ringL)
  const ringR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), eyeRingMat)
  ringR.scale.set(0.88, 0.92, 0.42); ringR.position.set(0.26, 0.70, 0.87); group.add(ringR)

  // Tiny dot eyes on top of rings
  const eyeMat   = new THREE.MeshStandardMaterial({ color: 0x18181E, roughness: 0.05, metalness: 0.15 })
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })

  const eyeL  = new THREE.Mesh(new THREE.SphereGeometry(0.092, 14, 12), eyeMat)
  const eyeR  = new THREE.Mesh(new THREE.SphereGeometry(0.092, 14, 12), eyeMat.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 8), glintMat)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 8), glintMat.clone())
  eyeL.position.set(-0.26, 0.70, 0.95); eyeR.position.set(0.26, 0.70, 0.95)
  glintL.position.set(-0.22, 0.73, 0.98); glintR.position.set(0.30, 0.73, 0.98)
  group.add(eyeL, eyeR, glintL, glintR)

  // Small black nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 7), mat(0x0A0A10, 0.65))
  nose.scale.set(1.10, 0.65, 0.55); nose.position.set(0, 0.56, 0.97); group.add(nose)

  // Straight mouth
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.14, 5), mat(0x885533))
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, 0.50, 0.97); group.add(mouth)

  // Bushy striped tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.11, 0.94, 10), mat(BODY))
  tail.position.set(0.20, -0.70, -0.96); tail.rotation.set(0.55, 0, 0.22); group.add(tail)
  const stripMat = mat(0x5A2810)
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.024, 6, 16), stripMat)
    ring.position.set(0.20, -0.68 + (i - 1) * 0.24, -0.96)
    ring.rotation.set(0.55, 0, 0.22); group.add(ring)
  }

  const extras: THREE.Object3D[] = [
    earL, earLIn, earR, earRIn,
    ringL, ringR,
    glintL, glintR, nose, mouth, tail,
    legL, legR,
  ]

  function apply(cur: AnimTargets, blink: boolean, breathe: number): void {
    body.scale.y    = 0.82 * cur.bodyScaleY + breathe * 0.008
    body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.64 + cur.headPosY + breathe * 0.008
    head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX

    ringL.position.y = 0.70 + cur.headPosY + breathe * 0.008
    ringR.position.y = 0.70 + cur.headPosY + breathe * 0.008

    const eyeS = blink ? 0.06 : cur.eyeScaleY
    eyeL.scale.y = eyeS; eyeR.scale.y = eyeS

    const exL = clamp(cur.pupilL_X, -0.04, 0.04)
    const exR = clamp(cur.pupilR_X, -0.04, 0.04)
    eyeL.position.x = -0.26 + exL; glintL.position.x = -0.22 + exL
    eyeR.position.x  =  0.26 + exR; glintR.position.x  =  0.30 + exR
    tail.rotation.z = 0.22 + cur.tailRotZ
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}

export { buildMiBunnyRedPanda as buildPlaceholderRedPanda }
