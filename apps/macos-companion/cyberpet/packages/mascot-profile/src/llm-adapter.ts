import type { AssignedSpecies, AssignmentResult, Trait } from './types.js'

// ---------------------------------------------------------------------------
// Task 11: Optional LLM adapter — NVIDIA NIM or HuggingFace
// Sends approved traits → structured JSON species recommendation
// ---------------------------------------------------------------------------

export interface LlmConfig {
  provider:  'nvidia-nim' | 'huggingface'
  apiKey:    string
  model?:    string    // override default model
  timeoutMs?: number  // default: 8000 for NIM, 12000 for HF
}

const SPECIES_META: Record<AssignedSpecies, { label: string; emoji: string }> = {
  cat:         { label: 'Cat',       emoji: '🐱' },
  gibbon:      { label: 'Gibbon',    emoji: '🐒' },
  rabbit:      { label: 'Rabbit',    emoji: '🐰' },
  pelican:     { label: 'Pelican',   emoji: '🦤' },
  cow:         { label: 'Cow',       emoji: '🐄' },
  bear:        { label: 'Bear',      emoji: '🐻' },
  koala:       { label: 'Koala',     emoji: '🐨' },
  'red-panda': { label: 'Red Panda', emoji: '🦊' },
}

const VALID_SPECIES = new Set<AssignedSpecies>([
  'cat', 'gibbon', 'rabbit', 'pelican', 'cow', 'bear', 'koala', 'red-panda',
])

function buildPrompt(traits: Trait[]): string {
  const traitList = traits
    .map(t => `- ${t.label} (confidence: ${Math.round(t.confidence * 100)}%)`)
    .join('\n')

  return `You are a mascot personality assignment system. Given behavioral traits observed from face tracking, assign the most fitting animal mascot personality.

Available mascots (use the exact ID): cat, gibbon, rabbit, pelican, cow, bear, koala, red-panda

Observed user traits:
${traitList}

Respond with ONLY valid JSON, no other text:
{
  "species": "<one of the 8 exact mascot IDs above>",
  "score": <number 0.0 to 1.0 indicating confidence>,
  "reasons": ["<natural language sentence>", "<natural language sentence>"],
  "runnerUp": { "species": "<mascot ID>", "score": <number> }
}`
}

// ---------------------------------------------------------------------------
// Provider: NVIDIA NIM (OpenAI-compatible)
// ---------------------------------------------------------------------------

async function callNvidianim(traits: Trait[], config: LlmConfig): Promise<unknown> {
  const model = config.model ?? 'meta/llama-3.1-8b-instruct'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 8000)

  try {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role:    'system',
            content: 'You are a mascot personality assignment system. Always respond with valid JSON only, no markdown.',
          },
          { role: 'user', content: buildPrompt(traits) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.20,
        max_tokens:  300,
      }),
    })

    if (!res.ok) throw new Error(`NVIDIA NIM HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    return JSON.parse(data.choices[0].message.content)
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Provider: HuggingFace Inference API
// ---------------------------------------------------------------------------

async function callHuggingFace(traits: Trait[], config: LlmConfig): Promise<unknown> {
  const model = config.model ?? 'mistralai/Mistral-7B-Instruct-v0.3'
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 12000)

  const prompt = `<s>[INST] ${buildPrompt(traits)} [/INST]`

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens:   300,
          temperature:      0.20,
          return_full_text: false,
        },
      }),
    })

    if (!res.ok) throw new Error(`HuggingFace HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json() as Array<{ generated_text: string }>
    const text  = data[0]?.generated_text ?? ''
    // Extract first JSON object from response
    const match = text.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error('No JSON block found in HuggingFace response')
    return JSON.parse(match[0])
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Response validation — guards against hallucinated species names
// ---------------------------------------------------------------------------

function parseResponse(raw: unknown): AssignmentResult {
  if (!raw || typeof raw !== 'object') throw new Error('LLM response is not an object')
  const r = raw as Record<string, unknown>

  const species = r.species as AssignedSpecies
  if (!VALID_SPECIES.has(species)) {
    throw new Error(`LLM returned unknown species: "${String(r.species)}"`)
  }

  const meta    = SPECIES_META[species]
  const score   = typeof r.score === 'number' ? Math.min(Math.max(r.score, 0), 1) : 0.5
  const reasons = Array.isArray(r.reasons)
    ? (r.reasons as unknown[]).filter(x => typeof x === 'string').slice(0, 3) as string[]
    : ['Assigned by AI.']

  let runnerUp: AssignmentResult['runnerUp']
  const ru = r.runnerUp as Record<string, unknown> | undefined
  if (ru && typeof ru.species === 'string' && VALID_SPECIES.has(ru.species as AssignedSpecies)) {
    const ruMeta = SPECIES_META[ru.species as AssignedSpecies]
    runnerUp = {
      species: ru.species as AssignedSpecies,
      label:   ruMeta.label,
      score:   typeof ru.score === 'number' ? Math.min(Math.max(ru.score, 0), 1) : 0,
    }
  }

  return { species, label: meta.label, emoji: meta.emoji, score, reasons, runnerUp }
}

// ---------------------------------------------------------------------------
// Public API — Task 11
// ---------------------------------------------------------------------------

export async function assignFromTraitsLLM(traits: Trait[], config: LlmConfig): Promise<AssignmentResult> {
  const raw = config.provider === 'nvidia-nim'
    ? await callNvidianim(traits, config)
    : await callHuggingFace(traits, config)
  return parseResponse(raw)
}
