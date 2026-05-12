import * as THREE from 'three'
import { type MascotParts, type AnimTargets, clamp } from './shared.js'

// ---------------------------------------------------------------------------
// Red Panda — built from reference image (kibocyber S3)
// Key features: terracotta orange body, large white eye patches, black paws,
// waving left arm, bushy striped tail, pointed ears with cream inner
// ---------------------------------------------------------------------------

const ORANGE  = 0xC4481A   // terracotta rust — main body/head colour
const BLACK   = 0x120E0C   // near-black — paws, legs, feet
const CREAM   = 0xF2EDE4   // warm cream — eye patches, inner ears
const STRIPE  = 0x5C2410   // dark brown — tail stripe rings
const NOSE_C  = 0x0A080C   // black nose

// MeshPhysicalMaterial gives sheen (anisotropic fur highlight) and a soft
// subsurface feel that matches the Xiaomi Mi Bunny plush toy aesthetic.
function mat(c: number, r = 0.88): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: r,
    metalness: 0,
    sheen: 0.65,
    sheenRoughness: 0.75,
    sheenColor: new THREE.Color(c).multiplyScalar(1.35),
  })
}

function matGlossy(c: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.05,
    metalness: 0.10,
    clearcoat: 0.6,
    clearcoatRoughness: 0.1,
  })
}

