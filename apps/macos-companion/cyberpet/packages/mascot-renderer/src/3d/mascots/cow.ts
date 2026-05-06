import * as THREE from 'three'
import { type MascotParts, type AnimTargets, clamp } from './shared.js'

const CREAM = 0xF5F2EE
const PATCH = 0x2A2A2E
function mat(c: number, r = 0.90) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }) }

export function buildPlaceholderCow(): MascotParts {
  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), mat(CREAM))
  body.scale.set(1, 0.82, 0.90); body.position.y = -0.68; group.add(body)

  // Black patch on body
  const patch = new THREE.Mesh(new THREE.SphereGeometry(0.50, 16, 12), mat(PATCH))
  patch.scale.set(0.9, 0.7, 0.38); patch.position.set(0.45, -0.55, 1.05); group.add(patch)

  const head = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 22), mat(CREAM))
  head.position.y = 0.65; group.add(head)

  // Horns
  const hornMat = mat(0xDDCC88)
  const hornL   = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.34, 7), hornMat)
  hornL.position.set(-0.52, 1.36, 0.04); hornL.rotation.z = 0.52; group.add(hornL)
  const hornR   = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.34, 7), hornMat)
  hornR.position.set(0.52, 1.36, 0.04); hornR.rotation.z = -0.52; group.add(hornR)

  // Round ears
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), mat(CREAM))
  earL.scale.set(1, 1, 0.54); earL.position.set(-1.02, 0.78, 0); group.add(earL)
  const earR = earL.clone(); earR.position.set(1.02, 0.78, 0); group.add(earR)

  // Muzzle
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), mat(0xE8C8A0, 0.92))
  muzzle.scale.set(0.88, 0.65, 0.42); muzzle.position.set(0, 0.52, 0.72); group.add(muzzle)

  // Tiny eyes
  const eM = new THREE.MeshStandardMaterial({ color: 0x18181E, roughness: 0.05, metalness: 0.15 })
  const gM = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), eM)
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), eM.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), gM)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 7), gM.clone())
  eyeL.position.set(-0.30, 0.74, 0.94); eyeR.position.set(0.30, 0.74, 0.94)
  glintL.position.set(-0.26, 0.77, 0.97); glintR.position.set(0.34, 0.77, 0.97)
  group.add(eyeL, eyeR, glintL, glintR)

  // Mouth line
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.15, 5), mat(0x888880))
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, 0.48, 0.97); group.add(mouth)

  const extras: THREE.Object3D[] = [hornL, hornR, earL, earR, glintL, glintR, muzzle, patch]

  function apply(cur: AnimTargets, blink: boolean, breathe: number) {
    body.scale.y = 0.82 * cur.bodyScaleY + breathe * 0.008; body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.65 + cur.headPosY + breathe * 0.008; head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX
    const s = blink ? 0.06 : cur.eyeScaleY; eyeL.scale.y = s; eyeR.scale.y = s
    eyeL.position.x = -0.30 + clamp(cur.pupilL_X, -0.04, 0.04)
    eyeR.position.x =  0.30 + clamp(cur.pupilR_X, -0.04, 0.04)
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}
