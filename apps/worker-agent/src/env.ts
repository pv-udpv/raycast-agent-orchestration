import type { RaycastOrchestratorSupervisor } from "./agent"

export interface Env {
  supervisor: DurableObjectNamespace<RaycastOrchestratorSupervisor>
  ResearcherAgent?: DurableObjectNamespace<any>
  PlannerAgent?: DurableObjectNamespace<any>
  TreeAgent?: DurableObjectNamespace<any>
  WorktreeAgent?: DurableObjectNamespace<any>
  RaycastAgent?: DurableObjectNamespace<any>
  InferenceAgent?: DurableObjectNamespace<any>
  ManifestAgent?: DurableObjectNamespace<any>
  TerminalAgent?: DurableObjectNamespace<any>
  PERPLEXITY_API_KEY?: string
  /** Set only in deployed environments ("production" | "staging"); absent under `wrangler dev`. */
  ENVIRONMENT?: string
  SUPABASE_LOCAL_URL?: string
  SUPABASE_LOCAL_KEY?: string
  SUPABASE_CLOUD_URL?: string
  SUPABASE_CLOUD_KEY?: string
  SUPABASE_SYNC_ENABLED?: string
  WATCHDOG_ENABLED?: string
}
