import { SessionManager } from "../session-bridge/session-manager"
import type { ProviderId } from "../session-bridge/types"

/**
 * AI Extension tool: send a prompt to a provider within a session.
 * Callable by Raycast AI, Claude Desktop (MCP), etc.
 */

interface Input {
  /** Session ID (or empty to create new) */
  sessionId?: string
  /** Prompt text */
  prompt: string
  /** Provider: codex | pplx-mlx | claude */
  provider: ProviderId
}

export default async function sendPrompt(input: Input): Promise<string> {
  const { sessionId, prompt, provider } = input

  if (!prompt || prompt.trim().length === 0) {
    return "Error: prompt is required"
  }

  if (!["codex", "pplx-mlx", "claude"].includes(provider)) {
    return `Error: unknown provider "${provider}". Use: codex, pplx-mlx, claude`
  }

  try {
    const mgr = sessionId
      ? SessionManager.load(sessionId)
      : new SessionManager()

    const response = await mgr.send(provider, prompt)
    const state = mgr.export()

    return JSON.stringify({
      sessionId: state.sessionId,
      response,
      turnCount: state.transcript.length,
      success: true
    })
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      success: false
    })
  }
}
