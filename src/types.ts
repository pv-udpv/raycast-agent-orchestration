// Environment and inference types

export interface Env {
  ChatTreeAgent: DurableObjectNamespace
  PERPLEXITY_API_KEY?: string
  CLAUDE_API_KEY?: string
  OLLAMA_ENDPOINT?: string
  MLX_ENDPOINT?: string
  PPLX_LOCAL_ENDPOINT?: string
}

export interface InferenceConfig {
  backends: {
    ollama?: { endpoint: string; models: string[] }
    mlx?: { endpoint: string; models: string[] }
    perplexityLocal?: { endpoint: string; models: string[] }
    perplexityApi?: { apiKey: string; models: string[] }
    claudeApi?: { apiKey: string; models: string[] }
  }
  fallbackChain: string[]
  latencySla: {
    normalize: number
    export: number
    plan: number
    research: number
  }
}

export const DEFAULT_INFERENCE_CONFIG: InferenceConfig = {
  backends: {
    ollama: {
      endpoint: "http://localhost:11434",
      models: ["claude-codex", "mistral-7b", "neural-chat"]
    },
    mlx: {
      endpoint: "http://localhost:8000",
      models: ["neural-chat-7b", "mistral-7b-instruct"]
    },
    perplexityLocal: {
      endpoint: "http://localhost:9000",
      models: ["pplx-7b", "pplx-8x7b"]
    }
  },
  fallbackChain: [
    "ollama-claude-codex",
    "ollama-mistral-7b",
    "mlx-neural-chat-7b",
    "perplexity-local",
    "perplexity-api",
    "claude-api"
  ],
  latencySla: {
    normalize: 500,
    export: 1000,
    plan: 2000,
    research: 5000
  }
}
