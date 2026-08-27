/**
 * zbst.tech Subagent Taxonomy & Orchestration
 * 
 * Defines the 9-subagent supervisor model:
 * - Supervisor (coordinator)
 * - Researcher Agent (deep investigation)
 * - Planner Agent (decomposition)
 * - Tree Agent (chat/folder state)
 * - Worktree Agent (git isolation)
 * - Raycast Agent (UI automation)
 * - Inference Agent (model routing)
 * - Manifest Agent (export/drift)
 * - Terminal Agent (shell ops)
 */

export type SubagentRole = 
  | "supervisor"
  | "researcher"
  | "planner"
  | "tree"
  | "worktree"
  | "raycast"
  | "inference"
  | "manifest"
  | "terminal"

export const SUBAGENT_REGISTRY: Record<SubagentRole, {
  name: string
  domain: string
  responsibilities: string[]
  sequencing: "early" | "parallel" | "late"
  blocks?: SubagentRole[]
}> = {
  supervisor: {
    name: "Supervisor",
    domain: "orchestration and coordination",
    responsibilities: [
      "Parse incoming workload",
      "Route tasks by type to specialist subagents",
      "Collect results in parallel",
      "Merge outputs into canonical manifest",
      "Validate naming, ordering, drift",
      "Report final state and next actions"
    ],
    sequencing: "early",
    blocks: undefined
  },
  researcher: {
    name: "Researcher Agent",
    domain: "deep investigation and risk analysis",
    responsibilities: [
      "Research each topic (git-worktree, zbst-tech-subagents, local-inference, etc.)",
      "Document best practices and anti-patterns",
      "Identify gotchas and edge cases",
      "Build risk register",
      "Recommend approaches per domain"
    ],
    sequencing: "early",
    blocks: ["planner", "tree", "worktree", "raycast", "inference", "manifest"]
  },
  planner: {
    name: "Planner Agent",
    domain: "decomposition and sequencing",
    responsibilities: [
      "Break workload into stable branch nodes",
      "Assign NN- prefixes (00-, 10-, 20-, etc.)",
      "Identify dependencies",
      "Generate branch plan"
    ],
    sequencing: "early",
    blocks: ["tree", "worktree", "raycast", "manifest"]
  },
  tree: {
    name: "Tree Agent",
    domain: "chat/folder/tree normalization",
    responsibilities: [
      "Rename root chat to canonical title",
      "Validate folder structure",
      "Ensure stable branch ordering",
      "Detect missing nodes",
      "Produce tree diffs"
    ],
    sequencing: "parallel"
  },
  worktree: {
    name: "Worktree Agent",
    domain: "git worktree layout and branch mapping",
    responsibilities: [
      "Map branch nodes to git worktrees",
      "Generate git worktree add commands",
      "Enforce naming (wt-NN-topic)",
      "Report conflicts and missing worktrees"
    ],
    sequencing: "parallel"
  },
  raycast: {
    name: "Raycast Agent",
    domain: "Raycast commands and chat operations",
    responsibilities: [
      "Create folder via Raycast API",
      "Rename and branch current chat",
      "Execute chat operations idempotently",
      "Export manifest artifacts"
    ],
    sequencing: "parallel"
  },
  inference: {
    name: "Local Inference Agent",
    domain: "model selection and routing",
    responsibilities: [
      "Choose best model for task type",
      "Implement 4-tier fallback (local-primary → local-secondary → remote → manual)",
      "Monitor model health",
      "Log routing decisions"
    ],
    sequencing: "parallel"
  },
  manifest: {
    name: "Manifest Agent",
    domain: "tree export and drift detection",
    responsibilities: [
      "Generate tree.json and tree.md",
      "Produce checklist exports",
      "Detect drift between manifest and reality",
      "Generate diffs"
    ],
    sequencing: "parallel"
  },
  terminal: {
    name: "Terminal Agent",
    domain: "safe shell operations",
    responsibilities: [
      "Execute git worktree commands",
      "Run repo bootstrap scripts",
      "Perform manifest file writes",
      "Handle system-level operations safely"
    ],
    sequencing: "late",
    blocks: undefined
  }
}

/**
 * Routing matrix: task-type -> subagent
 */
export const ROUTING_MATRIX: Record<string, SubagentRole> = {
  // Task types to subagent mapping
  decomposition: "planner",
  plan: "planner",
  sequence: "planner",
  dependencies: "planner",
  
  "normalize-chat": "tree",
  folder: "tree",
  "rename-chat": "tree",
  "tree-state": "tree",
  
  "git-worktree": "worktree",
  "branch-map": "worktree",
  git: "worktree",
  isolation: "worktree",
  
  "raycast-command": "raycast",
  "chat-op": "raycast",
  export: "raycast",
  
  inference: "inference",
  routing: "inference",
  model: "inference",
  local: "inference",
  remote: "inference",
  
  manifest: "manifest",
  export: "manifest",
  diff: "manifest",
  checklist: "manifest",
  drift: "manifest",
  
  shell: "terminal",
  "worktree-init": "terminal",
  bootstrap: "terminal",
  
  research: "researcher",
  gotchas: "researcher",
  "best-practices": "researcher",
  tradeoffs: "researcher",
  risks: "researcher",
  
  orchestrate: "supervisor"
}

/**
 * Execution strategy for orchestration
 */
export const EXECUTION_STRATEGY = {
  phases: [
    { name: "research", subagents: ["researcher"], mode: "parallel" },
    { name: "planning", subagents: ["planner"], mode: "sequential" },
    { name: "fan-out", subagents: ["tree", "worktree", "raycast", "inference", "manifest"], mode: "parallel" },
    { name: "finalization", subagents: ["terminal"], mode: "sequential" }
  ],
  dependencies: {
    tree: ["planner"],
    worktree: ["planner"],
    raycast: ["planner"],
    inference: ["planner"],
    manifest: ["planner"],
    terminal: ["worktree", "tree", "manifest"]
  }
}

/**
 * Get routing for a given task
 */
export function routeTask(taskType: string, input: unknown): { subagent: SubagentRole; input: unknown } {
  const subagent = ROUTING_MATRIX[taskType.toLowerCase()]
  if (!subagent) {
    console.warn(`[ROUTING] Unknown task type: ${taskType}; falling back to supervisor`)
    return { subagent: "supervisor", input }
  }
  return { subagent, input }
}

/**
 * Get subagent metadata
 */
export function getSubagentInfo(role: SubagentRole) {
  return SUBAGENT_REGISTRY[role]
}

/**
 * Validate routing matrix consistency
 */
export function validateRoutingMatrix(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Check all routing keys map to valid subagents
  for (const [key, subagent] of Object.entries(ROUTING_MATRIX)) {
    if (!SUBAGENT_REGISTRY[subagent]) {
      errors.push(`Routing key "${key}" maps to unknown subagent: ${subagent}`)
    }
  }
  
  // Check no circular dependencies
  const visited = new Set<SubagentRole>()
  const checkCircular = (role: SubagentRole, path: SubagentRole[]): boolean => {
    if (path.includes(role)) {
      errors.push(`Circular dependency detected: ${path.concat(role).join(" -> ")}`)
      return true
    }
    return false
  }
  
  for (const role of Object.keys(SUBAGENT_REGISTRY) as SubagentRole[]) {
    checkCircular(role, [])
  }
  
  return { valid: errors.length === 0, errors }
}

export default {
  SUBAGENT_REGISTRY,
  ROUTING_MATRIX,
  EXECUTION_STRATEGY,
  routeTask,
  getSubagentInfo,
  validateRoutingMatrix
}
