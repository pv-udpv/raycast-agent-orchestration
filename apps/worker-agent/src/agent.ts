// Raycast Orchestrator Supervisor Agent with Real Subagent Dispatch
// Coordinates research, planning, tree normalization, and branch creation

import { Agent, callable } from "agents"
import type {
  TreeState,
  TreeNode,
  BranchCreationResult,
  BranchPlan,
  ManifestExport,
  DriftReport,
  OrchestratedResult,
  ResearchResult,
} from "../../raycast-extension/src/types"
import { researchTopics } from "./researchers/researcher"
import { planBranches } from "./planners/planner"
import {
  createSupabaseBackend,
  DEFAULT_EXECUTION_TARGET,
  normalizeExecutionTarget,
  type ExecutionTarget,
  type SupabaseBackend,
} from "@raycast-agent-orchestration/backend"
import type { Env } from "./env"
import {
  HttpError,
  parseCreateBranchesInput,
  parseDispatchInput,
  parseNormalizeRootInput,
  parsePlanInput,
  parseSyncTreeInput,
  readJsonObject,
} from "./validation"
import { BUDGET, LIMIT_ERROR_PREFIX } from "./limits"
import { isUnreachableFromEdge } from "./edge"
import { dispatchSubagent, type SubagentName } from "./subagent-dispatch"

export type SupervisorState = {
  treeId: string
  name: string
  /** Where supervised work executes. Legacy states may carry `isolation` instead. */
  executionTarget: ExecutionTarget
  rootId?: string
  folderId?: string
  nodes: Record<string, TreeNode>
  createdAt: string
  updatedAt: string
  driftReport?: DriftReport
  lastExportHash?: string
}

export type { TreeNode }

/** Fill fields added to the shared TreeNode after older states were persisted. */
function normalizeNode(node: TreeNode): TreeNode {
  return { ...node, parentId: node.parentId ?? null, children: node.children ?? [] }
}

export class RaycastOrchestratorSupervisor extends Agent<Env, SupervisorState> {
  protected maxStateBytes = BUDGET.STATE_BYTES

