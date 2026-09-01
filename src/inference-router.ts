// Inference router for Claude/Codex/Perplexity local backends

import type { InferenceTask, InferenceBackend } from "./agent"

export class InferenceRouter {
  constructor(
    private env: { PERPLEXITY_API_KEY?: string; CLAUDE_API_KEY?: string },
    private backends: InferenceBackend[]
  ) {}

  /**
   * Select model based on task urgency and backend availability
   */
  selectModel(task: InferenceTask): { backend: string; model: string } {
    // High urgency: skip local, go remote
    if (task.urgency === "high") {
      return this.selectRemote()
    }

    // Low/medium: prefer local
    const local = this.selectLocal()
    if (local) {
      return local
    }

    // Fallback to remote
    return this.selectRemote()
  }

  /**
   * Select local backend (Ollama Claude/Codex, MLX, Perplexity local)
   */
  private selectLocal(): { backend: string; model: string } | null {
    // Prefer Ollama Claude/Codex
    const ollama = this.backends.find(b => b.name === "ollama" && b.available)
    if (ollama) {
      return { backend: "ollama", model: "claude-codex" }
    }

    // Fallback to Ollama Mistral
    if (ollama) {
      return { backend: "ollama", model: "mistral-7b" }
    }

    // Try MLX
    const mlx = this.backends.find(b => b.name === "mlx" && b.available)
    if (mlx) {
      return { backend: "mlx", model: "neural-chat-7b" }
    }

    // Try Perplexity local
    const pplxLocal = this.backends.find(b => b.name === "perplexity-local" && b.available)
    if (pplxLocal) {
      return { backend: "perplexity-local", model: "pplx-7b" }
    }

    return null
  }

  /**
   * Select remote backend (Perplexity API, Claude API)
   */
  private selectRemote(): { backend: string; model: string } {
    if (this.env.PERPLEXITY_API_KEY) {
      return { backend: "perplexity-api", model: "pplx-7b-online" }
    }

    if (this.env.CLAUDE_API_KEY) {
      return { backend: "claude-api", model: "claude-3-opus" }
    }

    throw new Error("No remote inference backends configured")
  }
}

/**
 * Build the HTTP request for a given backend
 */
export function buildInferenceRequest(
  backend: string,
  model: string,
  prompt: string,
  maxTokens: number = 1024
): {
  endpoint: string
  request: RequestInit
} {
  if (backend === "ollama") {
    return {
      endpoint: "http://localhost:11434/api/generate",
      request: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      }
    }
  }

  if (backend === "mlx") {
    return {
      endpoint: "http://localhost:8000/v1/chat/completions",
      request: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens
        })
      }
    }
  }

  if (backend === "perplexity-local") {
    return {
      endpoint: "http://localhost:9000/v1/chat/completions",
      request: {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens
        })
      }
    }
  }

  if (backend === "perplexity-api") {
    return {
      endpoint: "https://api.perplexity.ai/chat/completions",
      request: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: maxTokens
        })
      }
    }
  }

  if (backend === "claude-api") {
    return {
      endpoint: "https://api.anthropic.com/v1/messages",
      request: {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.CLAUDE_API_KEY || ""
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages: [{ role: "user", content: prompt }]
        })
      }
    }
  }

  throw new Error(`Unknown backend: ${backend}`)
}

/**
 * Parse inference response based on backend
 */
export function parseInferenceResponse(backend: string, body: unknown): string {
  const data = body as Record<string, unknown>

  if (backend === "ollama") {
    return (data.response as string) || ""
  }

  if (backend === "mlx" || backend === "perplexity-local" || backend === "perplexity-api") {
    const choices = (data.choices as Array<{ message: { content: string } }>) || []
    return choices[0]?.message?.content || ""
  }

  if (backend === "claude-api") {
    const content = (data.content as Array<{ text: string }>) || []
    return content[0]?.text || ""
  }

  return ""
}