export function buildMiBunnyRedPanda(): MascotParts {
  const group = new THREE.Group()

  // ── Body ─────────────────────────────────────────────────────────────────
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 24), mat(ORANGE))
  body.scale.set(1, 0.85, 0.92)
  body.position.y = -0.60
  group.add(body)

  // ── Legs (short, dark) ───────────────────────────────────────────────────
  const legGeo = new THREE.CapsuleGeometry(0.20, 0.22, 4, 8)
  const legL = new THREE.Mesh(legGeo, mat(BLACK, 0.82))
  legL.position.set(-0.34, -1.20, 0.14); group.add(legL)
  const legR = new THREE.Mesh(legGeo, mat(BLACK, 0.82))
  legR.position.set( 0.34, -1.20, 0.14); group.add(legR)

  // Feet (flat ovals)
  const footGeo = new THREE.SphereGeometry(0.22, 10, 8)
  const footL = new THREE.Mesh(footGeo, mat(BLACK, 0.80))
  footL.scale.set(1.10, 0.45, 1.30); footL.position.set(-0.34, -1.36, 0.20); group.add(footL)
  const footR = new THREE.Mesh(footGeo, mat(BLACK, 0.80))
  footR.scale.set(1.10, 0.45, 1.30); footR.position.set( 0.34, -1.36, 0.20); group.add(footR)

  // ── Head ─────────────────────────────────────────────────────────────────
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.02, 36, 28), mat(ORANGE))
  head.position.y = 0.70
  group.add(head)

  // ── Ears (pointed, orange outer + cream inner) ───────────────────────────
  const earGeo = new THREE.SphereGeometry(0.26, 14, 12)
  const earL = new THREE.Mesh(earGeo, mat(ORANGE))
  earL.scale.set(0.82, 1.22, 0.48); earL.position.set(-0.76, 1.38, 0.02); group.add(earL)
  const earLIn = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(CREAM, 0.92))
  earLIn.scale.set(0.70, 1.0, 0.32); earLIn.position.set(-0.76, 1.38, 0.10); group.add(earLIn)

  const earR = new THREE.Mesh(earGeo.clone(), mat(ORANGE))
  earR.scale.set(0.82, 1.22, 0.48); earR.position.set( 0.76, 1.38, 0.02); group.add(earR)
  const earRIn = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(CREAM, 0.92))
  earRIn.scale.set(0.70, 1.0, 0.32); earRIn.position.set( 0.76, 1.38, 0.10); group.add(earRIn)

  // ── Large white eye-ring patches (key feature from reference) ────────────
  const patchGeo = new THREE.SphereGeometry(0.28, 14, 12)
  const patchL = new THREE.Mesh(patchGeo, mat(CREAM, 0.94))
  patchL.scale.set(0.95, 1.0, 0.38); patchL.position.set(-0.28, 0.75, 0.90); group.add(patchL)
  const patchR = new THREE.Mesh(patchGeo, mat(CREAM, 0.94))
  patchR.scale.set(0.95, 1.0, 0.38); patchR.position.set( 0.28, 0.75, 0.90); group.add(patchR)

  // Fur volume — slightly larger translucent orange sphere gives depth illusion
  const furVol = new THREE.Mesh(
    new THREE.SphereGeometry(1.04, 32, 24),
    new THREE.MeshPhysicalMaterial({
      color: ORANGE,
      roughness: 0.95,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    }),
  )
  furVol.scale.set(1.02, 0.88, 0.96)
  furVol.position.y = 0.70
  group.add(furVol)

  // ── Eyes (large, dark, glossy) ───────────────────────────────────────────
  const eyeMat   = matGlossy(0x100C0E)
  const glintMat = new THREE.MeshPhysicalMaterial({ color: 0xFFFFFF, roughness: 0, clearcoat: 1 })

  const eyeL  = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), eyeMat)
  const eyeR  = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), eyeMat.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), glintMat)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), glintMat.clone())

  eyeL.position.set(-0.28, 0.75, 0.97);   eyeR.position.set(0.28, 0.75, 0.97)
  glintL.position.set(-0.24, 0.78, 1.00); glintR.position.set(0.32, 0.78, 1.00)
  group.add(eyeL, eyeR, glintL, glintR)

  // ── Nose ──────────────────────────────────────────────────────────────────
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), mat(NOSE_C, 0.60))
  nose.scale.set(1.10, 0.68, 0.52); nose.position.set(0, 0.58, 0.99); group.add(nose)

  // ── Mouth (gentle curve) ─────────────────────────────────────────────────
  const mouthL = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.11, 5), mat(0x8C4433))
  mouthL.rotation.z = Math.PI / 2; mouthL.position.set(-0.055, 0.51, 0.99); group.add(mouthL)
  const mouthR = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.11, 5), mat(0x8C4433))
  mouthR.rotation.z = Math.PI / 2; mouthR.position.set( 0.055, 0.51, 0.99); group.add(mouthR)

  // ── Arms ─────────────────────────────────────────────────────────────────
  // Left arm — raised/waving (matches reference: left arm extended outward+up)
  const armGeo = new THREE.CapsuleGeometry(0.17, 0.44, 4, 8)

  const armL = new THREE.Mesh(armGeo, mat(ORANGE, 0.90))
  armL.rotation.set(0.25, 0, -1.05)          // angled up and out
  armL.position.set(-0.90, 0.24, 0.18); group.add(armL)

  const pawL = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), mat(BLACK, 0.80))
  pawL.scale.set(1, 0.80, 0.90)
  pawL.position.set(-1.32, 0.60, 0.22); group.add(pawL)

  // Right arm — hanging at side, slight forward angle
  const armR = new THREE.Mesh(armGeo.clone(), mat(ORANGE, 0.90))
  armR.rotation.set(0.18, 0, 0.48)
  armR.position.set(0.90, -0.04, 0.20); group.add(armR)

  const pawR = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), mat(BLACK, 0.80))
  pawR.scale.set(1, 0.80, 0.90)
  pawR.position.set(1.24, -0.34, 0.24); group.add(pawR)

  // ── Bushy striped tail ───────────────────────────────────────────────────
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.13, 1.02, 12),
    mat(ORANGE, 0.90),
  )
  tail.position.set(0.18, -0.66, -0.98)
  tail.rotation.set(0.52, 0, 0.20)
  group.add(tail)

  const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(ORANGE))
  tailTip.position.set(0.32, -0.14, -1.52); group.add(tailTip)

  const stripeMat = mat(STRIPE, 0.86)
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.026, 6, 18), stripeMat)
    ring.position.set(0.18, -0.68 + (i - 1.5) * 0.22, -0.98)
    ring.rotation.set(0.52, 0, 0.20)
    group.add(ring)
  }

  const extras: THREE.Object3D[] = [
    earL, earLIn, earR, earRIn,
    patchL, patchR,
    glintL, glintR,
    nose, mouthL, mouthR,
    armL, pawL, armR, pawR,
    legL, legR, footL, footR,
    tail, tailTip,
  ]

  // ── Animation ─────────────────────────────────────────────────────────────
  function apply(cur: AnimTargets, blink: boolean, breathe: number): void {
    body.scale.y    = 0.85 * cur.bodyScaleY + breathe * 0.009
    body.position.y = -0.60 + cur.bodyPosY

    head.position.y = 0.70 + cur.headPosY + breathe * 0.009
    head.rotation.z = cur.headRotZ
    head.rotation.x = cur.headRotX

    // Patches follow head
    patchL.position.y = 0.75 + cur.headPosY + breathe * 0.009
    patchR.position.y = 0.75 + cur.headPosY + breathe * 0.009

    // Ears
    earL.rotation.x   = cur.earLRotX
    earLIn.rotation.x = cur.earLRotX
    earR.rotation.x   = cur.earRRotX
    earRIn.rotation.x = cur.earRRotX

    // Eyes
    const eyeS = blink ? 0.05 : cur.eyeScaleY
    eyeL.scale.y = eyeS; eyeR.scale.y = eyeS

    const exL = clamp(cur.pupilL_X, -0.05, 0.05)
    const eyLY = clamp(cur.pupilL_Y, -0.04, 0.04)
    const exR = clamp(cur.pupilR_X, -0.05, 0.05)
    const eyRY = clamp(cur.pupilR_Y, -0.04, 0.04)

    eyeL.position.x  = -0.28 + exL; eyeL.position.y  = 0.75 + eyLY
    glintL.position.x = -0.24 + exL; glintL.position.y = 0.78 + eyLY
    eyeR.position.x  =  0.28 + exR; eyeR.position.y  = 0.75 + eyRY
    glintR.position.x =  0.32 + exR; glintR.position.y = 0.78 + eyRY

    // Wave arm bobs gently with happy/breathe
    armL.rotation.z = -1.05 + cur.tailRotZ * 0.5 + breathe * 0.04
    pawL.position.y  = 0.60 + cur.tailRotZ * 0.3 + breathe * 0.04

    // Tail wag
    tail.rotation.z  = 0.20 + cur.tailRotZ
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}

export { buildMiBunnyRedPanda as buildPlaceholderRedPanda }
