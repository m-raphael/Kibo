import type { MascotState } from './index.js'

// ---------------------------------------------------------------------------
// Animal type — which mascot the user's face profile matches
// ---------------------------------------------------------------------------

export type AnimalType = 'cat' | 'dog' | 'bunny' | 'fox' | 'bear'

// ---------------------------------------------------------------------------
// Normalised facial profile (all 0-1)
// ---------------------------------------------------------------------------

export interface FacialProfile {
  avg_smile:         number
  max_smile:         number
  avg_mouth_open:    number
  max_mouth_open:    number
  avg_blink:         number
  blink_freq:        number   // blinks per second of face time
  head_movement:     number   // typical yaw+pitch displacement
  face_time_pct:     number   // % of scan duration face was detected
  state_idle:        number   // % distribution across states
  state_attentive:   number
  state_listening:   number
  state_speaking:    number
  state_happy:       number
  state_tired:       number
}

// ---------------------------------------------------------------------------
// Archetype weight vectors
// Each animal has a weight for each FacialProfile field (in same order).
// The profile is scored via dot product: higher = better match.
// ---------------------------------------------------------------------------

type ProfileArray = [
  number, number, number, number, number, number,
  number, number, number, number, number, number, number, number,
]

interface Archetype {
  animal:  AnimalType
  label:   string
  weights: ProfileArray
}

export const ARCHETYPES: Archetype[] = [
  {
    animal: 'cat',
    label: 'Cat — reserved, observant, calm',
    weights: [
      0.1, 0.2,  // low smile
      0.2, 0.3,  // low mouth openness
      0.5, 0.4,  // moderate blinks
      0.2,       // low head movement
      0.15,      // low face time
      0.40, 0.30, 0.10, 0.05, 0.05, 0.10,  // idle/attentive dominant
    ],
  },
  {
    animal: 'dog',
    label: 'Dog — energetic, friendly, expressive',
    weights: [
      0.9, 0.9,  // high smile
      0.7, 0.8,  // expressive mouth
      0.3, 0.6,  // fast, shallow blinks
      0.8,       // lots of head movement
      0.9,       // high face time
      0.05, 0.15, 0.15, 0.25, 0.30, 0.10,  // happy/speaking dominant
    ],
  },
  {
    animal: 'bunny',
    label: 'Bunny — gentle, alert, quick',
    weights: [
      0.2, 0.3,  // low smile
      0.3, 0.4,  // low mouth openness
      0.6, 0.9,  // high blink frequency
      0.5,       // moderate head movement (quick jerks)
      0.6,       // moderate face time
      0.15, 0.35, 0.20, 0.10, 0.05, 0.15,  // attentive/tired mix
    ],
  },
  {
    animal: 'fox',
    label: 'Fox — playful, clever, composed',
    weights: [
      0.6, 0.7,  // moderate-high smile
      0.5, 0.6,  // moderate mouth
      0.3, 0.3,  // slow, deliberate blinks
      0.5,       // moderate movement
      0.7,       // good face time
      0.10, 0.25, 0.15, 0.15, 0.20, 0.15,  // mixed states
    ],
  },
  {
    animal: 'bear',
    label: 'Bear — laid-back, warm, steady',
    weights: [
      0.3, 0.4,  // occasional smile
      0.2, 0.3,  // low mouth
      0.7, 0.3,  // slow, heavy blinks
      0.2,       // minimal movement
      0.5,       // moderate face time
      0.35, 0.15, 0.10, 0.05, 0.10, 0.25,  // idle/tired dominant
    ],
  },
]

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function toArray(p: FacialProfile): ProfileArray {
  return [
    p.avg_smile, p.max_smile,
    p.avg_mouth_open, p.max_mouth_open,
    p.avg_blink, p.blink_freq,
    p.head_movement,
    p.face_time_pct,
    p.state_idle, p.state_attentive, p.state_listening,
    p.state_speaking, p.state_happy, p.state_tired,
  ]
}

/** Score a profile against an archetype (0-1). Higher = better match. */
export function scoreProfile(profile: FacialProfile, archetype: Archetype): number {
  const pv = toArray(profile)
  const wv = archetype.weights
  let dot = 0
  let mag = 0
  for (let i = 0; i < pv.length; i++) {
    dot += pv[i] * wv[i]
    mag += wv[i] * wv[i]
  }
  return mag > 0 ? dot / Math.sqrt(mag) : 0
}

/** Return the animal that best matches the profile. Defaults to 'cat'. */
export function scanAnimal(profile: FacialProfile): AnimalType {
  let best = ARCHETYPES[0]
  let bestScore = -1
  for (const a of ARCHETYPES) {
    const s = scoreProfile(profile, a)
    if (s > bestScore) { bestScore = s; best = a }
  }
  return best.animal
}
