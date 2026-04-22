export type MascotState = "idle" | "attentive" | "listening" | "speaking" | "happy" | "tired"

export function mapTrackerToState(): MascotState {
  return "idle"
}
