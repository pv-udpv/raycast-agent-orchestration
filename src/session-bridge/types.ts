export type ProviderId = "codex" | "claude" | "pplx-mlx" | "comet"

export interface Turn {
  turn: number
  provider: ProviderId
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface ProviderBindings {
  codex?: { threadId: string }
}

export interface SessionState {
  sessionId: string
  createdAt: number
  providerBindings: ProviderBindings
  transcript: Turn[]
}

export interface AdapterResult {
  content: string
  raw?: unknown
}

export interface ProviderAdapter {
  id: ProviderId
  /** Send a prompt, given full session state (for context injection). Returns assistant reply. */
  send(session: SessionState, prompt: string): Promise<AdapterResult>
}
