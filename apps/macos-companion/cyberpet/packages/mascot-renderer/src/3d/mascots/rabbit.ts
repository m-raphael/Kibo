import * as THREE from 'three'
import { type MascotParts, type AnimTargets, buildBlush, clamp } from './shared.js'

// Mi Bunny Rabbit — warm white body, tall upright ears, pink inner, soft blush
const BODY  = 0xF2EEE8
const INNER = 0xF0B0BC
const GREY  = 0x8E8E93

function mat(c: number, r = 0.92): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 })
}

export function buildMiBunnyRabbit(): MascotParts {
  const group = new THREE.Group()

  const body = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 22), mat(BODY))
  body.scale.set(1, 0.80, 0.88)
  body.position.y = -0.68
  group.add(body)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.96, 32, 26), mat(BODY))
  head.position.y = 0.64
  group.add(head)

  // Signature long upright capsule ears
  const earGeo   = new THREE.CapsuleGeometry(0.12, 0.72, 6, 10)
  const earInGeo = new THREE.CapsuleGeometry(0.057, 0.56, 4, 8)

  const earL = new THREE.Mesh(earGeo, mat(BODY))
  earL.position.set(-0.30, 1.76, 0); earL.rotation.z = -0.06; group.add(earL)
  const earR = new THREE.Mesh(earGeo, mat(BODY))
  earR.position.set(0.30, 1.76, 0); earR.rotation.z = 0.06; group.add(earR)

  const earLIn = new THREE.Mesh(earInGeo, mat(INNER, 0.86))
  earLIn.position.set(-0.30, 1.76, 0.055); earLIn.rotation.z = -0.06; group.add(earLIn)
  const earRIn = new THREE.Mesh(earInGeo, mat(INNER, 0.86))
  earRIn.position.set(0.30, 1.76, 0.055); earRIn.rotation.z = 0.06; group.add(earRIn)

  // Tiny dot eyes
  const eyeMat   = new THREE.MeshStandardMaterial({ color: 0x18181E, roughness: 0.05, metalness: 0.15 })
  const glintMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0 })

  const eyeL  = new THREE.Mesh(new THREE.SphereGeometry(0.092, 14, 12), eyeMat)
  const eyeR  = new THREE.Mesh(new THREE.SphereGeometry(0.092, 14, 12), eyeMat.clone())
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 8), glintMat)
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.027, 8, 8), glintMat.clone())
  eyeL.position.set(-0.26, 0.70, 0.92); eyeR.position.set(0.26, 0.70, 0.92)
  glintL.position.set(-0.22, 0.73, 0.95); glintR.position.set(0.30, 0.73, 0.95)
  group.add(eyeL, eyeR, glintL, glintR)

  // Tiny pink nose
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 7), mat(0xFFAABB, 0.80))
  nose.scale.set(1, 0.60, 0.50); nose.position.set(0, 0.57, 0.97); group.add(nose)

  // Straight line mouth
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.15, 5), mat(GREY, 0.85))
  mouth.rotation.z = Math.PI / 2; mouth.position.set(0, 0.49, 0.97); group.add(mouth)

  buildBlush(group, -0.46, 0.56, 0.88)
  buildBlush(group,  0.46, 0.56, 0.88)

  const extras: THREE.Object3D[] = [earL, earR, earLIn, earRIn, glintL, glintR, nose, mouth]

  function apply(cur: AnimTargets, blink: boolean, breathe: number): void {
    body.scale.y    = 0.80 * cur.bodyScaleY + breathe * 0.008
    body.position.y = -0.68 + cur.bodyPosY
    head.position.y = 0.64 + cur.headPosY + breathe * 0.008
    head.rotation.z = cur.headRotZ; head.rotation.x = cur.headRotX

    const eyeS = blink ? 0.06 : cur.eyeScaleY
    eyeL.scale.y = eyeS; eyeR.scale.y = eyeS

    const exL = clamp(cur.pupilL_X, -0.04, 0.04)
    const eyLy = clamp(cur.pupilL_Y, -0.04, 0.04)
    const exR = clamp(cur.pupilR_X, -0.04, 0.04)
    const eyRy = clamp(cur.pupilR_Y, -0.04, 0.04)
    eyeL.position.x = -0.26 + exL; eyeL.position.y = 0.70 + eyLy
    glintL.position.x = -0.22 + exL; glintL.position.y = 0.73 + eyLy
    eyeR.position.x  =  0.26 + exR; eyeR.position.y  = 0.70 + eyRy
    glintR.position.x =  0.30 + exR; glintR.position.y = 0.73 + eyRy
  }

  return { group, head, body, eyeL, eyeR, extras, apply }
}

export { buildMiBunnyRabbit as buildPlaceholderRabbit }
