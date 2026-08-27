/**
 * Individual Subagent Implementations
 * 
 * Each subagent is a Durable Object with a generic RPC fetch handler.
 * Supervisor dispatches JSON RPC-like requests:
 *   POST /rpc
 *   { "method": "research", "input": { ... } }
 */

import { Agent, callable } from "agents"

export type RpcEnvelope = {
  method: string
  input?: unknown
  orchestrationId?: string
}

/**
 * Base class that adds a generic RPC HTTP interface to all agents.
 */
export class RpcEnabledAgent<Env = any, State = any> extends Agent<Env, State> {
  async fetch(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url)
      const contentType = req.headers.get("content-type") || "application/json"

      if (req.method === "GET" && url.pathname === "/health") {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" }
        })
      }

      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json" }
        })
      }

      if (!contentType.includes("application/json")) {
        return new Response(JSON.stringify({ error: "Expected application/json" }), {
          status: 415,
          headers: { "content-type": "application/json" }
        })
      }

      const body = (await req.json()) as RpcEnvelope
      const methodName = String(body.method || "").trim()
      if (!methodName) {
        return new Response(JSON.stringify({ error: "Missing method" }), {
          status: 400,
          headers: { "content-type": "application/json" }
        })
      }

      const handler = (this as any)[methodName]
      if (typeof handler !== "function") {
        return new Response(JSON.stringify({ error: `Unknown method: ${methodName}` }), {
          status: 404,
          headers: { "content-type": "application/json" }
        })
      }

      const result = await handler.call(this, body.input ?? {})
      return new Response(JSON.stringify({ ok: true, result }), {
        headers: { "content-type": "application/json" }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "content-type": "application/json" }
      })
    }
  }
}

/**
 * Researcher Agent — Deep investigation per topic
 */
export class ResearcherAgent extends RpcEnabledAgent<any, any> {
  initialState = { topic: "", findings: [] }

  @callable()
  async research(input: { topic: string }) {
    console.log(`[RESEARCHER] Investigating: ${input.topic}`)

    // Stub findings; in real impl, call web search + LLM analysis
    const findings = {
      topic: input.topic,
      best_practices: [],
      anti_patterns: [],
      gotchas: [],
      risks: [],
      recommendations: [],
      references: []
    }

    this.setState({ topic: input.topic, findings })
    return findings
  }
}

/**
 * Planner Agent — Decompose workload into branches
 */
export class PlannerAgent extends RpcEnabledAgent<any, any> {
  initialState = { plan: null }

  @callable()
  async plan(input: { scope: string; research?: unknown[] }) {
    console.log(`[PLANNER] Planning workload: ${input.scope}`)

    const plan = {
      root: "00-root",
      branches: [
        { prefix: "10-", title: "git-worktree", owner: "worktree-agent" },
        { prefix: "20-", title: "zbst-tech-subagents", owner: "supervisor" },
        { prefix: "30-", title: "local-inference", owner: "inference-agent" },
        { prefix: "40-", title: "raycast-integration", owner: "raycast-agent" },
        { prefix: "50-", title: "worker-agent", owner: "supervisor" },
        { prefix: "60-", title: "terminal-automation", owner: "terminal-agent" },
        { prefix: "70-", title: "manifest-notes", owner: "manifest-agent" },
        { prefix: "80-", title: "comparison-matrix", owner: "supervisor" },
        { prefix: "90-", title: "notes-and-findings", owner: "supervisor" }
      ]
    }

    this.setState({ plan })
    return plan
  }
}

/**
 * Tree Agent — Normalize chat/folder structure
 */
export class TreeAgent extends RpcEnabledAgent<any, any> {
  initialState = { treeState: null }

  @callable()
  async normalizeTree(input: { chatId?: string; research?: unknown[] }) {
    console.log(`[TREE] Normalizing chat tree`)

    const treeState = {
      rootChatId: input.chatId || "unknown",
      nodes: [],
      normalized: true
    }

    this.setState({ treeState })
    return treeState
  }
}

/**
 * Worktree Agent — Git worktree layout
 */
export class WorktreeAgent extends RpcEnabledAgent<any, any> {
  initialState = { worktreeLayout: null }

