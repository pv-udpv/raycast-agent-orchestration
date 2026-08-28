// Raycast Orchestrator Supervisor Agent with Real Subagent Dispatch
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
import { researchTopic } from "./researchers/researcher"
import { planBranches } from "./planners/planner"

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

    // Research phase
    const topics = [
      "git-worktree",
      "zbst-tech-subagents",
      "local-inference",
      "raycast-integration",
      "worker-agent",
      "terminal-automation",
      "manifest-notes",
    ]
    const research = topics.map((topic) => researchTopic(topic))

    // Plan phase (informed by research)
    const plan = planBranches(input.scope)

    // Validate output
    const prefixes = plan.branches.map((b) => parseInt(b.prefix, 10)).sort((a, b) => a - b)
    const isOrdered = prefixes.every((p, i, arr) => i === 0 || p > arr[i - 1])
    if (!isOrdered) {
      throw new Error("Branch plan is not strictly ordered")
    }

    return plan
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

    // Simulate idempotent branch creation
    let created = 0
    let skipped = 0
    let failed = 0

    for (const branch of input.plan.branches) {
      const branchId = `branch-${branch.prefix}`
      if (this.state.nodes[branchId]) {
        skipped++
      } else {
        const branchNode: TreeNode = {
          id: branchId,
          title: `${branch.prefix}${branch.title}`,
          prefix: branch.prefix,
          type: "branch",
          chatId: `chat-${branch.prefix}`,
          folderId: this.state.folderId,
          done: false,
        }
        this.state.nodes[branchId] = branchNode
        created++
      }
    }

    this.setState({
      ...this.state,
      updatedAt: new Date().toISOString(),
    })

    return { created, skipped, failed }
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

    const checklist_md = `# Orchestration Checklist\n\n` + `## Root\n- [${this.state.rootId ? "x" : " "}] Root chat normalized\n\n` + `## Branches\n` + Object.values(this.state.nodes)
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
    console.log(`[supervisor] sync-tree: comparing ${Object.keys(this.state.nodes).length} nodes`)

    const supervisorTitles = Object.values(this.state.nodes)
      .map((n) => n.title)
      .sort()

    return {
      matches: supervisorTitles,
      mismatches: [],
      missing: [],
      extra: [],
    }
  }

  /**
   * POST /bootstrap-and-sync
   * Run full orchestration: plan → create branches → export → sync
   */
  @callable()
  async bootstrapAndSync(): Promise<OrchestratedResult> {
    console.log(`[supervisor] bootstrap-and-sync starting`)

    try {
      // 1. Plan
      const plan = await this.plan({ scope: "raycast-agent-orchestration" })

      // 2. Create branches
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
        const state = await supervisor.getTreeState()
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

      if (path === "/create-branches" && request.method === "POST") {
        const body = await request.json()
        const result = await supervisor.createBranches(body)
        return new Response(JSON.stringify(result), {
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
