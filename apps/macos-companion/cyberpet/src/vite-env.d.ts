/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Active provider (change this to switch; matching key is auto-resolved)
  readonly VITE_LLM_PROVIDER:        string | undefined
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
