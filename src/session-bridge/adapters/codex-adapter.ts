import { execSync } from "child_process"
import { SessionState, ProviderId, AdapterResult } from "../types"

/**
 * Codex provider adapter.
 * Uses codex exec --json for non-interactive invocation.
 * Automatically resumes thread_id from session state.
 */

export class CodexAdapter {
  id: ProviderId = "codex"

  async send(session: SessionState, prompt: string): Promise<AdapterResult> {
    // If we have a saved thread_id, resume it; otherwise start fresh.
    // Verified syntax: `codex exec resume <thread_id> [PROMPT]` (resume is a
    // subcommand of exec, not a flag).
    const threadId = session.providerBindings.codex?.threadId

    // Construct context injection: pass transcript as system context.
    // Only needed on first turn (or when switching FROM another provider);
    // once resumed, codex's own server-side thread already has its history.
    const context = threadId ? "" : this.buildContext(session)
    const fullPrompt = context ? `${context}\n\nUser: ${prompt}` : prompt
    const escaped = fullPrompt.replace(/"/g, '\\"')

    try {
      // NOTE: --ephemeral is intentionally omitted. Ephemeral runs are not
      // persisted to disk, so a later `codex exec resume <threadId>` would
      // have nothing to resume. Persisted (default) sessions live under
      // ~/.codex and are exactly what makes cross-call resume possible.
      const cmd = threadId
        ? `codex exec --json --skip-git-repo-check resume "${threadId}" "${escaped}"`
        : `codex exec --json --skip-git-repo-check "${escaped}"`

      const output = execSync(cmd, {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      })

      // Parse JSONL, extract the last assistant_message
      const lines = output.trim().split("\n")
      let lastMessage = ""
      let newThreadId = ""

      for (const line of lines) {
        try {
          const event = JSON.parse(line)
          if (event.type === "thread.started") {
            newThreadId = event.thread_id
          }
          if (event.type === "item.completed" && event.item?.type === "agent_message") {
            lastMessage = event.item.text
          }
        } catch {
          // Ignore parse errors on non-JSON lines
        }
      }

      // Update session with new thread_id for future resumption
      if (newThreadId && !threadId) {
        session.providerBindings.codex = { threadId: newThreadId }
      }

      return {
        content: lastMessage || "(no response)",
        raw: { threadId: newThreadId, output }
      }
    } catch (err) {
      return {
        content: `Error invoking Codex: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  private buildContext(session: SessionState): string {
    if (!session.transcript.length) return ""

    // Only include recent turns (last 10) to avoid token bloat
    const recentTurns = session.transcript.slice(-10)
    return recentTurns
      .map(t => `[${t.provider.toUpperCase()}] ${t.role}: ${t.content}`)
      .join("\n")
  }
}
