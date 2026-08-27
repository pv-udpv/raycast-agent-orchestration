/**
 * Supervisor Agent — Entry point for Raycast Agent Orchestration
 * 
 * Hosted on zbst.tech Cloudflare Workers (orchestrator.zbst.tech)
 * Coordinates 8 specialist subagents via Durable Objects + RPC
 * 
 * Each subagent is a Durable Object with a generic fetch handler that
 * accepts RPC-like JSON requests: POST /rpc { method, input }
 * 
 * API:
 * POST /agents/supervisor/{instanceId}/orchestrate — Kick off orchestration
 * GET /agents/supervisor/{instanceId}/state — Read current state
 * GET /agents/supervisor/{instanceId}/agents — List available subagents
 */

import { Agent, routeAgentRequest, callable } from "agents"

export interface Env {
  Supervisor: DurableObjectNamespace
  ResearcherAgent: DurableObjectNamespace
  PlannerAgent: DurableObjectNamespace
  TreeAgent: DurableObjectNamespace
  WorktreeAgent: DurableObjectNamespace
  RaycastAgent: DurableObjectNamespace
  InferenceAgent: DurableObjectNamespace
  ManifestAgent: DurableObjectNamespace
  TerminalAgent: DurableObjectNamespace
}

type State = {
  orchestrationId: string
  status: "idle" | "orchestrating" | "complete" | "failed"
  phase: "research" | "planning" | "fan-out" | "finalization"
  results: Record<string, unknown>
  errors: string[]
  createdAt: string
  updatedAt: string
}

