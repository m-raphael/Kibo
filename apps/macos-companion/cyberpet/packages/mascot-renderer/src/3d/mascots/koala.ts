import * as THREE from 'three'
import {
  type MascotParts, type AnimTargets,
  buildBlush, clamp,
} from './shared.js'

// ---------------------------------------------------------------------------
// Mi Bunny Koala — cool grey, signature oversized fluffy ears, broad nose
// ---------------------------------------------------------------------------

const BODY    = 0x72727A   // cool mid-grey
const EAR_OUT = 0x8A8A92   // slightly lighter ear
const EAR_IN  = 0xC8C8D4   // pale lavender inner ear
const NOSE    = 0x222226   // near-black broad nose
const CREAM   = 0xF0EDE8   // face highlight area
const EYE_COL = 0x18181E

function mat(color: number, roughness = 0.92): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}

export function buildMiBunnyKoala(): MascotParts {
  const group = new THREE.Group()

  // --- Body ---
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 22), mat(BODY))
  body.scale.set(1, 0.80, 0.90)
  body.position.y = -0.68
  body.castShadow = true
  group.add(body)

  // --- Head ---
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.02, 32, 28), mat(BODY))
  head.position.y = 0.65
  head.castShadow = true
  group.add(head)

  // --- Signature oversized fluffy ears ---
  const earGeo = new THREE.SphereGeometry(0.46, 20, 16)

  const earL = new THREE.Mesh(earGeo.clone(), mat(EAR_OUT))
  earL.scale.set(1, 1, 0.50)
  earL.position.set(-0.90, 1.34, 0.02)
  group.add(earL)

  const earLIn = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat(EAR_IN, 0.88))
  earLIn.scale.set(1, 1, 0.32)
  earLIn.position.set(-0.90, 1.34, 0.08)
  group.add(earLIn)

  const earR = new THREE.Mesh(earGeo.clone(), mat(EAR_OUT))
  earR.scale.set(1, 1, 0.50)
  earR.position.set(0.90, 1.34, 0.02)
  group.add(earR)

  const earRIn = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat(EAR_IN, 0.88))
  earRIn.scale.set(1, 1, 0.32)
  earRIn.position.set(0.90, 1.34, 0.08)
  group.add(earRIn)

  // --- Cream face highlight (lower face area) ---
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 18), mat(CREAM, 0.94))
  face.scale.set(0.92, 0.68, 0.42)
  face.position.set(0, 0.50, 0.68)
  group.add(face)

  // --- Broad koala nose ---
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), mat(NOSE, 0.70))
  nose.scale.set(1.40, 0.80, 0.55)
  nose.position.set(0, 0.60, 0.96)
  group.add(nose)

  // --- Eyes — tiny dot style ---
  const eyeGeo   = new THREE.SphereGeometry(0.095, 14, 12)
  const glintGeo = new THREE.SphereGeometry(0.028, 8, 8)
  const eyeMat   = new THREE.MeshStandardMaterial({ color: EYE_COL, roughness: 0.05, metalness: 0.15 })
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })

  const eyeL  = new THREE.Mesh(eyeGeo.clone(), eyeMat)
  const eyeR  = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone())
  const glintL = new THREE.Mesh(glintGeo.clone(), glintMat)
  const glintR = new THREE.Mesh(glintGeo.clone(), glintMat.clone())

  eyeL.position.set(-0.30, 0.74, 0.94)
  eyeR.position.set( 0.30, 0.74, 0.94)
  glintL.position.set(-0.26, 0.77, 0.97)
  glintR.position.set( 0.34, 0.77, 0.97)
  group.add(eyeL, eyeR, glintL, glintR)

  // --- Mouth — thin neutral line ---
  const mouth = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.010, 0.15, 5),
    mat(0x555558, 0.80),
  )
  mouth.rotation.z = Math.PI / 2
  mouth.position.set(0, 0.46, 0.97)
  group.add(mouth)

  // --- Subtle blush ---
  buildBlush(group, -0.50, 0.54, 0.88)
  buildBlush(group,  0.50, 0.54, 0.88)

  const extras: THREE.Object3D[] = [
    earL, earLIn, earR, earRIn,
    glintL, glintR, face, nose, mouth,
  ]

  function apply(cur: AnimTargets, blink: boolean, breathe: number): void {
    body.scale.y    = 0.80 * cur.bodyScaleY + breathe * 0.009
    body.position.y = -0.68 + cur.bodyPosY

    head.position.y = 0.65 + cur.headPosY + breathe * 0.009
    head.rotation.z = cur.headRotZ
    head.rotation.x = cur.headRotX
    face.position.y = 0.50 + cur.headPosY + breathe * 0.009

    const eyeS = blink ? 0.06 : cur.eyeScaleY
    eyeL.scale.y = eyeS
    eyeR.scale.y = eyeS

    const exL = clamp(cur.pupilL_X, -0.04, 0.04)
    const eyL = clamp(cur.pupilL_Y, -0.04, 0.04)
    const exR = clamp(cur.pupilR_X, -0.04, 0.04)
    const eyR = clamp(cur.pupilR_Y, -0.04, 0.04)

    eyeL.position.x  = -0.30 + exL
    eyeL.position.y  =  0.74 + eyL
    glintL.position.x = -0.26 + exL
    glintL.position.y =  0.77 + eyL

    eyeR.position.x  =  0.30 + exR
    eyeR.position.y  =  0.74 + eyR
    glintR.position.x =  0.34 + exR
    glintR.position.y =  0.77 + eyR
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}

// Keep placeholder export name for registry compatibility
export { buildMiBunnyKoala as buildPlaceholderKoala }
