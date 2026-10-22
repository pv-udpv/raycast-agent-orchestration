/**
 * Cloudflare platform ceilings and the budgets this Worker enforces below them.
 *
 * Ceilings are the STRICTER of Workers Free / Paid, so the budgets hold on either plan.
 * Sources (retrieved 2026-09-25):
 *   https://developers.cloudflare.com/workers/platform/limits/
 *   https://developers.cloudflare.com/durable-objects/platform/limits/
 *   https://developers.cloudflare.com/workflows/reference/limits/
 *
 * Rule: every budget must sit at or below HEADROOM × its ceiling (enforced by test/limits.test.ts).
 * Exceeding a budget is rejected by us (4xx) before Cloudflare rejects it (outage).
 */

export const HEADROOM = 0.5

export const CEILING = {
  /** SQLite-backed DO: key + value combined. */
  DO_STORAGE_ENTRY_BYTES: 2 * 1024 * 1024,
  /** Workflows: non-stream `step.do()` result and event payload (future AgentWorkflow migration). */
  WORKFLOW_STEP_RESULT_BYTES: 1024 * 1024,
  WORKFLOW_EVENT_PAYLOAD_BYTES: 1024 * 1024,
  /** Workers Free: steps per Workflow instance. */
  WORKFLOW_STEPS: 1024,
  /** Isolate memory, both plans. */
  ISOLATE_MEMORY_BYTES: 128 * 1024 * 1024,
  /** Workers Free subrequests per invocation (Paid: 10,000). */
  SUBREQUESTS_PER_REQUEST: 50,
  /** Simultaneous outgoing connections per request, both plans. */
  OUTGOING_CONNECTIONS: 6,
  /** Time `ctx.waitUntil` work may continue after the response. */
  WAIT_UNTIL_MS: 30_000,
  /** Soft per-object throughput for a single Durable Object. */
  DO_REQUESTS_PER_SECOND: 1000,
} as const

export const BUDGET = {
  /** Largest request body accepted; read with a streaming cap, never fully buffered past this. */
  REQUEST_BODY_BYTES: 256 * 1024,
  /** Serialized supervisor state; also fits a single Workflow step result / event payload. */
  STATE_BYTES: 256 * 1024,
  PLAN_BRANCHES: 128,
  TREE_NODES: 512,
  RESEARCH_ITEMS: 32,
  CURRENT_CHATS: 1024,
  STRING_CHARS: 256,
  /** Per Supabase call; local + cloud run sequentially inside waitUntil. */
  SUPABASE_TIMEOUT_MS: 5_000,
  /** Worst case per mutating route: mutation RPC + getTreeState RPC + Supabase local + cloud. */
  SUBREQUESTS_PER_MUTATION: 4,
  /** Concurrent outbound connections used per request (Supabase writes are sequential). */
  OUTGOING_CONNECTIONS: 1,
} as const

/** Prefix for limit violations thrown inside the Durable Object; RPC preserves messages, not classes. */
export const LIMIT_ERROR_PREFIX = "[limit]"

export function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}
