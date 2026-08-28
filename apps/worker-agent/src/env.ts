import type { RaycastOrchestratorSupervisor } from "./agent"

export interface Env {
  supervisor: DurableObjectNamespace<RaycastOrchestratorSupervisor>
  PERPLEXITY_API_KEY?: string
}
