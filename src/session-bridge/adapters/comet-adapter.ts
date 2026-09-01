import { spawn } from "child_process"
import { SessionState, ProviderId, AdapterResult } from "../types"

/**
 * Comet / pplx-mcp-server adapter.
 * Spawns stdio MCP process at /Users/pv/Documents/Perplexity/pplx-mcp-server
 * Calls session_ask (web-aware Perplexity session) tool.
 * Returns web context + reasoning in results.
 */

interface MCPMessage {
  jsonrpc: "2.0"
  id?: string | number
  method?: string
  params?: unknown
  result?: unknown
  error?: { code: number; message: string }
}

export class CometAdapter {
  id: ProviderId = "comet"
  private mcp_dir = "/Users/pv/Documents/Perplexity/pplx-mcp-server"

  async send(session: SessionState, prompt: string): Promise<AdapterResult> {
    return this.callMCPTool("session_ask", {
      question: prompt,
      context_uuid: session.providerBindings.comet?.sessionUuid || undefined
    })
  }

  private async callMCPTool(
    toolName: string,
    input: Record<string, unknown>
  ): Promise<AdapterResult> {
    return new Promise((resolve, reject) => {
      const proc = spawn("python", ["-m", "pplx_mcp"], {
        cwd: this.mcp_dir,
        env: {
          ...process.env,
          PYTHONPATH: `${this.mcp_dir}/src:${process.env.PYTHONPATH || ""}`
        }
      })

      let stdout = ""
      let stderr = ""
      let responseReceived = false

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString()
        // Try to parse incoming lines as JSON-RPC
        const lines = stdout.split("\n")
        for (const line of lines.slice(0, -1)) {
          if (line.trim()) {
            try {
              const msg = JSON.parse(line) as MCPMessage
              if (msg.id === 1 && (msg.result || msg.error)) {
                responseReceived = true
                proc.stdin.destroy()
                proc.kill()
              }
            } catch {
              // Not JSON yet
            }
          }
        }
        stdout = lines[lines.length - 1]
      })

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString()
      })

      proc.on("close", (code: number) => {
        if (responseReceived) {
          try {
            const lines = stdout.split("\n").filter((l: string) => l.trim())
            for (const line of lines) {
              const msg = JSON.parse(line) as MCPMessage
              if (msg.id === 1 && msg.result) {
                const result = msg.result as { content?: Array<{ text?: string }> }
                const text =
                  result.content?.[0]?.text ||
                  JSON.stringify(result).slice(0, 500)
                return resolve({
                  content: text,
                  raw: { tool: toolName, mcp_result: result }
                })
              }
              if (msg.id === 1 && msg.error) {
                return resolve({
                  content: `MCP error: ${msg.error.message}`
                })
              }
            }
            resolve({
              content: "(no response from MCP)"
            })
          } catch (e) {
            resolve({
              content: `Error parsing MCP response: ${e instanceof Error ? e.message : String(e)}`
            })
          }
        } else {
          resolve({
            content: `MCP process ended with code ${code}. stderr: ${stderr.slice(0, 200)}`
          })
        }
      })

      // Send initialize
      const initMsg: MCPMessage = {
        jsonrpc: "2.0",
        id: "init",
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "raycast-orchestrator", version: "1.0.0" }
        }
      }
      proc.stdin.write(JSON.stringify(initMsg) + "\n")

      // After init, send tool call
      setTimeout(() => {
        const toolMsg: MCPMessage = {
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: input
          }
        }
        proc.stdin.write(JSON.stringify(toolMsg) + "\n")
      }, 100)

      setTimeout(() => {
        if (!responseReceived) {
          proc.kill()
          resolve({
            content: `MCP timeout calling ${toolName}`
          })
        }
      }, 30000)
    })
  }
}
