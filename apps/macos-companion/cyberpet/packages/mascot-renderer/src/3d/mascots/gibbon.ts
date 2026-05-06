import * as THREE from 'three'
import {
  type MascotParts, type AnimTargets, clamp,
} from './shared.js'

// ---------------------------------------------------------------------------
// Mi Bunny Gibbon — matches reference image exactly
// Dark charcoal body, white oval face, tiny dot eyes, flat pink ears
// ---------------------------------------------------------------------------

const CHARCOAL  = 0x3C3D44   // dark blue-grey body
const FACE_WHITE = 0xF2F0ED  // cream-white face oval
const PINK_EAR  = 0xE8A0A8   // soft pink ear inner
const EYE_BLACK = 0x18181E
const WHITE     = 0xF5F3F0

function mat(color: number, roughness = 0.90): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}

export function buildMiBunnyGibbon(): MascotParts {
  const group = new THREE.Group()

  // --- Body ---
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 28, 22),
    mat(CHARCOAL),
  )
  body.scale.set(1, 0.82, 0.88)
  body.position.y = -0.68
  body.castShadow = true
  group.add(body)

  // --- Head ---
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(1.02, 32, 28),
    mat(CHARCOAL),
  )
  head.position.y = 0.66
  head.castShadow = true
  group.add(head)

  // --- White face oval — prominent, sits in front of head ---
  const faceOval = new THREE.Mesh(
    new THREE.SphereGeometry(0.76, 26, 20),
    mat(FACE_WHITE, 0.92),
  )
  faceOval.scale.set(0.88, 0.82, 0.44)
  faceOval.position.set(0, 0.58, 0.62)
  group.add(faceOval)

  // --- Ears — flat pink button discs on sides ---
  const earGeo = new THREE.SphereGeometry(0.26, 16, 14)

  const earL = new THREE.Mesh(earGeo.clone(), mat(CHARCOAL))
  earL.scale.set(1, 1, 0.38)
  earL.position.set(-1.04, 0.76, 0.02)
  group.add(earL)

  const earLIn = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat(PINK_EAR, 0.85))
  earLIn.scale.set(1, 1, 0.28)
  earLIn.position.set(-1.04, 0.76, 0.07)
  group.add(earLIn)

  const earR = new THREE.Mesh(earGeo.clone(), mat(CHARCOAL))
  earR.scale.set(1, 1, 0.38)
  earR.position.set(1.04, 0.76, 0.02)
  group.add(earR)

  const earRIn = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat(PINK_EAR, 0.85))
  earRIn.scale.set(1, 1, 0.28)
  earRIn.position.set(1.04, 0.76, 0.07)
  group.add(earRIn)

  // --- Eyes — very small black dots, close together on face oval ---
  const eyeGeo   = new THREE.SphereGeometry(0.095, 14, 12)
  const glintGeo = new THREE.SphereGeometry(0.028, 8, 8)
  const eyeMat   = new THREE.MeshStandardMaterial({ color: EYE_BLACK, roughness: 0.05, metalness: 0.15 })
  const glintMat = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0 })

  const eyeL  = new THREE.Mesh(eyeGeo.clone(), eyeMat)
  const eyeR  = new THREE.Mesh(eyeGeo.clone(), eyeMat)
  const glintL = new THREE.Mesh(glintGeo.clone(), glintMat)
  const glintR = new THREE.Mesh(glintGeo.clone(), glintMat)

  eyeL.position.set(-0.22, 0.70, 0.96)
  eyeR.position.set( 0.22, 0.70, 0.96)
  glintL.position.set(-0.18, 0.73, 0.99)
  glintR.position.set( 0.26, 0.73, 0.99)

  group.add(eyeL, eyeR, glintL, glintR)

  // --- Mouth — thin straight horizontal line (no smile, neutral) ---
  const mouthGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6)
  const mouth    = new THREE.Mesh(mouthGeo, mat(0x888890, 0.8))
  mouth.rotation.z = Math.PI / 2
  mouth.position.set(0, 0.50, 0.97)
  group.add(mouth)

  // --- Arms — dark grey, resting on surface ---
  const armMat = mat(CHARCOAL)
  const armGeo = new THREE.CapsuleGeometry(0.13, 0.60, 6, 10)

  const armL = new THREE.Mesh(armGeo, armMat.clone())
  armL.position.set(-1.10, -0.42, 0.10)
  armL.rotation.z = 0.38
  armL.rotation.x = 0.15
  group.add(armL)

  const armR = new THREE.Mesh(armGeo, armMat.clone())
  armR.position.set(1.10, -0.42, 0.10)
  armR.rotation.z = -0.38
  armR.rotation.x = 0.15
  group.add(armR)

  // --- Hands — white rounded blobs at end of arms ---
  const handMat = mat(WHITE, 0.88)
  const handGeo = new THREE.SphereGeometry(0.17, 12, 10)

  const handL = new THREE.Mesh(handGeo.clone(), handMat)
  handL.scale.set(1.2, 0.7, 0.8)
  handL.position.set(-1.48, -0.76, 0.18)
  group.add(handL)

  const handR = new THREE.Mesh(handGeo.clone(), handMat)
  handR.scale.set(1.2, 0.7, 0.8)
  handR.position.set(1.48, -0.76, 0.18)
  group.add(handR)

  // Extras for animation access
  const extras: THREE.Object3D[] = [
    earL, earLIn, earR, earRIn,
    glintL, glintR,
    faceOval, mouth,
    armL, armR, handL, handR,
  ]

  // ---------------------------------------------------------------------------
  // Apply
  // ---------------------------------------------------------------------------
  function apply(cur: AnimTargets, blink: boolean, breathe: number): void {
    body.scale.y    = 0.82 * cur.bodyScaleY + breathe * 0.009
    body.position.y = -0.68 + cur.bodyPosY

    const headY = 0.66 + cur.headPosY + breathe * 0.009
    head.position.y     = headY
    head.rotation.z     = cur.headRotZ
    head.rotation.x     = cur.headRotX
    faceOval.position.y = 0.58 + cur.headPosY + breathe * 0.009
    faceOval.rotation.z = cur.headRotZ
    faceOval.rotation.x = cur.headRotX

    const eyeS = blink ? 0.06 : cur.eyeScaleY
    eyeL.scale.y = eyeS
    eyeR.scale.y = eyeS

    const exL = clamp(cur.pupilL_X, -0.04, 0.04)
    const eyL = clamp(cur.pupilL_Y, -0.04, 0.04)
    const exR = clamp(cur.pupilR_X, -0.04, 0.04)
    const eyR = clamp(cur.pupilR_Y, -0.04, 0.04)

    eyeL.position.x  = -0.22 + exL
    eyeL.position.y  =  0.70 + eyL
    glintL.position.x = -0.18 + exL
    glintL.position.y =  0.73 + eyL

    eyeR.position.x  =  0.22 + exR
    eyeR.position.y  =  0.70 + eyR
    glintR.position.x =  0.26 + exR
    glintR.position.y =  0.73 + eyR

    // Mouth scale on happy/speaking (stays mostly neutral line)
    mouth.scale.x = cur.mouthScaleY
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}
