import * as THREE from 'three'
import { type MascotParts, type AnimTargets, clamp } from './shared.js'

// Pelican ref = dark plush/felt style: near-black body, white chest, orange beak & feet
const DARK   = 0x222228
const CHEST  = 0xF0EDEA
const ORANGE = 0xE8760A
function mat(c: number, r = 0.90) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }) }

export function buildPlaceholderPelican(): MascotParts {
  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), mat(DARK))
  body.scale.set(1, 0.84, 0.90); body.position.y = -0.68; group.add(body)

  // White chest patch
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), mat(CHEST, 0.92))
  chest.scale.set(0.85, 0.80, 0.45); chest.position.set(0, -0.42, 1.08); group.add(chest)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.88, 26, 20), mat(DARK))
  head.position.y = 0.68; group.add(head)

  // Orange beak — wide wedge shape
  const beakTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.18, 0.52, 8), mat(ORANGE))
  beakTop.position.set(0, 0.56, 0.98); beakTop.rotation.x = 1.55; group.add(beakTop)

  // Throat pouch
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat(ORANGE))
  pouch.scale.set(0.75, 1.50, 0.58); pouch.position.set(0, 0.26, 0.90); group.add(pouch)

  // Wide eyes (per reference: large white sclera + black pupil)
  const scleraMat = new THREE.MeshStandardMaterial({ color: 0xF5F5F5, roughness: 0.25, metalness: 0 })
  const eM = new THREE.MeshStandardMaterial({ color: 0x18181E, roughness: 0.05, metalness: 0.15 })
  const gM = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })

  const scleraL = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), scleraMat)
  const scleraR = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), scleraMat.clone())
  scleraL.position.set(-0.32, 0.76, 0.76); scleraR.position.set(0.32, 0.76, 0.76)
  group.add(scleraL, scleraR)

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), eM)
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.10, 12, 10), eM.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.030, 7, 7), gM)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.030, 7, 7), gM.clone())
  eyeL.position.set(-0.32, 0.76, 0.87); eyeR.position.set(0.32, 0.76, 0.87)
  glintL.position.set(-0.27, 0.79, 0.90); glintR.position.set(0.37, 0.79, 0.90)
  group.add(eyeL, eyeR, glintL, glintR)

  // Orange feet (small)
  const footL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(ORANGE))
  footL.scale.set(1.4, 0.45, 0.9); footL.position.set(-0.28, -1.42, 0.30); group.add(footL)
  const footR = footL.clone(); footR.position.set(0.28, -1.42, 0.30); group.add(footR)

  const extras: THREE.Object3D[] = [scleraL, scleraR, glintL, glintR, beakTop, pouch, chest, footL, footR]

  function apply(cur: AnimTargets, blink: boolean, breathe: number) {
    body.scale.y = 0.84 * cur.bodyScaleY + breathe * 0.008; body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.68 + cur.headPosY + breathe * 0.008; head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX
    const s = blink ? 0.06 : cur.eyeScaleY
    eyeL.scale.y = s; eyeR.scale.y = s
    scleraL.scale.y = s; scleraR.scale.y = s
    eyeL.position.x = -0.32 + clamp(cur.pupilL_X, -0.05, 0.05)
    eyeR.position.x =  0.32 + clamp(cur.pupilR_X, -0.05, 0.05)
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}
