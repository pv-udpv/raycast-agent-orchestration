import { SessionState, ProviderId, AdapterResult } from "../types"

/**
 * Claude provider adapter.
 * No local Claude CLI exists; use Anthropic Messages API directly.
 * Maintains conversation history locally by replaying all prior turns.
 */

export class ClaudeAdapter {
  id: ProviderId = "claude"
  private apiKey = process.env.ANTHROPIC_API_KEY || ""

  async send(session: SessionState, prompt: string): Promise<AdapterResult> {
    if (!this.apiKey) {
      return {
        content: "Error: ANTHROPIC_API_KEY not set. Export it: export ANTHROPIC_API_KEY=sk-ant-..."
      }
    }

    // Build messages array from session transcript
    const messages = this.buildMessagesArray(session, prompt)

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-opus-4-1", // or claude-3-5-sonnet-latest
          max_tokens: 2048,
          messages
        })
      })

      if (!res.ok) {
        const err = await res.text()
        return {
          content: `Error: ${res.status} ${err.slice(0, 200)}`
        }
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text?: string }>
        usage?: { input_tokens: number; output_tokens: number }
      }

      const text =
        data.content.find(c => c.type === "text")?.text ||
        "(empty response)"

      return {
        content: text,
        raw: { usage: data.usage, model: "claude-opus-4-1" }
      }
    } catch (err) {
      return {
        content: `Error invoking Claude: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  private buildMessagesArray(
    session: SessionState,
    newPrompt: string
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = []

    // Replay full transcript (context for Claude)
    for (const turn of session.transcript) {
      messages.push({
        role: turn.role,
        content: `[${turn.provider.toUpperCase()}] ${turn.content}`
      })
    }

    // Add new prompt
    messages.push({
      role: "user",
      content: newPrompt
    })

    return messages
  }
}
