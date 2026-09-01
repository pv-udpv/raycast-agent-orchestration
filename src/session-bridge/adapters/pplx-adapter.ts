import { SessionState, ProviderId, AdapterResult } from "../types"

/**
 * Perplexity local KG adapter.
 * Sends questions to http://127.0.0.1:49321/ask
 * Maintains session state via question history injection.
 */

export class PplxAdapter {
  id: ProviderId = "pplx-mlx"
  private baseUrl = "http://127.0.0.1:49321"

  async send(session: SessionState, prompt: string): Promise<AdapterResult> {
    // Build context from recent transcript
    const context = this.buildContext(session)
    const fullPrompt = context ? `${context}\n\n${prompt}` : prompt

    try {
      const res = await fetch(`${this.baseUrl}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: fullPrompt })
      })

      if (!res.ok) {
        const text = await res.text()
        return {
          content: `Error: ${res.status} ${text.slice(0, 100)}`
        }
      }

      const data = (await res.json()) as { answer?: string; [key: string]: unknown }
      return {
        content: data.answer || JSON.stringify(data),
        raw: data
      }
    } catch (err) {
      return {
        content: `Error invoking Perplexity KG: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  private buildContext(session: SessionState): string {
    if (!session.transcript.length) return ""

    // KG is stateless; inject full recent history for context
    const recentTurns = session.transcript.slice(-15)
    return recentTurns
      .map(t => `[${t.provider.toUpperCase()}] ${t.role}: ${t.content}`)
      .join("\n")
  }
}
