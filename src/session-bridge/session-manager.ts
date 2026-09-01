import { SessionState, ProviderAdapter, Turn, ProviderId } from "./types"
import { CodexAdapter } from "./adapters/codex-adapter"
import { PplxAdapter } from "./adapters/pplx-adapter"
import { ClaudeAdapter } from "./adapters/claude-adapter"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

/**
 * Cross-provider session manager.
 *
 * Maintains a single session that can be sent to Codex, Perplexity, or Claude
 * without loss of context. Each provider sees its own conversation history
 * (resume thread_id for Codex; injected context for stateless providers).
 *
 * Session state persists locally to ~/.raycast-sessions/{sessionId}.json
 */

export class SessionManager {
  private adapters: Map<ProviderId, ProviderAdapter> = new Map()
  private state: SessionState
  private sessionDir = path.join(
    process.env.HOME || "/tmp",
    ".raycast-sessions"
  )

  constructor(sessionId?: string) {
    // Create directory if needed
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true })
    }

    // Initialize or load session
    const id = sessionId || this.generateSessionId()
    const statePath = path.join(this.sessionDir, `${id}.json`)

    if (fs.existsSync(statePath)) {
      this.state = JSON.parse(fs.readFileSync(statePath, "utf-8"))
    } else {
      this.state = {
        sessionId: id,
        createdAt: Date.now(),
        providerBindings: {},
        transcript: []
      }
      this.save()
    }

    // Register adapters
    this.adapters.set("codex", new CodexAdapter())
    this.adapters.set("pplx-mlx", new PplxAdapter())
    this.adapters.set("claude", new ClaudeAdapter())
  }

  /** Send a prompt to a provider; automatically record turn in session. */
  async send(provider: ProviderId, prompt: string): Promise<string> {
    const adapter = this.adapters.get(provider)
    if (!adapter) {
      throw new Error(`Unknown provider: ${provider}`)
    }

    // Record user turn
    this.state.transcript.push({
      turn: this.state.transcript.length,
      provider,
      role: "user",
      content: prompt,
      timestamp: Date.now()
    })

    // Invoke provider
    const result = await adapter.send(this.state, prompt)

    // Record assistant turn
    this.state.transcript.push({
      turn: this.state.transcript.length,
      provider,
      role: "assistant",
      content: result.content,
      timestamp: Date.now()
    })

    this.save()
    return result.content
  }

  /** Switch provider mid-session without losing context. */
  async switchProvider(provider: ProviderId, nextPrompt: string): Promise<string> {
    // The next call to send() will see the full transcript,
    // so context injection will be automatic.
    return this.send(provider, nextPrompt)
  }

  /** Export session state (for Raycast tree-agent sync, or for analysis). */
  export(): SessionState {
    return JSON.parse(JSON.stringify(this.state))
  }

  /** List all session ids in ~/.raycast-sessions. */
  static listSessions(): string[] {
    const dir = path.join(process.env.HOME || "/tmp", ".raycast-sessions")
    if (!fs.existsSync(dir)) return []

    return fs.readdirSync(dir)
      .filter(f => f.endsWith(".json"))
      .map(f => f.slice(0, -5))
  }

  /** Load existing session by id. */
  static load(sessionId: string): SessionManager {
    return new SessionManager(sessionId)
  }

  private save(): void {
    const statePath = path.join(this.sessionDir, `${this.state.sessionId}.json`)
    fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2))
  }

  private generateSessionId(): string {
    return `session-${crypto.randomBytes(8).toString("hex")}`
  }
}
