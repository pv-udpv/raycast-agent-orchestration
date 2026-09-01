import { SessionManager } from "../session-bridge/session-manager"

/**
 * AI Extension tool: list all available sessions.
 */

interface Input {
  // No input required
}

export default async function listSessions(_input: Input): Promise<string> {
  try {
    const sessions = SessionManager.listSessions()

    if (sessions.length === 0) {
      return JSON.stringify({
        sessions: [],
        message: "No sessions found. Create a new one with send-prompt.",
        success: true
      })
    }

    // Load each session and get summary
    const summaries = sessions.map(id => {
      const mgr = SessionManager.load(id)
      const state = mgr.export()
      return {
        sessionId: id,
        created: new Date(state.createdAt).toISOString(),
        turns: state.transcript.length,
        providers: Array.from(
          new Set(state.transcript.map(t => t.provider))
        )
      }
    })

    return JSON.stringify({
      sessions: summaries,
      count: sessions.length,
      success: true
    })
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      success: false
    })
  }
}