export class Supervisor extends Agent<Env, State> {
  initialState: State = {
    orchestrationId: crypto.randomUUID(),
    status: "idle",
    phase: "research",
    results: {},
    errors: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  @callable()
  async orchestrate(input: {
    workloadScope: string
    currentChatId?: string
    folderId?: string
    repoPath?: string
  }) {
    console.log(`[SUPERVISOR] Orchestration started: ${input.workloadScope}`)

    this.setState({
      ...this.state,
      status: "orchestrating",
      phase: "research",
      updatedAt: new Date().toISOString()
    })

    try {
      const results: Record<string, unknown> = {}

      // Phase 1: Research (parallel across all topics)
      const topics = [
        "git-worktree",
        "zbst-tech-subagents",
        "local-inference",
        "raycast-integration",
        "worker-agent",
        "terminal-automation",
        "manifest-notes"
      ]

      console.log(`[SUPERVISOR] Phase 1: Research on ${topics.length} topics (parallel)`)
      const researchResults = await Promise.all(
        topics.map(topic => this.dispatch("ResearcherAgent", "research", { topic }))
      )
      results.research = researchResults

      // Phase 2: Planning (informed by research, sequential)
      this.setState({
        ...this.state,
        phase: "planning",
        updatedAt: new Date().toISOString()
      })

      console.log("[SUPERVISOR] Phase 2: Planning (sequential)")
      const planResult = await this.dispatch("PlannerAgent", "plan", {
        scope: input.workloadScope,
        research: researchResults
      })
      results.plan = planResult

      // Phase 3: Fan-out (all informed by research and plan, parallel)
      this.setState({
        ...this.state,
        phase: "fan-out",
        updatedAt: new Date().toISOString()
      })

      console.log("[SUPERVISOR] Phase 3: Fan-out (parallel)")
      const [treeResult, worktreeResult, raycastResult, inferenceResult, manifestResult] = await Promise.all([
        this.dispatch("TreeAgent", "normalizeTree", { chatId: input.currentChatId, research: researchResults }),
        this.dispatch("WorktreeAgent", "mapWorktrees", { plan: planResult, research: researchResults }),
        this.dispatch("RaycastAgent", "executeRaycastOps", { plan: planResult, research: researchResults }),
        this.dispatch("InferenceAgent", "defineRouting", { available: true, research: researchResults }),
        this.dispatch("ManifestAgent", "exportManifest", { plan: planResult, research: researchResults })
      ])

      results.tree = treeResult
      results.worktrees = worktreeResult
      results.raycast = raycastResult
      results.inference = inferenceResult
      results.manifest = manifestResult

      // Phase 4: Finalization (terminal ops, sequential)
      this.setState({
        ...this.state,
        phase: "finalization",
        updatedAt: new Date().toISOString()
      })

      console.log("[SUPERVISOR] Phase 4: Finalization (sequential)")
      const terminalResult = await this.dispatch("TerminalAgent", "executeTerminalOps", {
        commands: worktreeResult?.commands || []
      })
      results.terminal = terminalResult

      // Complete
      this.setState({
        ...this.state,
        status: "complete",
        results,
        updatedAt: new Date().toISOString()
      })

      console.log(`[SUPERVISOR] ✓ Orchestration complete: ${this.state.orchestrationId}`)

      return {
        status: "ok",
        orchestrationId: this.state.orchestrationId,
        results,
        phase: this.state.phase
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.setState({
        ...this.state,
        status: "failed",
        errors: [...this.state.errors, message],
        updatedAt: new Date().toISOString()
      })
      console.error(`[SUPERVISOR] ✗ Orchestration failed: ${message}`)
      throw err
    }
  }

  @callable()
  async getState() {
    return this.state
  }

  @callable()
  async listAgents() {
    return {
      agents: [
        { role: "researcher", domain: "deep investigation", sequencing: "early" },
        { role: "planner", domain: "decomposition and sequencing", sequencing: "early" },
        { role: "tree", domain: "chat/folder normalization", sequencing: "parallel" },
        { role: "worktree", domain: "git worktree layout", sequencing: "parallel" },
        { role: "raycast", domain: "Raycast operations", sequencing: "parallel" },
        { role: "inference", domain: "model routing", sequencing: "parallel" },
        { role: "manifest", domain: "tree export and drift", sequencing: "parallel" },
        { role: "terminal", domain: "safe shell execution", sequencing: "late" }
      ],
      orchestrationId: this.state.orchestrationId,
      status: this.state.status
    }
  }

  /**
   * Dispatch a task to a specific subagent Durable Object via RPC fetch
   *
   * @param agentNamespace The DO namespace key (e.g., "ResearcherAgent")
   * @param method The @callable method name on the subagent (e.g., "research")
   * @param input Task input payload
   * @returns Promise of the subagent's response
   */
  private async dispatch(
    agentNamespace: string,
    method: string,
    input: unknown
  ): Promise<unknown> {
    try {
      const ns = this.env[agentNamespace as keyof Env] as DurableObjectNamespace | undefined

      if (!ns) {
        throw new Error(`No Durable Object namespace for ${agentNamespace}`)
      }

      // Get or create a singleton instance for this agent
      const id = ns.idFromName("singleton")
      const stub = ns.get(id)

      // Dispatch RPC call via fetch to the subagent's HTTP handler
      const response = await stub.fetch("https://agent/rpc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          method,
          input,
          orchestrationId: this.state.orchestrationId,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`${agentNamespace}.${method}() returned ${response.status}: ${text}`)
      }

      const result = await response.json() as { ok: boolean; result?: unknown; error?: string }
      
      if (!result.ok && result.error) {
        throw new Error(`${agentNamespace}.${method}() error: ${result.error}`)
      }

      const payload = result.result ?? {}
      console.log(
        `[SUPERVISOR] ✓ ${agentNamespace}.${method}() → ${JSON.stringify(payload).slice(0, 80)}...`
      )

      return payload
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[SUPERVISOR] ✗ Dispatch failed for ${agentNamespace}.${method}: ${message}`)
      throw err
    }
  }
}

// Export handler for Cloudflare Workers
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    // Route to agents via the built-in routing (agents SDK)
    if (url.pathname.startsWith("/agents/")) {
      try {
        const result = routeAgentRequest(req, env)
        if (result) {
          return result
        }
      } catch (err) {
        console.error("[HANDLER] Agent routing error:", err)
        return new Response(
          JSON.stringify({ error: String(err) }),
          { status: 500, headers: { "content-type": "application/json" } }
        )
      }
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ ok: true, timestamp: new Date().toISOString(), service: "orchestrator" }),
        { headers: { "content-type": "application/json" } }
      )
    }

    // API docs
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        JSON.stringify({
          service: "raycast-agent-orchestrator",
          domain: "orchestrator.zbst.tech",
          endpoints: {
            health: "GET /health",
            orchestrate: "POST /agents/supervisor/{id}/orchestrate",
            state: "GET /agents/supervisor/{id}/state",
            agents: "GET /agents/supervisor/{id}/agents"
          }
        }),
        { headers: { "content-type": "application/json" } }
      )
    }

    // Fallback
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" }
    })
  }
}
