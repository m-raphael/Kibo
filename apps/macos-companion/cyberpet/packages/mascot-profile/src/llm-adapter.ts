import type { AssignedSpecies, AssignmentResult, Trait } from './types.js'

// ---------------------------------------------------------------------------
// LLM adapter — provider-agnostic mascot assignment
// Supports: anthropic, gemini, openai-compatible (Ollama/vLLM/LocalAI),
//           openrouter, groq, together, huggingface, nvidia-nim
// ---------------------------------------------------------------------------

export type LlmProvider =
  | 'anthropic'
  | 'gemini'
  | 'openai-compatible'
  | 'openrouter'
  | 'groq'
  | 'together'
  | 'huggingface'
  | 'nvidia-nim'

export interface LlmConfig {
  provider:   LlmProvider
  apiKey:     string
  model?:     string
  baseUrl?:   string   // for openai-compatible / nvidia-nim custom endpoints
  timeoutMs?: number
}

// ---------------------------------------------------------------------------
// Provider defaults
// ---------------------------------------------------------------------------

const PROVIDER_DEFAULTS: Record<LlmProvider, { model: string; url: string; timeoutMs: number }> = {
  anthropic:           { model: 'claude-haiku-4-5-20251001',          url: 'https://api.anthropic.com/v1/messages',                         timeoutMs: 10000 },
  gemini:              { model: 'gemini-2.0-flash',                    url: 'https://generativelanguage.googleapis.com/v1beta/models',       timeoutMs: 12000 },
  'openai-compatible': { model: 'qwen2.5:7b',                         url: 'http://localhost:11434/v1/chat/completions',                     timeoutMs: 15000 },
  openrouter:          { model: 'google/gemma-2-9b-it:free',           url: 'https://openrouter.ai/api/v1/chat/completions',                 timeoutMs: 12000 },
  groq:                { model: 'llama-3.1-8b-instant',                url: 'https://api.groq.com/openai/v1/chat/completions',               timeoutMs: 8000  },
  together:            { model: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', url: 'https://api.together.xyz/v1/chat/completions',          timeoutMs: 10000 },
  huggingface:         { model: 'mistralai/Mistral-7B-Instruct-v0.3',  url: 'https://api-inference.huggingface.co/models',                  timeoutMs: 12000 },
  'nvidia-nim':        { model: 'meta/llama-3.1-8b-instruct',          url: 'https://integrate.api.nvidia.com/v1/chat/completions',          timeoutMs: 8000  },
}

// ---------------------------------------------------------------------------
// Mascot metadata
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

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
// Shared: OpenAI-compatible chat completions (groq, together, openrouter,
//         nvidia-nim, openai-compatible)
// ---------------------------------------------------------------------------

async function callOpenAICompatible(
  traits: Trait[],
  config: LlmConfig,
  url: string,
): Promise<unknown> {
  const defaults = PROVIDER_DEFAULTS[config.provider]
  const model    = config.model ?? defaults.model
  const timeout  = config.timeoutMs ?? defaults.timeoutMs

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), timeout)

  const headers: Record<string, string> = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
  }
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/globoconsulting/kibo'
    headers['X-Title']      = 'CyberPet'
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a mascot personality assignment system. Always respond with valid JSON only, no markdown.' },
          { role: 'user',   content: buildPrompt(traits) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.20,
        max_tokens:  300,
      }),
    })

    if (!res.ok) throw new Error(`${config.provider} HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    return JSON.parse(data.choices[0].message.content)
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Provider: Anthropic / Claude
// ---------------------------------------------------------------------------

async function callAnthropic(traits: Trait[], config: LlmConfig): Promise<unknown> {
  const defaults = PROVIDER_DEFAULTS.anthropic
  const model    = config.model ?? defaults.model
  const timeout  = config.timeoutMs ?? defaults.timeoutMs

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(defaults.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [{ role: 'user', content: buildPrompt(traits) }],
        system: 'You are a mascot personality assignment system. Always respond with valid JSON only, no markdown.',
      }),
    })

    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json() as { content: Array<{ text: string }> }
    return JSON.parse(data.content[0].text)
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Provider: Google Gemini
// ---------------------------------------------------------------------------

async function callGemini(traits: Trait[], config: LlmConfig): Promise<unknown> {
  const defaults = PROVIDER_DEFAULTS.gemini
  const model    = config.model ?? defaults.model
  const timeout  = config.timeoutMs ?? defaults.timeoutMs
  const url      = `${defaults.url}/${model}:generateContent?key=${config.apiKey}`

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(traits) }] }],
        generationConfig: { temperature: 0.20, maxOutputTokens: 300 },
        systemInstruction: { parts: [{ text: 'You are a mascot personality assignment system. Always respond with valid JSON only, no markdown.' }] },
      }),
    })

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`)
    const data = await res.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> }
    const text = data.candidates[0]?.content.parts[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found in Gemini response')
    return JSON.parse(match[0])
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Provider: HuggingFace Inference API
// ---------------------------------------------------------------------------

async function callHuggingFace(traits: Trait[], config: LlmConfig): Promise<unknown> {
  const defaults = PROVIDER_DEFAULTS.huggingface
  const model    = config.model ?? defaults.model
  const timeout  = config.timeoutMs ?? defaults.timeoutMs
  const url      = `${defaults.url}/${model}`

  const controller = new AbortController()
  const timer      = setTimeout(() => controller.abort(), timeout)

  const prompt = `<s>[INST] ${buildPrompt(traits)} [/INST]`

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 300, temperature: 0.20, return_full_text: false },
      }),
    })

    if (!res.ok) throw new Error(`HuggingFace HTTP ${res.status}: ${await res.text()}`)
    const data  = await res.json() as Array<{ generated_text: string }>
    const text  = data[0]?.generated_text ?? ''
    const match = text.match(/\{[\s\S]*?\}/)
    if (!match) throw new Error('No JSON block found in HuggingFace response')
    return JSON.parse(match[0])
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// Response validation
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
// Public API
// ---------------------------------------------------------------------------

export async function assignFromTraitsLLM(traits: Trait[], config: LlmConfig): Promise<AssignmentResult> {
  const defaults = PROVIDER_DEFAULTS[config.provider]

  switch (config.provider) {
    case 'anthropic':
      return parseResponse(await callAnthropic(traits, config))

    case 'gemini':
      return parseResponse(await callGemini(traits, config))

    case 'huggingface':
      return parseResponse(await callHuggingFace(traits, config))

    case 'openai-compatible': {
      const url = config.baseUrl
        ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
        : defaults.url
      return parseResponse(await callOpenAICompatible(traits, config, url))
    }

    case 'nvidia-nim': {
      const url = config.baseUrl ?? defaults.url
      return parseResponse(await callOpenAICompatible(traits, config, url))
    }

    case 'openrouter':
    case 'groq':
    case 'together':
      return parseResponse(await callOpenAICompatible(traits, config, defaults.url))

    default: {
      const _exhaustive: never = config.provider
      throw new Error(`Unknown LLM provider: ${String(_exhaustive)}`)
    }
  }
}
