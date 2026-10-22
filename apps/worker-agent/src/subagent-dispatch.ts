export const SUBAGENT_BINDINGS = {
  researcher: "ResearcherAgent",
  planner: "PlannerAgent",
  tree: "TreeAgent",
  worktree: "WorktreeAgent",
  raycast: "RaycastAgent",
  inference: "InferenceAgent",
  manifest: "ManifestAgent",
  terminal: "TerminalAgent",
} as const

export const SUBAGENT_METHODS = {
  researcher: "research",
  planner: "plan",
  tree: "normalizeTree",
  worktree: "mapWorktrees",
  raycast: "executeRaycastOps",
  inference: "defineRouting",
  manifest: "exportManifest",
  terminal: "executeTerminalOps",
} as const

export type SubagentName = keyof typeof SUBAGENT_BINDINGS
export type SubagentOperation = SubagentName | "get-state"

type RpcStub = { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> }
type Namespace = {
  idFromName(name: string): unknown
  get(id: unknown): RpcStub
}
type DispatchEnv = Partial<Record<(typeof SUBAGENT_BINDINGS)[SubagentName], Namespace>>

/** Dispatch through a bound Durable Object stub's HTTP fetch entry point. */
export async function dispatchSubagent(
  env: DispatchEnv,
  name: SubagentName,
  input: Record<string, unknown>,
  dispatchId?: string,
  operation: SubagentOperation = name,
): Promise<unknown> {
  const binding = SUBAGENT_BINDINGS[name]
  const method = operation === "get-state" ? "getAgentState" : SUBAGENT_METHODS[operation]
  if (operation !== "get-state" && SUBAGENT_BINDINGS[operation] !== binding) {
    throw new Error(`Operation '${operation}' is not valid for subagent '${name}'`)
  }
  const namespace = env[binding]
  if (!namespace) throw new Error(`Subagent namespace '${binding}' is not bound`)

  const id = namespace.idFromName(dispatchId ? `${name}:${dispatchId}` : `${name}:default`)
  const stub = namespace.get(id)
  const response = await stub.fetch("https://subagent.invalid/rpc", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method, input, orchestrationId: dispatchId }),
  })
  const payload = await response.json() as { ok?: boolean; result?: unknown; error?: string }
  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.error ?? `Subagent '${name}' RPC failed (${response.status})`)
  }
  return payload.result
}
