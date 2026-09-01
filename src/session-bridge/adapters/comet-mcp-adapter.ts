import { SessionState, ProviderId, AdapterResult } from "../types"
import { execSync, spawn } from "child_process"

/**
 * Comet/pplx-mcp-server adapter.
 *
 * Routes prompts through the Perplexity MCP server (pplx-mcp-server),
 * which exposes:
 * - chat.complete: local OpenAI-compatible chat
 * - session_ask: Perplexity web session with web awareness
 * - agent.plan: local agent planning
 *
 * This adapter spawns the MCP server as stdio and calls tools via JSON-RPC 2.0.
 */

export class CometAdapter {
  id: ProviderId = "comet"
  private mcpServerPath = "/Users/pv/Documents/Perplexity/pplx-mcp-server"

  async send(session: SessionState, prompt: string): Promise<AdapterResult> {
    // Prefer web-aware session tool if available; fall back to local chat
    try {
      // Try session_ask (web-aware)
      const result = await this.callMcpTool("session_ask", {
        question: this.buildContextQuestion(session, prompt)
      })
      return result
    } catch (err) {
      console.error("session_ask failed, falling back to chat.complete:", err)
      // Fall back to local chat.complete
      return this.callMcpTool("chat.complete", {
        messages: this.buildMessages(session, prompt)
      })
    }
  }

  private async callMcpTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<AdapterResult> {
    return new Promise((resolve, reject) => {
      let output = ""
      let requestId = 1

      // Spawn pplx-mcp as stdio process
      const proc = spawn("python", ["-m", "pplx_mcp"], {
        cwd: this.mcpServerPath,
        env: {
          ...process.env,
          PYTHONPATH: `${this.mcpServerPath}/src`,
          CHAT_BASE_URL: "http://127.0.0.1:49317/v1",
          EMBED_BASE_URL: "http://127.0.0.1:49319/v1",
          AGENT_BASE_URL: "http://127.0.0.1:49320"
        }
      })

      let initialized = false
      const responses: Record<number, unknown> = {}

      // Send initialize
      proc.stdin!.write(
        JSON.stringify({
          jsonrpc: "2.0",
          id: requestId++,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "raycast-orchestrator", version: "1.0.0" }
          }
        }) + "\n"
      )

      proc.stdout!.on("data", (chunk: Buffer) => {
        output += chunk.toString()

        // Parse newline-delimited JSON-RPC responses
        const lines = output.split("\n")
        output = lines.pop() || "" // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const response = JSON.parse(line)

            if (!initialized && response.id === 0) {
              initialized = true
              // Now send tools/list to get available tools
              proc.stdin!.write(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: requestId++,
                  method: "tools/list",
                  params: {}
                }) + "\n"
              )
              continue
            }

            // Store response
            if (response.id) {
              responses[response.id] = response
            }

            // If we got the tool call result, return it
            if (
              response.id === requestId - 1 &&
              response.result?.content?.[0]?.text
            ) {
              proc.kill()
              resolve({
                content: response.result.content[0].text,
                raw: response.result
              })
              return
            }

            // If tools/list response, call the tool
            if (
              response.result?.tools &&
              initialized &&
              !responses[requestId - 1]
            ) {
              const tool = response.result.tools.find(
                (t: { name: string }) => t.name === toolName
              )
              if (tool) {
                proc.stdin!.write(
                  JSON.stringify({
                    jsonrpc: "2.0",
                    id: requestId++,
                    method: "tools/call",
                    params: {
                      name: toolName,
                      arguments: params
                    }
                  }) + "\n"
                )
              }
            }
          } catch (e) {
            console.error("Parse error:", e, line)
          }
        }
      })

      proc.stderr!.on("data", (chunk: Buffer) => {
        // Log stderr but don't block
        console.error("[comet-mcp]", chunk.toString())
      })

      proc.on("close", (code: number) => {
        if (code !== 0) {
          reject(new Error(`pplx-mcp exited with code ${code}`))
        } else {
          reject(
            new Error(
              `pplx-mcp exited without returning a result for ${toolName}`
            )
          )
        }
      })

      proc.on("error", (err: Error) => {
        reject(err)
      })

      // Timeout after 60s
      setTimeout(() => {
        proc.kill()
        reject(new Error(`Timeout calling ${toolName}`))
      }, 60000)
    })
  }

  private buildContextQuestion(session: SessionState, prompt: string): string {
    if (!session.transcript.length) return prompt

    // Inject recent context as a preamble
    const recentTurns = session.transcript.slice(-8)
    const context = recentTurns
      .map(t => `[${t.provider}] ${t.role}: ${t.content}`)
      .join("\n\n")

    return `${context}\n\n[comet] user: ${prompt}`
  }

  private buildMessages(
    session: SessionState,
    prompt: string
  ): Array<{ role: "user" | "assistant"; content: string }> {
    const messages: Array<{ role: "user" | "assistant"; content: string }> = []

    // Replay transcript
    for (const turn of session.transcript) {
      messages.push({
        role: turn.role,
        content: `[${turn.provider}] ${turn.content}`
      })
    }

    // Add current prompt
    messages.push({
      role: "user",
      content: prompt
    })

    return messages
  }
}
