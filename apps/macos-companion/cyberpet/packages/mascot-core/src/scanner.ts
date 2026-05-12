import type { TrackerFrame, MascotState, FaceShape, EyeShape, SkinTone } from './index.js'
import type { FacialProfile } from './profile.js'

// ---------------------------------------------------------------------------
// Scan accumulator — collects tracker frame data over time and builds a
// FacialProfile once enough data has been gathered.
// ---------------------------------------------------------------------------

export const SCAN_DURATION_MS  = 30_000   // wall-clock scan window
export const MIN_FACE_FRAMES   = 300      // minimum face-detected frames

const STATE_KEYS: MascotState[] = [
  'idle', 'attentive', 'listening', 'speaking', 'happy', 'tired',
]

export class ScanAccumulator {
  private smears = new SmearBuffer(0.985)

  private _faceFrames   = 0
  private _totalFrames  = 0
  private _startTime    = performance.now()
  private _stateCounts: Record<MascotState, number> = {
    idle: 0, attentive: 0, listening: 0,
    speaking: 0, happy: 0, tired: 0,
  }
  private _running = true

  // Track blinks crossing threshold
  private _prevBlink     = 0
  private _blinkEvents   = 0
  private _blinkAccum    = new SmearBuffer(0.98)
  private _smileAccum    = new SmearBuffer(0.99)
  private _mouthAccum    = new SmearBuffer(0.99)
  private _movementAccum = new SmearBuffer(0.97)

  // Appearance — mode (most frequent value) across scan frames
  private _faceShapeVotes: Partial<Record<FaceShape, number>> = {}
  private _eyeShapeVotes:  Partial<Record<EyeShape,  number>> = {}
  private _skinToneVotes:  Partial<Record<SkinTone,  number>> = {}
  private _geometryKeys:   string[] = []

  // -----------------------------------------------------------------------
  // Push one frame — call from the tracker listener (~30 fps)
  // -----------------------------------------------------------------------

  push(frame: TrackerFrame, state: MascotState): void {
    if (!this._running) return

    this._totalFrames++
    this._stateCounts[state]++

    if (frame.face_detected) {
      this._faceFrames++

      // Exponential-smoothed averages
      this._smileAccum.push(frame.smile)
      this._mouthAccum.push(frame.mouth_open)
      this._movementAccum.push(
        Math.abs(frame.head_pose.yaw) + Math.abs(frame.head_pose.pitch),
      )

      // Blink depth (only when actually blinking)
      if (frame.blink > 0.5) {
        this._blinkAccum.push(frame.blink)
      }

      // Count blink events (crossing 0.5 threshold)
      if (this._prevBlink <= 0.5 && frame.blink > 0.5) {
        this._blinkEvents++
      }
      this._prevBlink = frame.blink

      // Appearance — vote for most common value across the scan
      if (frame.appearance) {
        const { face_shape, eye_shape, skin_tone, geometry_key } = frame.appearance
        this._faceShapeVotes[face_shape] = (this._faceShapeVotes[face_shape] ?? 0) + 1
        this._eyeShapeVotes[eye_shape]   = (this._eyeShapeVotes[eye_shape]   ?? 0) + 1
        this._skinToneVotes[skin_tone]   = (this._skinToneVotes[skin_tone]   ?? 0) + 1
        this._geometryKeys.push(geometry_key)
      }
    }
  }

  // -----------------------------------------------------------------------
  // Progress & completion
  // -----------------------------------------------------------------------

  /** 0-1 progress: how close to completing the scan. */
  progress(): number {
    const timeRatio  = (performance.now() - this._startTime) / SCAN_DURATION_MS
    const frameRatio = this._faceFrames / MIN_FACE_FRAMES
    return Math.min(Math.max(timeRatio, frameRatio), 1)
  }

  /** True when enough data has been collected. */
  get done(): boolean {
    return (
      performance.now() - this._startTime >= SCAN_DURATION_MS &&
      this._faceFrames >= MIN_FACE_FRAMES
    )
  }

  /** True when the minimum face-frame threshold is met (may complete early). */
  get hasMinFrames(): boolean {
    return this._faceFrames >= MIN_FACE_FRAMES
  }

  // -----------------------------------------------------------------------
  // Build the final profile
  // -----------------------------------------------------------------------

  result(): FacialProfile {
    const total = this._totalFrames || 1
    return {
      avg_smile:       clamp01(this._smileAccum.value),
      max_smile:       clamp01(this._smileAccum.peak),
      avg_mouth_open:  clamp01(this._mouthAccum.value),
      max_mouth_open:  clamp01(this._mouthAccum.peak),
      avg_blink:       clamp01(this._blinkAccum.value),
      blink_freq:      clamp01(this._blinkEvents / Math.max(this._faceFrames, 1) * 30),
      head_movement:   clamp01(this._movementAccum.value / 40),
      face_time_pct:   this._totalFrames > 0 ? this._faceFrames / this._totalFrames : 0,
      state_idle:        this._stateCounts.idle / total,
      state_attentive:   this._stateCounts.attentive / total,
      state_listening:   this._stateCounts.listening / total,
      state_speaking:    this._stateCounts.speaking / total,
      state_happy:       this._stateCounts.happy / total,
      state_tired:       this._stateCounts.tired / total,
      // Appearance: most frequent value seen during the scan
      face_shape:   mode(this._faceShapeVotes) as FaceShape | undefined,
      eye_shape:    mode(this._eyeShapeVotes)  as EyeShape  | undefined,
      skin_tone:    mode(this._skinToneVotes)  as SkinTone  | undefined,
      geometry_key: geometryMode(this._geometryKeys),
    }
  }

  /** Reset and restart the scan. */
  reset(): void {
    this._faceFrames = 0
    this._totalFrames = 0
    this._startTime = performance.now()
    this._prevBlink = 0
    this._blinkEvents = 0
    this._running = true
    for (const k of STATE_KEYS) this._stateCounts[k] = 0
    this._blinkAccum.reset()
    this._smileAccum.reset()
    this._mouthAccum.reset()
    this._movementAccum.reset()
    this._faceShapeVotes = {}
    this._eyeShapeVotes  = {}
    this._skinToneVotes  = {}
    this._geometryKeys   = []
  }

  /** Stop accumulation early (e.g. on scan cancellation). */
  stop(): void {
    this._running = false
  }
}

// ---------------------------------------------------------------------------
// Simple exponential-smear buffer (leaky integrator)
// ---------------------------------------------------------------------------

class SmearBuffer {
  value = 0
  peak  = 0
  constructor(private decay: number) {}

  push(v: number): void {
    this.value = this.value * this.decay + v * (1 - this.decay)
    if (v > this.peak) this.peak = v
  }

  reset(): void {
    this.value = 0
    this.peak  = 0
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function mode(votes: Partial<Record<string, number>>): string | undefined {
  let best: string | undefined
  let max = 0
  for (const [k, v] of Object.entries(votes)) {
    if ((v ?? 0) > max) { max = v ?? 0; best = k }
  }
  return best
}

function geometryMode(keys: string[]): string | undefined {
  if (keys.length === 0) return undefined
  const counts: Record<string, number> = {}
  for (const k of keys) counts[k] = (counts[k] ?? 0) + 1
  return mode(counts)
}
