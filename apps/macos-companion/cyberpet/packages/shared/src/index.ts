export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function expLerp(current: number, target: number, alpha: number): number {
  return current + (target - current) * alpha
}

export function mapRange(
  v: number,
  inMin: number, inMax: number,
  outMin: number, outMax: number,
): number {
  const t = (v - inMin) / (inMax - inMin)
  return outMin + t * (outMax - outMin)
}
