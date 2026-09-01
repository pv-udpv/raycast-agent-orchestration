import { SessionManager } from "../session-bridge/session-manager"
import type { ProviderId } from "../session-bridge/types"

/**
 * AI Extension tool: switch provider mid-session.
 * Maintains full conversation context across provider switch.
 */

interface Input {
  sessionId: string
  newProvider: ProviderId
  prompt: string
}

export default async function switchProvider(input: Input): Promise<string> {
  const { sessionId, newProvider, prompt } = input

  if (!sessionId) {
    return "Error: sessionId is required"
  }

  if (!["codex", "pplx-mlx", "claude"].includes(newProvider)) {
    return `Error: unknown provider "${newProvider}"`
  }

  if (!prompt || prompt.trim().length === 0) {
    return "Error: prompt is required when switching providers"
  }

  try {
    const mgr = SessionManager.load(sessionId)
    const response = await mgr.switchProvider(newProvider, prompt)
    const state = mgr.export()

    return JSON.stringify({
      sessionId: state.sessionId,
      newProvider,
      response,
      contextWindows: state.transcript.length,
      success: true
    })
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      success: false
    })
  }
}
