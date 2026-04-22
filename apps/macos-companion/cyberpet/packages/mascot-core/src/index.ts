// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MascotState = 'idle' | 'attentive' | 'listening' | 'speaking' | 'happy' | 'tired'

export interface TrackerFrame {
  face_detected: boolean
  head_pose:     { yaw: number; pitch: number; roll: number }
  blink:         number
  smile:         number
  mouth_open:    number
}

// ---------------------------------------------------------------------------
// State mapping
// Priority: tired > happy > speaking > listening > attentive > idle
// ---------------------------------------------------------------------------

export function mapTrackerToState(f: TrackerFrame): MascotState {
  if (!f.face_detected) return 'idle'
  if (f.blink      > 0.75) return 'tired'
  if (f.smile      > 0.55) return 'happy'
  if (f.mouth_open > 0.45) return 'speaking'
  if (f.mouth_open > 0.18) return 'listening'
  const moved = Math.abs(f.head_pose.yaw) + Math.abs(f.head_pose.pitch)
  if (moved > 12) return 'attentive'
  return 'idle'
}

// ---------------------------------------------------------------------------
// Hysteresis helper — call once per frame
// ---------------------------------------------------------------------------

export interface HysteresisState {
  current:     MascotState
  pending:     MascotState
  pendingSince: number
  timer:       ReturnType<typeof setTimeout> | null
}

export function makeHysteresis(holdMs = 400): HysteresisState {
  return { current: 'idle', pending: 'idle', pendingSince: 0, timer: null }
}

export function proposeState(
  h: HysteresisState,
  next: MascotState,
  holdMs: number,
  onCommit: (s: MascotState) => void,
): void {
  if (next === h.current) { h.pending = next; return }
  if (next !== h.pending) { h.pending = next; h.pendingSince = performance.now() }

  if (performance.now() - h.pendingSince >= holdMs) {
    h.current = next
    if (h.timer) { clearTimeout(h.timer); h.timer = null }
    onCommit(next)
  } else if (!h.timer) {
    const remaining = holdMs - (performance.now() - h.pendingSince)
    h.timer = setTimeout(() => {
      h.timer = null
      h.current = h.pending
      onCommit(h.pending)
    }, remaining)
  }
}
