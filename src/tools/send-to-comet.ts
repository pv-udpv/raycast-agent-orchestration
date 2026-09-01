import { SessionManager } from "../session-bridge/session-manager"

/**
 * AI Extension tool: send a web-aware question to Comet/Perplexity.
 * Comet has access to live web context and can browse for current information.
 */

interface Input {
  sessionId?: string
  question: string
  includeWebContext?: boolean
}

export default async function sendToComet(input: Input): Promise<string> {
  const { sessionId, question, includeWebContext = true } = input

  if (!question || question.trim().length === 0) {
    return "Error: question is required"
  }

  try {
    const mgr = sessionId
      ? SessionManager.load(sessionId)
      : new SessionManager()

    const fullPrompt = includeWebContext
      ? `${question}\n\n(Use web context if available for current information.)`
      : question

    const response = await mgr.send("comet", fullPrompt)
    const state = mgr.export()

    return JSON.stringify({
      sessionId: state.sessionId,
      response,
      turnCount: state.transcript.length,
      provider: "comet",
      note: "Web-aware response from Perplexity Comet browser agent",
      success: true
    })
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      success: false
    })
  }
}
