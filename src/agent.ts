// Cloudflare Agents SDK Supervisor Implementation with Inference Dispatch
// Wrangler binding: ChatTreeAgent (Durable Object)

import { Agent, callable } from "agents"
import { InferenceRouter, InferenceRequest, InferenceResult, ModelChoice } from "./inference"

export interface TreeState {
  treeId: string
  name: string
  rootId?: string
  folderId?: string
  nodes: Record<string, TreeNode>
  createdAt: string
  updatedAt: string
}

export interface TreeNode {
  id: string
  prefix: string
  title: string
  type: "root" | "branch" | "note" | "folder"
  parentId: string | null
  children: string[]
  chatId?: string
  worktreeId?: string
  done: boolean
}

/**
 * ChatTreeAgent - Durable orchestrator for tree state + inference dispatch
 * Persists to SQLite; serves as single source of truth for branch/chat metadata
 * Integrates with InferenceRouter for model selection and invocation
 */
export class ChatTreeAgent extends Agent<Env, TreeState> {
  private inferenceRouter = new InferenceRouter()

  initialState: TreeState = {
    treeId: crypto.randomUUID(),
    name: "raycast-agent-orchestration",
    nodes: {
      "00-root": {
        id: "00-root",
        prefix: "00-",
        title: "root-ollama-launch-harness-research",
        type: "root",
        parentId: null,
        children: [
          "10-git-worktree",
          "20-zbst-tech-subagents",
          "30-local-inference",
          "40-raycast-integration",
          "50-worker-agent",
          "60-terminal-automation",
          "70-manifest-notes",
          "80-comparison-matrix",
          "90-notes-and-findings"
        ],
        done: false
      }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  /**
   * Set root chat and folder IDs
   */
  @callable()
  setRoot(payload: { rootId: string; folderId?: string; title: string }) {
    this.setState({
      ...this.state,
      rootId: payload.rootId,
      folderId: payload.folderId,
      updatedAt: new Date().toISOString()
    })
    return { ok: true, rootId: payload.rootId, folderId: payload.folderId }
  }

  /**
   * Create or update a node
   */
  @callable()
  upsertNode(node: TreeNode) {
    const existing = this.state.nodes[node.id]

    // Update parent's children list if this is a new child
    if (!existing && node.parentId && this.state.nodes[node.parentId]) {
      const parent = this.state.nodes[node.parentId]
      if (!parent.children.includes(node.id)) {
        parent.children.push(node.id)
      }
    }

    this.setState({
      ...this.state,
      nodes: {
        ...this.state.nodes,
        [node.id]: node
      },
      updatedAt: new Date().toISOString()
    })

    return node
  }

  /**
   * Mark node as done
   */
  @callable()
  markDone(nodeId: string, done: boolean) {
    const node = this.state.nodes[nodeId]
    if (!node) throw new Error(`Node not found: ${nodeId}`)

    node.done = done
    this.setState({
      ...this.state,
      nodes: {
        ...this.state.nodes,
        [nodeId]: node
      },
      updatedAt: new Date().toISOString()
    })

    return { ok: true, nodeId, done }
  }

  /**
   * Sync from external manifest (tree.json)
   */
  @callable()
  syncFromManifest(manifest: TreeState) {
    this.setState({
      ...manifest,
      updatedAt: new Date().toISOString()
    })
    return { ok: true, nodesCount: Object.keys(manifest.nodes).length }
  }

  /**
   * Export current state
   */
  @callable()
  exportState() {
    return this.state
  }

  /**
   * Detect drift between current state and external manifest
   */
  @callable()
  detectDrift(externalManifest: TreeState) {
    const drift: string[] = []

    // Check node counts
    const localCount = Object.keys(this.state.nodes).length
    const externalCount = Object.keys(externalManifest.nodes).length
    if (localCount !== externalCount) {
      drift.push(
        `Node count mismatch: local=${localCount}, external=${externalCount}`
      )
    }

    // Check for missing nodes
    for (const nodeId of Object.keys(externalManifest.nodes)) {
      if (!this.state.nodes[nodeId]) {
        drift.push(`Missing node: ${nodeId}`)
      }
    }

    // Check for extra nodes
    for (const nodeId of Object.keys(this.state.nodes)) {
      if (!externalManifest.nodes[nodeId]) {
        drift.push(`Extra node: ${nodeId}`)
      }
    }

    // Check node properties
    for (const nodeId of Object.keys(this.state.nodes)) {
      const local = this.state.nodes[nodeId]
      const external = externalManifest.nodes[nodeId]
      if (external) {
        if (local.title !== external.title) {
          drift.push(
            `Title mismatch: ${nodeId} "${local.title}" vs "${external.title}"`
          )
        }
        if (local.done !== external.done) {
          drift.push(`Done status mismatch: ${nodeId}`)
        }
      }
    }

    return {
      ok: true,
      hasDrift: drift.length > 0,
      drift
    }
  }

  /**
   * Choose optimal model for a task
   */
  @callable()
  chooseModel(request: InferenceRequest): ModelChoice {
    return this.inferenceRouter.chooseModel(request)
  }

  /**
   * Invoke model for inference
   * Routes to local (Ollama, MLX, Codex, Perplexity) or remote (Claude, OpenAI, Perplexity Pro)
   */
  @callable({ streaming: true })
  async invokeModel(
    request: InferenceRequest,
    response: ReadableStreamDefaultController<string>
  ) {
    try {
      const choice = this.inferenceRouter.chooseModel(request)
      const result = await this.inferenceRouter.invoke(choice, request)

      // Stream the result
      response.enqueue(
        JSON.stringify({
          ok: true,
          model: result.model,
          runner: result.runner,
          latency: result.latency,
          tokens: result.tokens,
          output: result.output
        })
      )
      response.close()
    } catch (err) {
      response.enqueue(
        JSON.stringify({
          ok: false,
          error: (err as Error).message
        })
      )
      response.close()
    }
  }

  /**
   * Batch invocation (e.g., for planning + research in parallel)
   */
  @callable()
  async batchInvoke(
    requests: Array<InferenceRequest & { id: string }>
  ): Promise<Array<InferenceResult & { id: string }>> {
    const results = await Promise.all(
      requests.map(async (req) => {
        try {
          const choice = this.inferenceRouter.chooseModel(req)
          const result = await this.inferenceRouter.invoke(choice, req)
          return { ...result, id: req.id }
        } catch (err) {
          return {
            model: "error",
            output: (err as Error).message,
            runner: "error" as const,
            latency: 0,
            tokens: 0,
            id: req.id
          }
        }
      })
    )
    return results
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url)

    // Route to agent
    if (pathname.startsWith("/agents/chat-tree/")) {
      const agentId = pathname.replace("/agents/chat-tree/", "")
      const agent = env.ChatTreeAgent.get(agentId)
      return agent.fetch(req)
    }

    return new Response("Not found", { status: 404 })
  }
}
