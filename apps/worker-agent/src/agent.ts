/**
 * Supervisor Agent — Entry point for Raycast Agent Orchestration
 * 
 * Hosted on zbst.tech Cloudflare Workers (orchestrator.zbst.tech)
 * Coordinates 8 specialist subagents via durable state and RPC
 * 
 * API:
 * POST /orchestrate — Kick off full orchestration
 * GET /state — Read current state
 * GET /agents — List available subagents
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

      console.log(`[SUPERVISOR] Phase 1: Research on ${topics.length} topics`)
      const researchResults = await Promise.all(
        topics.map(topic => this.callSubagent("researcher", { topic }))
      )
      results.research = researchResults

      // Phase 2: Planning (informed by research)
      this.setState({
        ...this.state,
        phase: "planning",
        updatedAt: new Date().toISOString()
      })

      console.log("[SUPERVISOR] Phase 2: Planning")
      const planResult = await this.callSubagent("planner", {
        scope: input.workloadScope,
        research: researchResults
      })
      results.plan = planResult

      // Phase 3: Fan-out (all informed by research and plan)
      this.setState({
        ...this.state,
        phase: "fan-out",
        updatedAt: new Date().toISOString()
      })

      console.log("[SUPERVISOR] Phase 3: Fan-out")
      const [treeResult, worktreeResult, raycastResult, inferenceResult, manifestResult] = await Promise.all([
        this.callSubagent("tree", { chatId: input.currentChatId, research: researchResults }),
        this.callSubagent("worktree", { plan: planResult, research: researchResults }),
        this.callSubagent("raycast", { plan: planResult, research: researchResults }),
        this.callSubagent("inference", { available: true, research: researchResults }),
        this.callSubagent("manifest", { plan: planResult, research: researchResults })
      ])

      results.tree = treeResult
      results.worktrees = worktreeResult
      results.raycast = raycastResult
      results.inference = inferenceResult
      results.manifest = manifestResult

      // Phase 4: Finalization
      this.setState({
        ...this.state,
        phase: "finalization",
        updatedAt: new Date().toISOString()
      })

      console.log("[SUPERVISOR] Phase 4: Finalization")
      const terminalResult = await this.callSubagent("terminal", {
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

      return {
        status: "ok",
        orchestrationId: this.state.orchestrationId,
        results
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.setState({
        ...this.state,
        status: "failed",
        errors: [...this.state.errors, message],
        updatedAt: new Date().toISOString()
      })
      throw err
    }
  }

  private async callSubagent(role: string, input: unknown): Promise<unknown> {
    // Stub: in real impl, dispatch to actual DO
    console.log(`[SUPERVISOR] Calling ${role}-agent with:`, input)
    return { agent: role, status: "ok", data: {} }
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)

    // Route to agents
    if (url.pathname.startsWith("/agents/")) {
      return routeAgentRequest(req, env) ?? new Response("Not found", { status: 404 })
    }

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" }
      })
    }

    // Fallback
    return new Response("Not found", { status: 404 })
  }
}
