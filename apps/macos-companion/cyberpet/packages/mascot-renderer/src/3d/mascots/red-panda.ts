import * as THREE from 'three'
import { type MascotParts, type AnimTargets, clamp } from './shared.js'

const BODY  = 0xB8542A   // terracotta red
const CREAM = 0xF2EDE6
function mat(c: number, r = 0.90) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }) }

export function buildPlaceholderRedPanda(): MascotParts {
  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), mat(BODY))
  body.scale.set(1, 0.80, 0.88); body.position.y = -0.68; group.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.96, 28, 22), mat(BODY))
  head.position.y = 0.64; group.add(head)

  // Cream face oval
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.68, 22, 18), mat(CREAM, 0.92))
  face.scale.set(0.90, 0.80, 0.46); face.position.set(0, 0.58, 0.58); group.add(face)

  // Round ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), mat(BODY))
  earL.scale.set(1, 1, 0.55); earL.position.set(-0.76, 1.30, 0.04); group.add(earL)
  const earLIn = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat(CREAM, 0.88))
  earLIn.scale.set(1, 1, 0.35); earLIn.position.set(-0.76, 1.30, 0.08); group.add(earLIn)
  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), mat(BODY))
  earR.scale.set(1, 1, 0.55); earR.position.set(0.76, 1.30, 0.04); group.add(earR)
  const earRIn = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat(CREAM, 0.88))
  earRIn.scale.set(1, 1, 0.35); earRIn.position.set(0.76, 1.30, 0.08); group.add(earRIn)

  // Bushy striped tail
  const tailMat = mat(BODY)
  const stripMat = mat(0x6A3018)
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.10, 0.90, 10), tailMat)
  tail.position.set(0.18, -0.70, -0.98); tail.rotation.set(0.55, 0, 0.22); group.add(tail)
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 16), stripMat)
    ring.position.set(0.18, -0.68 + (i - 1) * 0.22, -0.98); ring.rotation.set(0.55, 0, 0.22); group.add(ring)
  }

  // Tiny eyes
  const eM = new THREE.MeshStandardMaterial({ color: 0x18181E, roughness: 0.05, metalness: 0.15 })
  const gM = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), eM)
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), eM.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), gM)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), gM.clone())
  eyeL.position.set(-0.25, 0.70, 0.94); eyeR.position.set(0.25, 0.70, 0.94)
  glintL.position.set(-0.21, 0.73, 0.97); glintR.position.set(0.29, 0.73, 0.97)
  group.add(eyeL, eyeR, glintL, glintR)

  // Mouth line
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.14, 5), mat(0x885533))
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, 0.50, 0.97); group.add(mouth)

  const extras: THREE.Object3D[] = [earL, earLIn, earR, earRIn, glintL, glintR, face, tail]

  function apply(cur: AnimTargets, blink: boolean, breathe: number) {
    body.scale.y = 0.80 * cur.bodyScaleY + breathe * 0.008; body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.64 + cur.headPosY + breathe * 0.008; head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX
    face.position.y = 0.58 + cur.headPosY + breathe * 0.008
    const s = blink ? 0.06 : cur.eyeScaleY; eyeL.scale.y = s; eyeR.scale.y = s
    eyeL.position.x = -0.25 + clamp(cur.pupilL_X, -0.04, 0.04)
    eyeR.position.x =  0.25 + clamp(cur.pupilR_X, -0.04, 0.04)
    tail.rotation.z = 0.22 + cur.tailRotZ
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}
