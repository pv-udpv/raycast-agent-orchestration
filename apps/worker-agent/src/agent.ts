// Raycast Orchestrator Supervisor Agent
// Coordinates research, planning, tree normalization, and branch creation

import { Agent, callable } from "agents"
import type {
  TreeState,
  BranchPlan,
  ManifestExport,
  DriftReport,
  OrchestratedResult,
  ResearchResult,
} from "../../raycast-extension/src/types"

export type SupervisorState = {
  treeId: string
  name: string
  rootId?: string
  folderId?: string
  nodes: Record<string, TreeNode>
  createdAt: string
  updatedAt: string
  driftReport?: DriftReport
  lastExportHash?: string
}

export type TreeNode = {
  id: string
  title: string
  prefix: string
  type: "root" | "branch"
  chatId?: string
  folderId?: string
  done: boolean
}

export class RaycastOrchestratorSupervisor extends Agent<Env, SupervisorState> {
  initialState: SupervisorState = {
    treeId: crypto.randomUUID(),
    name: "raycast-agent-orchestration",
    nodes: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  /**
   * GET /state
   * Read-only: return current tree state
   */
  @callable()
  async getTreeState(): Promise<TreeState> {
    return {
      treeId: this.state.treeId,
      name: this.state.name,
      rootId: this.state.rootId,
      folderId: this.state.folderId,
      nodes: this.state.nodes,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    }
  }

  /**
   * POST /plan
   * Dispatch researcher + planner agents
   * Input: scope + optional research results
   * Output: ordered branch plan
   */
  @callable()
  async plan(input: { scope: string; research?: ResearchResult[] }): Promise<BranchPlan> {
    console.log(`[supervisor] plan: scope="${input.scope}"`)

    // TODO: Dispatch researcher-agent for each topic in parallel
    // TODO: Dispatch planner-agent with research results
    // TODO: Validate output (no duplicate prefixes, increasing order)

    return {
      root: "00-root",
      branches: [
        { prefix: "10-", title: "git-worktree", owner: "infrastructure", dependencies: [] },
        { prefix: "20-", title: "zbst-tech-subagents", owner: "orchestration", dependencies: [] },
        { prefix: "30-", title: "local-inference", owner: "routing", dependencies: [] },
        { prefix: "40-", title: "raycast-integration", owner: "ui", dependencies: [] },
        { prefix: "50-", title: "worker-agent", owner: "backend", dependencies: [] },
        { prefix: "60-", title: "terminal-automation", owner: "ops", dependencies: [] },
        { prefix: "70-", title: "manifest-notes", owner: "state", dependencies: [] },
        { prefix: "80-", title: "comparison-matrix", owner: "decisions", dependencies: [] },
        { prefix: "90-", title: "notes-and-findings", owner: "scratch", dependencies: [] },
      ],
    }
  }

  /**
   * POST /normalize-root
   * Update supervisor state with root chat metadata
   */
  @callable()
  async normalizeRoot(input: { chatId: string; folderId: string; title: string }): Promise<void> {
    console.log(`[supervisor] normalize-root: chatId=${input.chatId}, title=${input.title}`)

    const rootNode: TreeNode = {
      id: input.chatId,
      title: input.title,
      prefix: "00-",
      type: "root",
      chatId: input.chatId,
      folderId: input.folderId,
      done: true,
    }

    this.setState({
      ...this.state,
      rootId: input.chatId,
      folderId: input.folderId,
      nodes: {
        ...this.state.nodes,
        [input.chatId]: rootNode,
      },
      updatedAt: new Date().toISOString(),
    })
  }

  /**
   * POST /create-branches
   * Dispatch raycast-agent to create branch chats (idempotent)
   */
  @callable()
  async createBranches(input: { plan: BranchPlan }): Promise<{ created: number; skipped: number; failed: number }> {
    console.log(`[supervisor] create-branches: ${input.plan.branches.length} branches`)

    // TODO: Dispatch raycast-agent for each branch in parallel
    // TODO: Handle idempotency (skip if branch already exists)
    // TODO: Collect results

    return { created: input.plan.branches.length, skipped: 0, failed: 0 }
  }

  /**
   * POST /export-manifest
   * Serialize tree state to JSON + Markdown
   */
  @callable()
  async exportManifest(): Promise<ManifestExport> {
    console.log(`[supervisor] export-manifest`)

    const tree_json = {
      treeId: this.state.treeId,
      name: this.state.name,
      rootId: this.state.rootId,
      branches: Object.values(this.state.nodes)
        .filter((n) => n.type === "branch")
        .sort((a, b) => a.prefix.localeCompare(b.prefix))
        .map((n) => ({ prefix: n.prefix, title: n.title, chatId: n.chatId })),
    }

    const tree_md = `# ${this.state.name}\n\n` + `**ID:** ${this.state.treeId}\n\n` + `## Branches\n\n` + Object.values(this.state.nodes)
      .filter((n) => n.type === "branch")
      .sort((a, b) => a.prefix.localeCompare(b.prefix))
      .map((n) => `- ${n.prefix} ${n.title}`)
      .join("\n")

    const checklist_md = `# Orchestration Checklist\n\n` + `## Root\n- [ ] ${this.state.rootId ? "✓" : "○"} Root chat normalized\n\n` + `## Branches\n` + Object.values(this.state.nodes)
      .filter((n) => n.type === "branch")
      .sort((a, b) => a.prefix.localeCompare(b.prefix))
      .map((n) => `- [${n.done ? "x" : " "}] ${n.prefix} ${n.title}`)
      .join("\n")

    return { tree_json, tree_md, checklist_md }
  }

  /**
   * POST /sync-tree
   * Compare supervisor state vs actual Raycast chats
   * Detect mismatches, missing branches, extra chats
   */
  @callable()
  async syncTree(input: { currentChats: unknown[] }): Promise<DriftReport> {
    console.log(`[supervisor] sync-tree: comparing ${Object.keys(this.state.nodes).length} nodes vs ${(input.currentChats as unknown[]).length} chats`)

    // TODO: Implement actual sync logic
    // For now, return clean report

    return {
      matches: Object.values(this.state.nodes).map((n) => n.title),
      mismatches: [],
      missing: [],
      extra: [],
    }
  }

  /**
   * POST /bootstrap-and-sync
   * Run full orchestration: normalize → create branches → export → sync
   */
  @callable()
  async bootstrapAndSync(): Promise<OrchestratedResult> {
    console.log(`[supervisor] bootstrap-and-sync starting`)

    try {
      // 1. Plan
      const plan = await this.plan({ scope: "raycast-agent-orchestration" })

      // 2. Create branches (would normally dispatch to raycast-agent)
      const branches = await this.createBranches({ plan })

      // 3. Export manifest
      const manifest = await this.exportManifest()

      // 4. Sync
      const drift = await this.syncTree({ currentChats: [] })

      return {
        success: true,
        plan,
        branches,
        manifest,
        drift,
        errors: [],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[supervisor] bootstrap-and-sync failed: ${message}`)
      return {
        success: false,
        errors: [message],
      }
    }
  }
}

/**
 * HTTP request handler
 * Route to callable methods or return 404
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Get or create supervisor DO instance
      const id = env.supervisor.idFromName("default")
      const supervisor = env.supervisor.get(id)

      // Route to callable methods
      if (path === "/state" && request.method === "GET") {
        const state = await supervisor.state({ method: "getTreeState" })
        return new Response(JSON.stringify(state), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/plan" && request.method === "POST") {
        const body = await request.json()
        const plan = await supervisor.plan(body)
        return new Response(JSON.stringify(plan), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/normalize-root" && request.method === "POST") {
        const body = await request.json()
        await supervisor.normalizeRoot(body)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/export-manifest" && request.method === "GET") {
        const manifest = await supervisor.exportManifest()
        return new Response(JSON.stringify(manifest), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/sync-tree" && request.method === "POST") {
        const body = await request.json()
        const drift = await supervisor.syncTree(body)
        return new Response(JSON.stringify(drift), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/bootstrap-and-sync" && request.method === "POST") {
        const result = await supervisor.bootstrapAndSync()
        return new Response(JSON.stringify(result), {
          headers: { "content-type": "application/json" },
        })
      }

      // Not found
      return new Response(JSON.stringify({ error: "Not found", path }), {
        status: 404,
        headers: { "content-type": "application/json" },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "content-type": "application/json" },
      })
    }
  },
}
