import * as THREE from 'three'
import {
  type MascotParts, type AnimTargets,
  matteWhite, matteAccent,
  buildBlush, clamp,
} from './shared.js'

// ---------------------------------------------------------------------------
// Mi Bunny Cat — warm white body, pink accent ears, tiny dot eyes, line mouth
// Matches reference style: smooth matte, minimal face, clean silhouette
// ---------------------------------------------------------------------------

const EYE_BLACK = 0x18181E
const WHITE     = 0xF5F3F0

function mat(color: number, roughness = 0.92): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
}

export function buildMiBunnyCat(): MascotParts {
  const group = new THREE.Group()

  // --- Body ---
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 22), matteWhite())
  body.scale.set(1, 0.80, 0.90)
  body.position.y = -0.68
  body.castShadow = true
  group.add(body)

  // --- Head ---
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.02, 32, 28), matteWhite())
  head.position.y = 0.66
  head.castShadow = true
  group.add(head)

  // --- Ears — triangular cat ears ---
  const earMat   = matteWhite()
  const innerMat = matteAccent('cat')
  const earGeo   = new THREE.ConeGeometry(0.28, 0.50, 7)

  const earL = new THREE.Mesh(earGeo.clone(), earMat)
  earL.position.set(-0.58, 1.42, 0.06)
  earL.rotation.set(-0.10, 0, -0.14)
  group.add(earL)

  const earLIn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 7), innerMat)
  earLIn.position.set(-0.58, 1.42, 0.10)
  earLIn.rotation.set(-0.10, 0, -0.14)
  group.add(earLIn)

  const earR = new THREE.Mesh(earGeo.clone(), earMat)
  earR.position.set(0.58, 1.42, 0.06)
  earR.rotation.set(-0.10, 0, 0.14)
  group.add(earR)

  const earRIn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 7), innerMat)
  earRIn.position.set(0.58, 1.42, 0.10)
  earRIn.rotation.set(-0.10, 0, 0.14)
  group.add(earRIn)

  // --- Eyes — tiny dot style matching reference ---
  const eyeGeo   = new THREE.SphereGeometry(0.10, 14, 12)
  const glintGeo = new THREE.SphereGeometry(0.030, 8, 8)
  const eyeMat   = new THREE.MeshStandardMaterial({ color: EYE_BLACK, roughness: 0.05, metalness: 0.15 })
  const glintMat = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0 })

  const eyeL  = new THREE.Mesh(eyeGeo.clone(), eyeMat)
  const eyeR  = new THREE.Mesh(eyeGeo.clone(), eyeMat)
  const glintL = new THREE.Mesh(glintGeo.clone(), glintMat)
  const glintR = new THREE.Mesh(glintGeo.clone(), glintMat)

  eyeL.position.set(-0.28, 0.74, 0.96)
  eyeR.position.set( 0.28, 0.74, 0.96)
  glintL.position.set(-0.24, 0.77, 0.99)
  glintR.position.set( 0.32, 0.77, 0.99)

  group.add(eyeL, eyeR, glintL, glintR)

  // --- Nose — tiny pink oval ---
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    mat(0xFF9BB5, 0.75),
  )
  nose.scale.set(0.85, 0.60, 0.48)
  nose.position.set(0, 0.58, 1.00)
  group.add(nose)

  // --- Mouth — straight thin line, neutral (cat has faint w-shape hint) ---
  const mouthMat = mat(0x996677, 0.80)
  const mouthL   = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.12, 5), mouthMat)
  mouthL.rotation.z = Math.PI / 2
  mouthL.position.set(-0.07, 0.50, 1.00)
  group.add(mouthL)

  const mouthR = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.12, 5), mouthMat.clone())
  mouthR.rotation.z = Math.PI / 2
  mouthR.position.set(0.07, 0.50, 1.00)
  group.add(mouthR)

  // --- Blush spots ---
  buildBlush(group, -0.55, 0.50, 0.90)
  buildBlush(group,  0.55, 0.50, 0.90)

  // --- Tail ---
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 0.65, 8), matteWhite())
  tail.position.set(0, -0.70, -0.98)
  tail.rotation.x = 0.55
  group.add(tail)

  const tipMat = mat(0xFFB5C8, 0.85)
  const tip    = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), tipMat)
  tip.scale.set(0.9, 0.9, 0.7)
  tip.position.set(0, -0.30, -1.48)
  group.add(tip)

  const extras: THREE.Object3D[] = [
    earL, earLIn, earR, earRIn,
    glintL, glintR,
    nose, mouthL, mouthR, tail,
  ]

  function apply(cur: AnimTargets, blink: boolean, breathe: number): void {
    body.scale.y    = 0.80 * cur.bodyScaleY + breathe * 0.010
    body.position.y = -0.68 + cur.bodyPosY

    head.position.y = 0.66 + cur.headPosY + breathe * 0.010
    head.rotation.z = cur.headRotZ
    head.rotation.x = cur.headRotX

    earL.rotation.x   = -0.10 + cur.earLRotX
    earLIn.rotation.x = -0.10 + cur.earLRotX
    earR.rotation.x   = -0.10 + cur.earRRotX
    earRIn.rotation.x = -0.10 + cur.earRRotX

    const eyeS = blink ? 0.06 : cur.eyeScaleY
    eyeL.scale.y = eyeS
    eyeR.scale.y = eyeS

    const exL = clamp(cur.pupilL_X, -0.05, 0.05)
    const eyL = clamp(cur.pupilL_Y, -0.05, 0.05)
    const exR = clamp(cur.pupilR_X, -0.05, 0.05)
    const eyR = clamp(cur.pupilR_Y, -0.05, 0.05)

    eyeL.position.x  = -0.28 + exL
    eyeL.position.y  =  0.74 + eyL
    glintL.position.x = -0.24 + exL
    glintL.position.y =  0.77 + eyL

    eyeR.position.x  =  0.28 + exR
    eyeR.position.y  =  0.74 + eyR
    glintR.position.x =  0.32 + exR
    glintR.position.y =  0.77 + eyR

    tail.rotation.z = cur.tailRotZ + breathe * 0.006
    tail.rotation.x = cur.tailRotX
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}
