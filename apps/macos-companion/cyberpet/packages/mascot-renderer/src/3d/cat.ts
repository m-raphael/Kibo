import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Cat — stylised 3D cat built from Three.js primitives
// ---------------------------------------------------------------------------

const FUR        = 0xD4783B
const FUR_DARK   = 0xB8622A
const CREAM      = 0xF5E6D3
const WHITE      = 0xFFFFFF
const PUPIL      = 0x1A1A1A
const NOSE_PINK  = 0xFF9999
const INNER_EAR  = 0xE8A0A0
const WHISKER    = 0xCCCCCC

export interface CatParts {
  group:   THREE.Group
  body:    THREE.Mesh
  head:    THREE.Mesh
  earL:    THREE.Mesh
  earR:    THREE.Mesh
  earLInner: THREE.Mesh
  earRInner: THREE.Mesh
  scleraL: THREE.Mesh
  scleraR: THREE.Mesh
  pupilL:  THREE.Mesh
  pupilR:  THREE.Mesh
  nose:    THREE.Mesh
  mouth:   THREE.Mesh
  tail:    THREE.Mesh
}

export function buildCat(): CatParts {
  const group = new THREE.Group()

  // --- Body ---
  const bodyGeo = new THREE.SphereGeometry(1.2, 24, 20)
  const bodyMat = new THREE.MeshStandardMaterial({ color: FUR, roughness: 0.7 })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.scale.set(1, 0.82, 0.9)
  body.position.y = -0.7
  body.castShadow = true
  group.add(body)

  // --- Belly patch ---
  const bellyGeo = new THREE.SphereGeometry(0.75, 16, 12)
  const bellyMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.8 })
  const belly = new THREE.Mesh(bellyGeo, bellyMat)
  belly.scale.set(1.1, 0.7, 0.5)
  belly.position.set(0, -0.55, 1.15)
  group.add(belly)

  // --- Head ---
  const headGeo = new THREE.SphereGeometry(1.0, 28, 24)
  const headMat = new THREE.MeshStandardMaterial({ color: FUR, roughness: 0.65 })
  const head = new THREE.Mesh(headGeo, headMat)
  head.position.y = 0.75
  head.castShadow = true
  group.add(head)

  // --- Chin/cheek fluff ---
  const cheekMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.8 })
  const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), cheekMat)
  cheekL.scale.set(1, 0.6, 0.5)
  cheekL.position.set(-0.55, 0.35, 0.85)
  group.add(cheekL)
  const cheekR = cheekL.clone()
  cheekR.position.set(0.55, 0.35, 0.85)
  group.add(cheekR)

  // --- Ears ---
  const earMat = new THREE.MeshStandardMaterial({ color: FUR_DARK, roughness: 0.7 })
  const earInnerMat = new THREE.MeshStandardMaterial({ color: INNER_EAR, roughness: 0.8 })

  const earGeo = new THREE.ConeGeometry(0.38, 0.5, 8)

  const earL = new THREE.Mesh(earGeo.clone(), earMat)
  earL.position.set(-0.62, 1.45, 0.03)
  earL.rotation.z = -0.15
  earL.rotation.x = -0.18
  group.add(earL)

  const earLInner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8), earInnerMat)
  earLInner.position.set(-0.62, 1.45, 0.03)
  earLInner.rotation.z = -0.15
  earLInner.rotation.x = -0.18
  group.add(earLInner)

  const earR = new THREE.Mesh(earGeo.clone(), earMat)
  earR.position.set(0.62, 1.45, 0.03)
  earR.rotation.z = 0.15
  earR.rotation.x = -0.18
  group.add(earR)

  const earRInner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8), earInnerMat)
  earRInner.position.set(0.62, 1.45, 0.03)
  earRInner.rotation.z = 0.15
  earRInner.rotation.x = -0.18
  group.add(earRInner)

  // --- Eyes ---
  const scleraMat = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.2 })
  const pupilMat  = new THREE.MeshStandardMaterial({ color: PUPIL, roughness: 0.1 })

  const scleraGeo = new THREE.SphereGeometry(0.30, 20, 18)

  const scleraL = new THREE.Mesh(scleraGeo.clone(), scleraMat)
  scleraL.position.set(-0.35, 0.82, 0.88)
  scleraL.scale.set(1.1, 1, 0.65)
  group.add(scleraL)

  const scleraR = new THREE.Mesh(scleraGeo.clone(), scleraMat)
  scleraR.position.set(0.35, 0.82, 0.88)
  scleraR.scale.set(1.1, 1, 0.65)
  group.add(scleraR)

  const pupilGeo = new THREE.SphereGeometry(0.17, 16, 14)

  const pupilL = new THREE.Mesh(pupilGeo.clone(), pupilMat)
  pupilL.position.set(-0.35, 0.82, 1.02)
  pupilL.scale.set(0.9, 0.85, 0.4)
  group.add(pupilL)

  const pupilR = new THREE.Mesh(pupilGeo.clone(), pupilMat)
  pupilR.position.set(0.35, 0.82, 1.02)
  pupilR.scale.set(0.9, 0.85, 0.4)
  group.add(pupilR)

  // Eye highlights (small white glints)
  const glintMat = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0 })
  const glintGeo = new THREE.SphereGeometry(0.05, 8, 8)
  const glintL = new THREE.Mesh(glintGeo.clone(), glintMat)
  glintL.position.set(-0.30, 0.87, 1.06)
  group.add(glintL)
  const glintR = new THREE.Mesh(glintGeo.clone(), glintMat)
  glintR.position.set(0.40, 0.87, 1.06)
  group.add(glintR)

  // --- Nose ---
  const noseMat = new THREE.MeshStandardMaterial({ color: NOSE_PINK, roughness: 0.6 })
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), noseMat)
  nose.scale.set(0.8, 0.7, 0.5)
  nose.position.set(0, 0.58, 1.02)
  group.add(nose)

  // --- Mouth (small pink sphere that scales Y for open/close) ---
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0xCC7777, roughness: 0.7 })
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mouthMat)
  mouth.scale.set(1.2, 0.3, 0.4)
  mouth.position.set(0, 0.42, 1.04)
  group.add(mouth)

  // --- Whiskers ---
  const whiskerMat = new THREE.LineBasicMaterial({ color: WHISKER, transparent: true, opacity: 0.5 })
  const whiskerPoints = (sx: number, sz: number, yOff: number): THREE.Vector3[] => {
    const dir = sx > 0 ? 1 : -1
    return [
      new THREE.Vector3(sx, yOff, sz),
      new THREE.Vector3(sx + dir * 0.55, yOff + 0.06, sz - 0.06),
      new THREE.Vector3(sx + dir * 0.5, yOff + 0.02, sz + 0.02),
      new THREE.Vector3(sx + dir * 0.45, yOff - 0.02, sz + 0.08),
      new THREE.Vector3(sx + dir * 0.50, yOff - 0.06, sz - 0.04),
    ]
  }
  const addWhiskers = (x: number) => {
    for (let i = -1; i <= 1; i++) {
      const pts = whiskerPoints(x, 0.95, 0.55 + i * 0.10)
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const line = new THREE.Line(geo, whiskerMat)
      group.add(line)
    }
  }
  addWhiskers(-0.45)
  addWhiskers(0.45)

  // --- Tail ---
  const tailMat = new THREE.MeshStandardMaterial({ color: FUR_DARK, roughness: 0.7 })
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 0.8, 8), tailMat)
  tail.position.set(0, -0.6, -1.0)
  tail.rotation.x = 0.6
  group.add(tail)

  // Tail tip (white)
  const tipMat = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.7 })
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), tipMat)
  tip.scale.set(0.9, 0.9, 0.7)
  tip.position.set(0, -0.3, -1.55)
  group.add(tip)

  return {
    group, body, head,
    earL, earR, earLInner, earRInner,
    scleraL, scleraR, pupilL, pupilR,
    nose, mouth, tail,
  }
}
