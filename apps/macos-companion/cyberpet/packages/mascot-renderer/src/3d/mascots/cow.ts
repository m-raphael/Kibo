import * as THREE from 'three'
import { type MascotParts, type AnimTargets, buildBlush, clamp } from './shared.js'

// Mi Bunny Cow — white with black patch, peach muzzle, warm brown horns, pink ears
const CREAM = 0xF5F2EE
const PATCH = 0x1A1A1E
function mat(c: number, r = 0.90) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }) }

export function buildMiBunnyCow(): MascotParts {
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

  // Round ears with pink inner
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), mat(CREAM))
  earL.scale.set(1, 1, 0.52); earL.position.set(-1.04, 0.78, 0); group.add(earL)
  const earLIn = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xF0B8B0, 0.86))
  earLIn.scale.set(1, 1, 0.34); earLIn.position.set(-1.04, 0.78, 0.07); group.add(earLIn)
  const earR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), mat(CREAM))
  earR.scale.set(1, 1, 0.52); earR.position.set(1.04, 0.78, 0); group.add(earR)
  const earRIn = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xF0B8B0, 0.86))
  earRIn.scale.set(1, 1, 0.34); earRIn.position.set(1.04, 0.78, 0.07); group.add(earRIn)

  // Peach-salmon muzzle (larger, matches reference)
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), mat(0xF0B898, 0.90))
  muzzle.scale.set(0.88, 0.65, 0.42); muzzle.position.set(0, 0.52, 0.72); group.add(muzzle)

  // Nostrils
  const nostrilMat = mat(0xD08080, 0.80)
  const nL = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), nostrilMat)
  nL.scale.set(1, 0.60, 0.50); nL.position.set(-0.12, 0.50, 0.96); group.add(nL)
  const nR = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), nostrilMat)
  nR.scale.set(1, 0.60, 0.50); nR.position.set(0.12, 0.50, 0.96); group.add(nR)

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

  buildBlush(group, -0.52, 0.54, 0.88)
  buildBlush(group,  0.52, 0.54, 0.88)

  const extras: THREE.Object3D[] = [
    hornL, hornR, earL, earLIn, earR, earRIn,
    glintL, glintR, muzzle, patch,
  ]

  function apply(cur: AnimTargets, blink: boolean, breathe: number): void {
    body.scale.y    = 0.82 * cur.bodyScaleY + breathe * 0.008
    body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.65 + cur.headPosY + breathe * 0.008
    head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX
    muzzle.position.y = 0.52 + cur.headPosY + breathe * 0.008

    const eyeS = blink ? 0.06 : cur.eyeScaleY
    eyeL.scale.y = eyeS; eyeR.scale.y = eyeS

    const exL = clamp(cur.pupilL_X, -0.04, 0.04)
    const exR = clamp(cur.pupilR_X, -0.04, 0.04)
    eyeL.position.x = -0.30 + exL; glintL.position.x = -0.26 + exL
    eyeR.position.x  =  0.30 + exR; glintR.position.x  =  0.34 + exR
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}

export { buildMiBunnyCow as buildPlaceholderCow }
