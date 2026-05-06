import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Mi Bunny shared types, palette, and geometry helpers
// ---------------------------------------------------------------------------

export type MascotId =
  | 'cat' | 'gibbon' | 'rabbit' | 'pelican'
  | 'cow' | 'bear'   | 'koala'  | 'red-panda'

export interface AnimTargets {
  bodyScaleY:   number
  bodyPosY:     number
  headPosY:     number
  headRotZ:     number
  headRotX:     number
  earLRotX:     number
  earRRotX:     number
  eyeScaleY:    number
  pupilL_X:     number
  pupilL_Y:     number
  pupilR_X:     number
  pupilR_Y:     number
  mouthScaleY:  number
  tailRotZ:     number
  tailRotX:     number
}

export const TARGET_NEUTRAL: AnimTargets = {
  bodyScaleY: 1, bodyPosY: 0,
  headPosY: 0, headRotZ: 0, headRotX: 0,
  earLRotX: 0, earRRotX: 0,
  eyeScaleY: 1,
  pupilL_X: 0, pupilL_Y: 0,
  pupilR_X: 0, pupilR_Y: 0,
  mouthScaleY: 1,
  tailRotZ: 0, tailRotX: 0.55,
}

export interface MascotParts {
  group:  THREE.Group
  head:   THREE.Mesh
  body:   THREE.Mesh
  eyeL:   THREE.Mesh
  eyeR:   THREE.Mesh
  extras: THREE.Object3D[]
  apply:  (cur: AnimTargets, blink: boolean, breatheSin: number) => void
}

// ---------------------------------------------------------------------------
// Mi Bunny palette
// ---------------------------------------------------------------------------

export const MI_BASE    = 0xF0EDEA  // warm white body
export const MI_MATTE   = { roughness: 0.92, metalness: 0.0 } as const
export const MI_EYE_COL = 0x1A1218  // near-black
export const MI_EYE_MAT = { roughness: 0.06, metalness: 0.14 } as const
export const MI_GLINT   = 0xFFFFFF
export const MI_GREY    = 0x8E8E93  // placeholder
export const MI_GREY_DK = 0x636366

// Per-mascot accent colours (ear inner, nose, blush)
export const ACCENT: Record<MascotId, number> = {
  cat:       0xFFB5C8,  // soft pink
  gibbon:    0xC8A882,  // warm tan
  rabbit:    0xC5B4F0,  // lavender
  pelican:   0xF0D060,  // gold
  cow:       0xC8C8C8,  // light grey (black patches handled separately)
  bear:      0xD4956A,  // amber
  koala:     0xB4CDE8,  // powder blue
  'red-panda': 0xFF8C6E, // terracotta
}

// ---------------------------------------------------------------------------
// Shared geometry helpers
// ---------------------------------------------------------------------------

export function matteWhite(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: MI_BASE, ...MI_MATTE })
}

export function matteAccent(id: MascotId): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ACCENT[id], roughness: 0.85, metalness: 0 })
}

export function matteGrey(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: MI_GREY, roughness: 0.88, metalness: 0 })
}

export function glossyBlack(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: MI_EYE_COL, ...MI_EYE_MAT })
}

/** One eye assembly: black sphere + white glint highlight.
 *  Returns the main eye Mesh; glint is added to `group` separately.
 */
export function buildEyePair(
  group: THREE.Group,
  xOffset: number,
  y: number,
  z: number,
): { eyeL: THREE.Mesh; eyeR: THREE.Mesh; glintL: THREE.Mesh; glintR: THREE.Mesh } {
  const eyeGeo   = new THREE.SphereGeometry(0.21, 20, 16)
  const glintGeo = new THREE.SphereGeometry(0.054, 8, 8)
  const eyeMat   = glossyBlack()
  const glintMat = new THREE.MeshStandardMaterial({ color: MI_GLINT, roughness: 0 })

  const eyeL  = new THREE.Mesh(eyeGeo.clone(), eyeMat)
  const eyeR  = new THREE.Mesh(eyeGeo.clone(), eyeMat)
  const glintL = new THREE.Mesh(glintGeo.clone(), glintMat)
  const glintR = new THREE.Mesh(glintGeo.clone(), glintMat)

  eyeL.position.set(-xOffset, y, z)
  eyeR.position.set( xOffset, y, z)
  glintL.position.set(-xOffset + 0.07, y + 0.06, z + 0.06)
  glintR.position.set( xOffset + 0.07, y + 0.06, z + 0.06)

  group.add(eyeL, eyeR, glintL, glintR)
  return { eyeL, eyeR, glintL, glintR }
}

/** Mi Bunny smile arc via TubeGeometry. */
export function buildSmile(group: THREE.Group, y: number, z: number): THREE.Mesh {
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.19, y + 0.06, z),
    new THREE.Vector3(0,     y,        z + 0.01),
    new THREE.Vector3( 0.19, y + 0.06, z),
  )
  const geo  = new THREE.TubeGeometry(curve, 12, 0.019, 5, false)
  const mat  = new THREE.MeshStandardMaterial({ color: 0x7A4455, roughness: 0.7 })
  const mesh = new THREE.Mesh(geo, mat)
  group.add(mesh)
  return mesh
}

/** Blush spot (semi-transparent pink oval). */
export function buildBlush(group: THREE.Group, x: number, y: number, z: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.27, 10, 8)
  const mat = new THREE.MeshStandardMaterial({
    color: 0xFFB5C8, roughness: 0.9, metalness: 0,
    transparent: true, opacity: 0.18,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.set(1, 0.48, 0.28)
  mesh.position.set(x, y, z)
  group.add(mesh)
  return mesh
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}