  @callable()
  async mapWorktrees(input: { plan: unknown; research?: unknown[] }) {
    console.log(`[WORKTREE] Mapping git worktrees`)

    const commands = [
      "git worktree add worktrees/wt-10-git-worktree -b 10-git-worktree",
      "git worktree add worktrees/wt-20-zbst-tech-subagents -b 20-zbst-tech-subagents",
      "git worktree add worktrees/wt-30-local-inference -b 30-local-inference",
      "git worktree add worktrees/wt-40-raycast-integration -b 40-raycast-integration",
      "git worktree add worktrees/wt-50-worker-agent -b 50-worker-agent",
      "git worktree add worktrees/wt-60-terminal-automation -b 60-terminal-automation",
      "git worktree add worktrees/wt-70-manifest-notes -b 70-manifest-notes",
      "git worktree add worktrees/wt-80-comparison-matrix -b 80-comparison-matrix",
      "git worktree add worktrees/wt-90-notes-and-findings -b 90-notes-and-findings"
    ]

    const layout = { commands, status: "ready" }
    this.setState({ worktreeLayout: layout })
    return layout
  }
}

/**
 * Raycast Agent — Chat and folder operations
 */
export class RaycastAgent extends RpcEnabledAgent<any, any> {
  initialState = { raycastOps: null }

  @callable()
  async executeRaycastOps(input: { plan: unknown; research?: unknown[] }) {
    console.log(`[RAYCAST] Preparing Raycast operations`)

    const ops = {
      createFolder: { name: "00-ollama-launch-harness-research" },
      normalizeChatTitle: { to: "00-root-ollama-launch-harness-research" },
      branchChats: [
        { title: "10-git-worktree" },
        { title: "20-zbst-tech-subagents" },
        { title: "30-local-inference" },
        { title: "40-raycast-integration" },
        { title: "50-worker-agent" },
        { title: "60-terminal-automation" },
        { title: "70-manifest-notes" },
        { title: "80-comparison-matrix" },
        { title: "90-notes-and-findings" }
      ],
      status: "planned"
    }

    this.setState({ raycastOps: ops })
    return ops
  }
}

/**
 * Inference Agent — Model routing
 */
export class InferenceAgent extends RpcEnabledAgent<any, any> {
  initialState = { routingPolicy: null }

  @callable()
  async defineRouting(input: { available: boolean; research?: unknown[] }) {
    console.log(`[INFERENCE] Defining model routing policy`)

    const routing = {
      strategy: "4-tier fallback",
      tiers: [
        { name: "local-primary", type: "local", priority: 1 },
        { name: "local-secondary", type: "local", priority: 2 },
        { name: "remote-cloud", type: "remote", priority: 3 },
        { name: "manual", type: "manual", priority: 4 }
      ],
      latencyBudgets: {
        "tree-normalization": 2000,
        "manifest-export": 1000,
        "complex-reasoning": 10000
      }
    }

    this.setState({ routingPolicy: routing })
    return routing
  }
}

/**
 * Manifest Agent — Tree export and drift detection
 */
export class ManifestAgent extends RpcEnabledAgent<any, any> {
  initialState = { manifest: null }

  @callable()
  async exportManifest(input: { plan: unknown; research?: unknown[] }) {
    console.log(`[MANIFEST] Exporting tree manifest`)

    const manifest = {
      treeId: crypto.randomUUID(),
      name: "raycast-agent-orchestration",
      rootId: "00-root",
      branches: 9,
      exportedAt: new Date().toISOString(),
      files: ["tree.json", "tree.md", "checklist.md"]
    }

    this.setState({ manifest })
    return manifest
  }
}

/**
 * Terminal Agent — Shell operations
 */
export class TerminalAgent extends RpcEnabledAgent<any, any> {
  initialState = { terminalOps: null }

  @callable()
  async executeTerminalOps(input: { commands: string[] }) {
    console.log(`[TERMINAL] Preparing terminal operations`)

    const ops = {
      commands: input.commands || [],
      safe: true,
      status: "ready-to-execute"
    }

    this.setState({ terminalOps: ops })
    return ops
  }
}
