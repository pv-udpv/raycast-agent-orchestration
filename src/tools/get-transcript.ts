import { SessionManager } from "../session-bridge/session-manager"

/**
 * AI Extension tool: retrieve full transcript for a session.
 * Useful for Raycast AI to "read" the conversation history before acting.
 */

interface Input {
  sessionId: string
}

export default async function getTranscript(input: Input): Promise<string> {
  const { sessionId } = input

  if (!sessionId) {
    return "Error: sessionId is required"
  }

  try {
    const mgr = SessionManager.load(sessionId)
    const state = mgr.export()

    const formatted = state.transcript
      .map(t => `[${t.provider}] ${t.role}: ${t.content}`)
      .join("\n\n")

    return JSON.stringify({
      sessionId,
      transcript: formatted,
      turnCount: state.transcript.length,
      providerBindings: state.providerBindings,
      success: true
    })
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      success: false
    })
  }
}
