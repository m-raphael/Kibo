import type { FacialProfile, AnimalType } from '@cyberpet/mascot-core'

// ---------------------------------------------------------------------------
// MascotProfile — shared schema across TS, Rust, and Python
// ---------------------------------------------------------------------------

export type { AnimalType }

export interface Trait {
  id:         string   // slug, stable identifier
  label:      string   // human-readable display name
  confidence: number   // 0–1, inferred signal strength
  source:     string   // which FacialProfile field drove this
}

export interface MascotProfile {
  animal:    AnimalType
  traits:    Trait[]
  scannedAt: number    // Unix ms timestamp
}

// ---------------------------------------------------------------------------
// Trait inference — derives human-readable traits from raw FacialProfile
// ---------------------------------------------------------------------------

interface TraitRule {
  id:     string
  label:  string
  source: string   // FacialProfile field name — kept as string for JSON compat
  score:  (v: number) => number | null  // null = trait not applicable
  field:  keyof FacialProfile
}

const RULES: TraitRule[] = [
  { id: 'expressive', label: 'Expressive', source: 'avg_smile',     field: 'avg_smile',     score: v => v > 0.45 ? v : null },
  { id: 'reserved',   label: 'Reserved',   source: 'avg_smile',     field: 'avg_smile',     score: v => v < 0.35 ? 1 - v : null },
  { id: 'talkative',  label: 'Talkative',  source: 'avg_mouth_open',field: 'avg_mouth_open',score: v => v > 0.38 ? v : null },
  { id: 'quiet',      label: 'Quiet',      source: 'avg_mouth_open',field: 'avg_mouth_open',score: v => v < 0.25 ? 1 - v : null },
  { id: 'alert',      label: 'Alert',      source: 'blink_freq',    field: 'blink_freq',    score: v => v > 0.55 ? v : null },
  { id: 'relaxed',    label: 'Relaxed',    source: 'blink_freq',    field: 'blink_freq',    score: v => v < 0.30 ? 1 - v : null },
  { id: 'animated',   label: 'Animated',   source: 'head_movement', field: 'head_movement', score: v => v > 0.50 ? v : null },
  { id: 'steady',     label: 'Steady',     source: 'head_movement', field: 'head_movement', score: v => v < 0.35 ? 1 - v : null },
  { id: 'engaged',    label: 'Engaged',    source: 'face_time_pct', field: 'face_time_pct', score: v => v > 0.60 ? v : null },
  { id: 'observant',  label: 'Observant',  source: 'state_attentive',field:'state_attentive',score: v => v > 0.18 ? v + 0.15 : null },
  { id: 'cheerful',   label: 'Cheerful',   source: 'state_happy',   field: 'state_happy',   score: v => v > 0.18 ? v + 0.10 : null },
  { id: 'laid-back',  label: 'Laid-back',  source: 'state_tired',   field: 'state_tired',   score: v => v > 0.18 ? v + 0.08 : null },
]

/** Derive up to 6 human-readable traits from a raw FacialProfile. */
export function inferTraits(profile: FacialProfile): Trait[] {
  const traits: Trait[] = []

  for (const rule of RULES) {
    const raw = profile[rule.field] as number
    const conf = rule.score(raw)
    if (conf === null) continue
    traits.push({
      id:         rule.id,
      label:      rule.label,
      confidence: Math.min(Math.round(conf * 100) / 100, 1),
      source:     rule.source,
    })
  }

  // Sort by confidence descending, cap at 6
  return traits
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6)
}

// ---------------------------------------------------------------------------
// Mock profile — used until real scanner output is wired
// ---------------------------------------------------------------------------

export const MOCK_PROFILE: MascotProfile = {
  animal: 'cat',
  scannedAt: Date.now(),
  traits: [
    { id: 'reserved',   label: 'Reserved',   confidence: 0.82, source: 'avg_smile' },
    { id: 'observant',  label: 'Observant',  confidence: 0.74, source: 'state_attentive' },
    { id: 'calm',       label: 'Calm',       confidence: 0.68, source: 'head_movement' },
    { id: 'steady',     label: 'Steady',     confidence: 0.61, source: 'blink_freq' },
    { id: 'quiet',      label: 'Quiet',      confidence: 0.55, source: 'avg_mouth_open' },
    { id: 'engaged',    label: 'Engaged',    confidence: 0.48, source: 'face_time_pct' },
  ],
}
