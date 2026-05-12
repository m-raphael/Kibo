import type { FacialProfile, AnimalType, FaceShape, EyeShape } from '@cyberpet/mascot-core'
import { assignFromTraitsLLMWithFallback } from './llm-adapter.js'
export type { LlmConfig } from './llm-adapter.js'

// ---------------------------------------------------------------------------
// MascotProfile — shared schema across TS, Rust, and Python
// ---------------------------------------------------------------------------

export type { AnimalType }

// ---------------------------------------------------------------------------
// Species — the 8 mascot identifiers used in assignment
// ---------------------------------------------------------------------------

export type AssignedSpecies =
  | 'cat' | 'gibbon' | 'rabbit' | 'pelican'
  | 'cow' | 'bear'   | 'koala'  | 'red-panda'

// ---------------------------------------------------------------------------
// Assignment result — Task 9
// ---------------------------------------------------------------------------

export interface AssignmentResult {
  species:   AssignedSpecies
  label:     string
  emoji:     string
  score:     number     // 0–1 normalized confidence
  reasons:   string[]  // human-readable sentences explaining the match
  runnerUp?: { species: AssignedSpecies; label: string; score: number }
}

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
// Task 9: Rule engine — maps approved Trait[] → AssignmentResult
// ---------------------------------------------------------------------------

interface SpeciesRule {
  species:    AssignedSpecies
  label:      string
  emoji:      string
  affinities: Record<string, number>  // trait id → weight 0–1
  tagline:    string                  // used in reason sentences
}

const SPECIES_RULES: SpeciesRule[] = [
  {
    species: 'cat', label: 'Cat', emoji: '🐱',
    tagline: 'calm and self-contained',
    affinities: { reserved: 0.95, quiet: 0.90, steady: 0.80, calm: 0.85, relaxed: 0.60, observant: 0.65 },
  },
  {
    species: 'gibbon', label: 'Gibbon', emoji: '🐒',
    tagline: 'expressive and energetic',
    affinities: { expressive: 0.95, animated: 0.95, talkative: 0.85, cheerful: 0.80, engaged: 0.65, alert: 0.50 },
  },
  {
    species: 'rabbit', label: 'Rabbit', emoji: '🐰',
    tagline: 'quick and attentive',
    affinities: { alert: 0.95, observant: 0.85, engaged: 0.75, animated: 0.60, quiet: 0.55, steady: 0.50 },
  },
  {
    species: 'pelican', label: 'Pelican', emoji: '🦤',
    tagline: 'sociable and vocal',
    affinities: { talkative: 0.90, engaged: 0.85, expressive: 0.75, cheerful: 0.65, animated: 0.60 },
  },
  {
    species: 'cow', label: 'Cow', emoji: '🐄',
    tagline: 'grounded and easy-going',
    affinities: { steady: 0.90, relaxed: 0.85, engaged: 0.70, quiet: 0.65, 'laid-back': 0.70 },
  },
  {
    species: 'bear', label: 'Bear', emoji: '🐻',
    tagline: 'warm and unhurried',
    affinities: { 'laid-back': 0.95, relaxed: 0.90, steady: 0.75, quiet: 0.70, reserved: 0.50 },
  },
  {
    species: 'koala', label: 'Koala', emoji: '🐨',
    tagline: 'peaceful and deliberate',
    affinities: { relaxed: 0.95, 'laid-back': 0.90, steady: 0.80, quiet: 0.75, reserved: 0.55 },
  },
  {
    species: 'red-panda', label: 'Red Panda', emoji: '🦊',
    tagline: 'playful and clever',
    affinities: { cheerful: 0.90, animated: 0.85, expressive: 0.80, alert: 0.70, engaged: 0.65 },
  },
]

// ---------------------------------------------------------------------------
// Visual appearance → mascot bias
// Maps face geometry to a species score boost (added on top of behavioral score).
// This ensures that even with similar behavior, physical look shapes the result.
// ---------------------------------------------------------------------------

const SHAPE_BIAS: Record<FaceShape, Partial<Record<AssignedSpecies, number>>> = {
  oval:    { cat: 0.20, 'red-panda': 0.15, rabbit: 0.10 },
  round:   { koala: 0.25, bear: 0.20, rabbit: 0.10 },
  square:  { cow: 0.25, gibbon: 0.15, bear: 0.10 },
  heart:   { rabbit: 0.25, cat: 0.15, 'red-panda': 0.10 },
  oblong:  { pelican: 0.30, gibbon: 0.15 },
}

const EYE_BIAS: Record<EyeShape, Partial<Record<AssignedSpecies, number>>> = {
  almond:  { cat: 0.20, 'red-panda': 0.15 },
  round:   { koala: 0.20, bear: 0.15, rabbit: 0.10 },
  wide:    { cow: 0.15, pelican: 0.10, rabbit: 0.10 },
  narrow:  { 'red-panda': 0.20, cat: 0.10 },
}