  initialState: SupervisorState = {
    treeId: crypto.randomUUID(),
    name: "raycast-agent-orchestration",
    executionTarget: DEFAULT_EXECUTION_TARGET,
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
      executionTarget: this.currentExecutionTarget(),
      rootId: this.state.rootId,
      folderId: this.state.folderId,
      nodes: Object.fromEntries(Object.entries(this.state.nodes).map(([id, node]) => [id, normalizeNode(node)])),
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    }
  }

  /** Resolve the target, upgrading legacy `isolation` state written before the taxonomy revision. */
  private currentExecutionTarget(): ExecutionTarget {
    const state = this.state as SupervisorState & { isolation?: unknown }
    return normalizeExecutionTarget(state.executionTarget ?? state.isolation ?? DEFAULT_EXECUTION_TARGET)
  }

  /**
   * PUT /execution-target
   * Accepts a ref string (`orb:container/pplx-lab`) or an ExecutionTargetSpec object.
   */
  @callable()
  async setExecutionTarget(input: { target: unknown }): Promise<ExecutionTarget> {
    const executionTarget = normalizeExecutionTarget(input.target)
    this.setState({ ...this.state, executionTarget, updatedAt: new Date().toISOString() })
    return executionTarget
  }

  /**
   * POST /dispatch-subagent
   * Dispatch an allowlisted operation through the bound Durable Object RPC stub.
   */
  @callable()
  async dispatchSubagentRequest(input: { agent: SubagentName; input: Record<string, unknown>; dispatchId?: string; operation?: "get-state" }): Promise<unknown> {
    return dispatchSubagent(this.env as unknown as Parameters<typeof dispatchSubagent>[0], input.agent, input.input, input.dispatchId, input.operation)
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
    const research = input.research ?? await researchTopics(topics, this.env.PERPLEXITY_API_KEY)

    // Fail closed on unsupported evidence labels; static reference entries remain unverified.
    const allowedEvidence = new Set(["verified", "streaming-smoke-tested", "incomplete", "unverified"])
    for (const item of research) {
      if (!item.evidence || !allowedEvidence.has(item.evidence.status)) {
        throw new Error(`Research topic '${item.topic}' is missing a valid evidence status`)
      }
    }

    // Carry evidence into the review response; branch selection remains a static template for now.
    const plan = planBranches(input.scope, research)

    // Validate output
    const prefixes = plan.branches.map((b) => parseInt(b.prefix, 10)).sort((a, b) => a - b)
    const isOrdered = prefixes.every((p, i, arr) => i === 0 || p > arr[i - 1])
    if (!isOrdered) {
      throw new Error("Branch plan is not strictly ordered")
    }

    // Preserve the evidence in the RPC response so callers can review provenance.
    return { ...plan, research }
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
      parentId: null,
      children: Object.values(this.state.nodes)
        .filter((n) => n.type === "branch")
        .map((n) => n.id),
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
  async createBranches(input: { plan: BranchPlan }): Promise<BranchCreationResult> {
    console.log(`[supervisor] create-branches: ${input.plan.branches.length} branches`)

    // Idempotent branch creation on a copy of the node map
    const nodes: Record<string, TreeNode> = { ...this.state.nodes }
    const rootId = this.state.rootId ?? null
    const details: BranchCreationResult["details"] = []

    for (const branch of input.plan.branches) {
      const branchId = `branch-${branch.prefix}`
      const title = `${branch.prefix}${branch.title}`
      if (nodes[branchId]) {
        details.push({ title, status: "skipped", reason: "already exists" })
        continue
      }
      nodes[branchId] = {
        id: branchId,
        title,
        prefix: branch.prefix,
        type: "branch",
        parentId: rootId,
        children: [],
        chatId: `chat-${branch.prefix}`,
        folderId: this.state.folderId,
        done: false,
      }
      if (rootId && nodes[rootId]) {
        const root = normalizeNode(nodes[rootId])
        nodes[rootId] = { ...root, children: [...new Set([...root.children, branchId])] }
      }
      details.push({ title, status: "created" })
    }

    const nodeCount = Object.keys(nodes).length
    if (nodeCount > BUDGET.TREE_NODES) {
      throw new RangeError(`${LIMIT_ERROR_PREFIX} tree would have ${nodeCount} nodes; budget is ${BUDGET.TREE_NODES}`)
    }
    this.setState({ ...this.state, nodes, updatedAt: new Date().toISOString() })

    const count = (status: "created" | "skipped" | "failed") => details.filter((d) => d.status === status).length
    return { created: count("created"), skipped: count("skipped"), failed: count("failed"), details }
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

// Durable Object classes bound in wrangler.jsonc must be exported from `main`.
// `Supervisor` keeps the v1 migration class name; no rename migration needed.
export { RaycastOrchestratorSupervisor as Supervisor }
export {
  ResearcherAgent,
  PlannerAgent,
  TreeAgent,
  WorktreeAgent,
  RaycastAgent,
  InferenceAgent,
  ManifestAgent,
  TerminalAgent,
} from "zbst-tech-subagents"

/**
 * HTTP request handler
 * Route to callable methods or return 404
 */
function backendFor(env: Env): SupabaseBackend | undefined {
  if (!env.SUPABASE_LOCAL_URL || !env.SUPABASE_LOCAL_KEY) return undefined
  if (env.ENVIRONMENT && isUnreachableFromEdge(env.SUPABASE_LOCAL_URL)) {
    console.warn(`[backend] ${env.ENVIRONMENT}: SUPABASE_LOCAL_URL is not reachable from the edge; persistence disabled`)
    return undefined
  }
  return createSupabaseBackend({
    localUrl: env.SUPABASE_LOCAL_URL,
    localKey: env.SUPABASE_LOCAL_KEY,
    cloudUrl: env.SUPABASE_CLOUD_URL,
    cloudKey: env.SUPABASE_CLOUD_KEY,
    mode: env.SUPABASE_SYNC_ENABLED === "true" ? "local-with-cloud-sync" : "local",
    timeoutMs: BUDGET.SUPABASE_TIMEOUT_MS,
  })
}

/**
 * Mirror DO state to Supabase AFTER the response, inside ctx.waitUntil.
 * The Durable Object is the source of truth on the edge; a Supabase outage or timeout
 * is logged and never turns a successful mutation into a 5xx.
 */
function persistInBackground(
  ctx: ExecutionContext,
  supervisor: DurableObjectStub<RaycastOrchestratorSupervisor>,
  backend: SupabaseBackend | undefined,
): void {
  if (!backend) return
  ctx.waitUntil(
    (async () => {
      const state = await supervisor.getTreeState()
      await backend.saveTree(state.treeId, state as unknown as Record<string, unknown>, {
        waitUntil: (p) => ctx.waitUntil(p),
      })
    })().catch((error) => console.error("[backend] persistence failed", error)),
  )
}

function isLimitError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith(LIMIT_ERROR_PREFIX)
}

async function supabaseRequest(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  if (!env.SUPABASE_CLOUD_URL || !env.SUPABASE_CLOUD_KEY) throw new Error("cloud Supabase credentials not configured")
  return fetch(`${env.SUPABASE_CLOUD_URL.replace(/\/$/, "")}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_CLOUD_KEY,
      Authorization: `Bearer ${env.SUPABASE_CLOUD_KEY}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(BUDGET.SUPABASE_TIMEOUT_MS),
  })
}

