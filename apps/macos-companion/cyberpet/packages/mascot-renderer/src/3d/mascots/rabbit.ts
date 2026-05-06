import * as THREE from 'three'
import { type MascotParts, type AnimTargets, clamp } from './shared.js'

const BODY   = 0xEEEBE6
const INNER  = 0xF0C0CC
const GREY   = 0x8E8E93
function mat(c: number, r = 0.90) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 }) }

export function buildPlaceholderRabbit(): MascotParts {
  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 18), mat(BODY))
  body.scale.set(1, 0.80, 0.88); body.position.y = -0.68; group.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.96, 28, 22), mat(BODY))
  head.position.y = 0.64; group.add(head)

  // Long upright capsule ears
  const earGeo = new THREE.CapsuleGeometry(0.11, 0.68, 6, 10)
  const earL = new THREE.Mesh(earGeo, mat(BODY))
  earL.position.set(-0.28, 1.72, 0); earL.rotation.z = -0.07; group.add(earL)
  const earR = new THREE.Mesh(earGeo, mat(BODY))
  earR.position.set(0.28, 1.72, 0); earR.rotation.z = 0.07; group.add(earR)

  // Inner ear
  const earIn = new THREE.CapsuleGeometry(0.055, 0.52, 4, 8)
  const iL = new THREE.Mesh(earIn, mat(INNER, 0.85)); iL.position.set(-0.28, 1.72, 0.05); iL.rotation.z = -0.07; group.add(iL)
  const iR = new THREE.Mesh(earIn, mat(INNER, 0.85)); iR.position.set(0.28, 1.72, 0.05); iR.rotation.z = 0.07; group.add(iR)

  // Tiny dot eyes
  const eM = new THREE.MeshStandardMaterial({ color: 0x18181E, roughness: 0.05, metalness: 0.15 })
  const gM = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), eM)
  const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), eM.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 8), gM)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 8), gM.clone())
  eyeL.position.set(-0.26, 0.70, 0.92); eyeR.position.set(0.26, 0.70, 0.92)
  glintL.position.set(-0.22, 0.73, 0.95); glintR.position.set(0.30, 0.73, 0.95)
  group.add(eyeL, eyeR, glintL, glintR)

  // Tiny pink nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 7), mat(0xFFAABB, 0.80))
  nose.scale.set(1, 0.6, 0.5); nose.position.set(0, 0.56, 0.97); group.add(nose)

  // Straight mouth line
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.16, 5), mat(GREY))
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, 0.48, 0.97); group.add(mouth)

  const extras: THREE.Object3D[] = [earL, earR, iL, iR, glintL, glintR]

  function apply(cur: AnimTargets, blink: boolean, breathe: number) {
    body.scale.y = 0.80 * cur.bodyScaleY + breathe * 0.008; body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.64 + cur.headPosY + breathe * 0.008; head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX
    const s = blink ? 0.06 : cur.eyeScaleY; eyeL.scale.y = s; eyeR.scale.y = s
    eyeL.position.x = -0.26 + clamp(cur.pupilL_X, -0.04, 0.04)
    eyeR.position.x =  0.26 + clamp(cur.pupilR_X, -0.04, 0.04)
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}