/** Compute per-species appearance bias from face geometry. */
function appearanceBias(profile: FacialProfile): Partial<Record<AssignedSpecies, number>> {
  const bias: Partial<Record<AssignedSpecies, number>> = {}
  const add = (src: Partial<Record<AssignedSpecies, number>>) => {
    for (const [sp, v] of Object.entries(src) as [AssignedSpecies, number][]) {
      bias[sp] = (bias[sp] ?? 0) + v
    }
  }
  if (profile.face_shape) add(SHAPE_BIAS[profile.face_shape] ?? {})
  if (profile.eye_shape)  add(EYE_BIAS[profile.eye_shape]   ?? {})
  return bias
}

/** Build appearance-derived traits so the LLM prompt includes visual context. */
export function appearanceTraits(profile: FacialProfile): Trait[] {
  const out: Trait[] = []
  if (profile.face_shape) out.push({
    id: `face-${profile.face_shape}`, label: `${profile.face_shape} face shape`,
    confidence: 0.85, source: 'face_shape',
  })
  if (profile.eye_shape) out.push({
    id: `eye-${profile.eye_shape}`, label: `${profile.eye_shape} eyes`,
    confidence: 0.80, source: 'eye_shape',
  })
  if (profile.skin_tone) out.push({
    id: `tone-${profile.skin_tone}`, label: `${profile.skin_tone} complexion`,
    confidence: 0.75, source: 'skin_tone',
  })
  return out
}

/** Map approved traits to a mascot species with reasons. Falls back to 'cat'. */
export function assignFromTraits(traits: Trait[], profile?: FacialProfile): AssignmentResult {
  if (traits.length === 0) {
    return { species: 'cat', label: 'Cat', emoji: '🐱', score: 0, reasons: ['No traits selected — defaulting to cat.'] }
  }

  const bias = profile ? appearanceBias(profile) : {}

  // Score each species: behavioral (weighted trait sum) + appearance bias
  const scored = SPECIES_RULES.map(rule => {
    let total = 0
    let maxPossible = 0
    const contributions: Array<{ trait: Trait; weight: number; contrib: number }> = []

    for (const [traitId, weight] of Object.entries(rule.affinities)) {
      maxPossible += weight
      const trait = traits.find(t => t.id === traitId)
      if (trait) {
        const contrib = trait.confidence * weight
        total += contrib
        contributions.push({ trait, weight, contrib })
      }
    }

    contributions.sort((a, b) => b.contrib - a.contrib)
    const behaviorScore = maxPossible > 0 ? total / maxPossible : 0
    const visualBias    = bias[rule.species] ?? 0
    return { rule, score: Math.min(behaviorScore + visualBias, 1), contributions }
  })

  scored.sort((a, b) => b.score - a.score)
  const winner   = scored[0]
  const runnerUp = scored[1]

  // Build human-readable reasons from top 3 contributing traits
  const topTraits = winner.contributions.slice(0, 3)
  const reasons: string[] = []

  if (topTraits.length > 0) {
    const traitLabels = topTraits.map(c => c.trait.label.toLowerCase())
    reasons.push(`You come across as ${winner.rule.tagline}.`)
    reasons.push(`Traits like ${traitLabels.join(', ')} matched this profile strongly.`)
  }
  if (winner.score < 0.40) {
    reasons.push('Match confidence is low — try scanning again for a better result.')
  }

  return {
    species:  winner.rule.species,
    label:    winner.rule.label,
    emoji:    winner.rule.emoji,
    score:    Math.round(winner.score * 100) / 100,
    reasons,
    runnerUp: {
      species: runnerUp.rule.species,
      label:   runnerUp.rule.label,
      score:   Math.round(runnerUp.score * 100) / 100,
    },
  }
}

// ---------------------------------------------------------------------------
// Task 12: assignMascot — tries LLM, falls back to local rules
// ---------------------------------------------------------------------------

export type AssignSource = 'llm' | 'local'

export interface AssignmentResultWithSource extends AssignmentResult {
  source: AssignSource
}

/**
 * Assign a mascot species from approved traits.
 * If a valid LlmConfig is provided, attempts the LLM endpoint first.
 * Falls back to deterministic local rules on any failure.
 */
export async function assignMascot(
  traits: Trait[],
  configs?: import('./llm-adapter.js').LlmConfig | import('./llm-adapter.js').LlmConfig[] | null,
  profile?: FacialProfile | null,
): Promise<AssignmentResultWithSource> {
  const allTraits = profile ? [...traits, ...appearanceTraits(profile)] : traits

  const chain = (Array.isArray(configs) ? configs : configs ? [configs] : [])
    .filter(c => c.apiKey)

  if (chain.length > 0) {
    try {
      const result = await assignFromTraitsLLMWithFallback(allTraits, chain)
      return { ...result, source: 'llm' }
    } catch (err) {
      console.warn('[CyberPet] All LLM providers failed — using local rules.', err)
    }
  }
  return { ...assignFromTraits(traits, profile ?? undefined), source: 'local' }
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
