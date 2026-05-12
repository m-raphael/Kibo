/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Fallback chain — tried in order when the primary provider rate-limits or fails
  readonly VITE_LLM_PROVIDER:        string | undefined  // Tier 1 (primary)
  readonly VITE_LLM_FALLBACK_1:      string | undefined  // Tier 2
  readonly VITE_LLM_FALLBACK_2:      string | undefined  // Tier 3
  readonly VITE_LLM_FALLBACK_3:      string | undefined  // Tier 4 (local guarantee)
  readonly VITE_LLM_MODEL:           string | undefined

  // Per-provider API keys
  readonly VITE_ANTHROPIC_API_KEY:   string | undefined
  readonly VITE_NVIDIA_API_KEY:      string | undefined
  readonly VITE_NVIDIA_NIM_BASE:     string | undefined
  readonly VITE_GROQ_API_KEY:        string | undefined
  readonly VITE_HUGGINGFACE_API_KEY: string | undefined
  readonly VITE_OPENROUTER_API_KEY:  string | undefined
  readonly VITE_TOGETHER_API_KEY:    string | undefined
  readonly VITE_GEMINI_API_KEY:      string | undefined
  readonly VITE_XAI_API_KEY:         string | undefined
  readonly VITE_OPENAI_API_KEY:      string | undefined
  readonly VITE_OPENAI_BASE_URL:     string | undefined
  readonly VITE_OPENAI_MODEL:        string | undefined

  // Claude Code CLI auto-injects this (covered by envPrefix: ANTHROPIC_)
  readonly ANTHROPIC_API_KEY:        string | undefined

  // Debug / build
  readonly VITE_ENV:                 string | undefined
  readonly VITE_DEBUG_TRACKER:       string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