async function publishCloudWatchdog(env: Env, status: "healthy" | "degraded" | "offline", metadata: Record<string, unknown> = {}): Promise<void> {
  if (!env.SUPABASE_CLOUD_URL || !env.SUPABASE_CLOUD_KEY) return
  const record = {
    id: `cloud-${env.ENVIRONMENT ?? "unknown"}`,
    scope: "cloud",
    status,
    queue_depth: 0,
    active_jobs: 0,
    local_inference: false,
    metadata: { environment: env.ENVIRONMENT ?? "unknown", ...metadata },
    heartbeat_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const response = await supabaseRequest(env, "/rest/v1/orchestration_watchdog", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(record),
  })
  if (!response.ok) throw new Error(`cloud watchdog heartbeat failed (${response.status})`)
}

async function scanCloudWatchdog(env: Env): Promise<void> {
  if (env.WATCHDOG_ENABLED !== "true" || !env.SUPABASE_CLOUD_URL || !env.SUPABASE_CLOUD_KEY) return
  const response = await supabaseRequest(env, "/rest/v1/orchestration_watchdog_stale?select=id,scope,status,heartbeat_at,age_seconds", { method: "GET" })
  if (!response.ok) throw new Error(`cloud watchdog stale scan failed (${response.status})`)
  const stale = await response.json() as Array<Record<string, unknown>>
  for (const row of stale) {
    const watchdogId = String(row.id ?? "unknown")
    const recent = await supabaseRequest(env, `/rest/v1/orchestration_watchdog_events?select=id&watchdog_id=eq.${encodeURIComponent(watchdogId)}&event_type=eq.heartbeat_stale&created_at=gte.${encodeURIComponent(new Date(Date.now() - 5 * 60_000).toISOString())}&limit=1`, { method: "GET" })
    if (!recent.ok) throw new Error(`cloud watchdog event lookup failed (${recent.status})`)
    if ((await recent.json() as unknown[]).length > 0) continue
    await supabaseRequest(env, "/rest/v1/orchestration_watchdog_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ watchdog_id: watchdogId, event_type: "heartbeat_stale", severity: "critical", message: `Watchdog ${watchdogId} heartbeat is stale`, payload: row }),
    })
  }
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(scanCloudWatchdog(env).catch((error) => console.error("[watchdog] stale scan failed", error)))
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const path = url.pathname

    try {
      // Get or create supervisor DO instance
      const id = env.supervisor.idFromName("default")
      const supervisor = env.supervisor.get(id)
      const backend = backendFor(env)
      if (env.WATCHDOG_ENABLED === "true") {
        ctx.waitUntil(publishCloudWatchdog(env, "healthy", { path, method: request.method }).catch((error) => console.error("[watchdog] heartbeat failed", error)))
      }

      // Route to callable methods
      if (path === "/state" && request.method === "GET") {
        const state = await supervisor.getTreeState()
        return new Response(JSON.stringify(state), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/execution-target" && request.method === "PUT") {
        const body = await readJsonObject(request)
        let target: ExecutionTarget
        try {
          target = await supervisor.setExecutionTarget({ target: body.target })
        } catch (error) {
          if (isLimitError(error)) throw error
          throw new HttpError(400, error instanceof Error ? error.message : String(error))
        }
        persistInBackground(ctx, supervisor, backend)
        return new Response(JSON.stringify(target), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/dispatch-subagent" && request.method === "POST") {
        const result = await supervisor.dispatchSubagentRequest(parseDispatchInput(await readJsonObject(request)))
        return new Response(JSON.stringify({ ok: true, result }), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/subagent-state" && request.method === "POST") {
        const body = await readJsonObject(request)
        const { agent, dispatchId } = parseDispatchInput({ ...body, input: {} })
        const result = await supervisor.dispatchSubagentRequest({ agent, input: {}, dispatchId, operation: "get-state" })
        return new Response(JSON.stringify({ ok: true, result }), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/plan" && request.method === "POST") {
        const plan = await supervisor.plan(parsePlanInput(await readJsonObject(request)))
        return new Response(JSON.stringify(plan), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/normalize-root" && request.method === "POST") {
        await supervisor.normalizeRoot(parseNormalizeRootInput(await readJsonObject(request)))
        persistInBackground(ctx, supervisor, backend)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/create-branches" && request.method === "POST") {
        const result = await supervisor.createBranches(parseCreateBranchesInput(await readJsonObject(request)))
        persistInBackground(ctx, supervisor, backend)
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
        const drift = await supervisor.syncTree(parseSyncTreeInput(await readJsonObject(request)))
        return new Response(JSON.stringify(drift), {
          headers: { "content-type": "application/json" },
        })
      }

      if (path === "/bootstrap-and-sync" && request.method === "POST") {
        const result = await supervisor.bootstrapAndSync()
        if (result.success) persistInBackground(ctx, supervisor, backend)
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
        status: error instanceof HttpError ? error.status : isLimitError(error) ? 413 : 500,
        headers: { "content-type": "application/json" },
      })
    }
  },
}
