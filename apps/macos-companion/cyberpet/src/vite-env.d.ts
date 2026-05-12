/// <reference types="vite/client" />

interface ImportMetaEnv {
  // LLM provider routing
  readonly VITE_LLM_PROVIDER:   string | undefined
  readonly VITE_LLM_API_KEY:    string | undefined
  readonly VITE_LLM_MODEL:      string | undefined
  readonly VITE_LLM_BASE_URL:   string | undefined
  readonly VITE_LLM_NVIDIA_BASE:string | undefined
  // Claude Code Pro auto-inject (envPrefix includes ANTHROPIC_)
  readonly ANTHROPIC_API_KEY:   string | undefined
  // Debug / build
  readonly VITE_ENV:            string | undefined
  readonly VITE_DEBUG_TRACKER:  string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
