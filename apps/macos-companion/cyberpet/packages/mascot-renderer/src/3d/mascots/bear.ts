import * as THREE from 'three'
import { type MascotParts, type AnimTargets, clamp } from './shared.js'

const BODY  = 0x4A3728
const INNER = 0xC8906A
function mat(c: number, r = 0.90) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }) }

export function buildPlaceholderBear(): MascotParts {
  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), mat(BODY))
  body.scale.set(1, 0.82, 0.88); body.position.y = -0.68; group.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 22), mat(BODY))
  head.position.y = 0.65; group.add(head)

  // Round bear ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), mat(BODY))
  earL.scale.set(1, 1, 0.55); earL.position.set(-0.76, 1.34, 0.04); group.add(earL)
  const earLIn = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(INNER, 0.85))
  earLIn.scale.set(1, 1, 0.35); earLIn.position.set(-0.76, 1.34, 0.09); group.add(earLIn)
  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), mat(BODY))
  earR.scale.set(1, 1, 0.55); earR.position.set(0.76, 1.34, 0.04); group.add(earR)
  const earRIn = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(INNER, 0.85))
  earRIn.scale.set(1, 1, 0.35); earRIn.position.set(0.76, 1.34, 0.09); group.add(earRIn)

  // Muzzle oval — cream patch
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), mat(0xD4AA80, 0.92))
  muzzle.scale.set(0.90, 0.70, 0.42); muzzle.position.set(0, 0.52, 0.72); group.add(muzzle)

  // Tiny eyes
  const eM = new THREE.MeshStandardMaterial({ color: 0x18181E, roughness: 0.05, metalness: 0.15 })
  const gM = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), eM)
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), eM.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), gM)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), gM.clone())
  eyeL.position.set(-0.26, 0.74, 0.94); eyeR.position.set(0.26, 0.74, 0.94)
  glintL.position.set(-0.22, 0.77, 0.97); glintR.position.set(0.30, 0.77, 0.97)
  group.add(eyeL, eyeR, glintL, glintR)

  // Nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(0x1A1218, 0.70))
  nose.scale.set(1.1, 0.65, 0.50); nose.position.set(0, 0.56, 0.98); group.add(nose)

  // Mouth line
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.15, 5), mat(0x333333))
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, 0.47, 0.98); group.add(mouth)

  const extras: THREE.Object3D[] = [earL, earLIn, earR, earRIn, glintL, glintR, muzzle]

  function apply(cur: AnimTargets, blink: boolean, breathe: number) {
    body.scale.y = 0.82 * cur.bodyScaleY + breathe * 0.008; body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.65 + cur.headPosY + breathe * 0.008; head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX
    muzzle.position.y = 0.52 + cur.headPosY + breathe * 0.008
    const s = blink ? 0.06 : cur.eyeScaleY; eyeL.scale.y = s; eyeR.scale.y = s
    eyeL.position.x = -0.26 + clamp(cur.pupilL_X, -0.04, 0.04)
    eyeR.position.x =  0.26 + clamp(cur.pupilR_X, -0.04, 0.04)
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}
