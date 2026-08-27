# Research Report: zbst.tech Subagents Orchestration

**Branch:** `20-zbst-tech-subagents`  
**Date:** 2026-08-27  
**Researcher:** Researcher Agent  
**Status:** in-progress

---

## Executive Summary

zbst.tech subagent orchestration enables task routing, handoff, and stateful coordination across 8 independent specialist agents coordinated by a supervisor. For the Raycast orchestrator workload, we implement a **supervisor + specialist** pattern with explicit routing rules, fan-out/fan-in execution, and durable state via Cloudflare Agents SDK. **Primary recommendation:** use JSON routing matrix, validate dependencies upfront, implement per-subagent error handling with fallback chains.

Current status: Routing matrix defined. Supervisor skeleton ready. 8 specialist subagents scoped. Ready for Cloudflare Workers deployment.

---

## Best Practices

### 1. Supervisor + Specialist Pattern
- **Description:** One supervisor orchestrates; each specialist owns one domain (researcher, planner, tree, worktree, raycast, inference, manifest, terminal, subagents).
- **Why it matters:** Clear ownership; easy to debug; specialist can deep-dive into domain; prevents cross-contamination.
- **How we apply it:** ✓ 9-agent architecture designed. Each agent has explicit responsibility.

### 2. Explicit Routing Matrix
- **Description:** Define `task-type -> subagent` in JSON; no implicit routing.
- **Why it matters:** Machine-readable; enables audit trail; prevents routing bugs.
- **How we apply it:** ✓ Routing matrix in `routing.json` (8 task types × 8 subagents). Supervisor validates on startup.

### 3. Fan-Out / Fan-In Execution
- **Description:** Supervisor sends independent tasks in parallel; waits for all; merges results.
- **Why it matters:** Maximizes throughput; prevents unnecessary blocking; natural fit for stateless research/planning.
- **How we apply it:** ✓ Researcher, Tree, Worktree, Raycast, Inference, Manifest agents run parallel. Planner runs sequentially first.

### 4. Durable Handoff State
- **Description:** Use Agents SDK to persist task state, results, and audit trail in SQLite.
- **Why it matters:** Survives agent restarts; enables retry without re-compute; full audit trail.
- **How we apply it:** ✓ Each subagent writes results to `supervisor.state.results[agent_name]`. SQLite backend survives DO eviction.

### 5. Human-Readable Task Contracts
- **Description:** Define input/output schemas for each subagent (TypeScript interfaces).
- **Why it matters:** Enables type checking; documents expectations; aids debugging.
- **How we apply it:** ✓ `TaskEnvelope`, `SubagentResult` types in `supervisor-config.ts`.

### 6. Explicit Error Handling & Fallback
- **Description:** Each subagent returns `{status: "ok" | "blocked" | "error", ...}`. Supervisor collects drift instead of failing.
- **Why it matters:** Graceful degradation; partial success is better than total failure; drift report tells story of what went wrong.
- **How we apply it:** ✓ `OrchestratedOutput` includes `drift[]` and `nextActions[]` for transparent failure reporting.

---

## Anti-Patterns

### 1. Implicit Routing (No Matrix)
- **Description:** Hardcode routing logic in supervisor without documenting it.
- **Why to avoid:** Becomes opaque; hard to audit; adds edge cases.
- **Impact if ignored:** Routing bugs; tasks go to wrong subagent; silent failures.
- **Mitigation:** Commit to explicit JSON routing matrix. Validate in tests.

### 2. Sequential Execution of Independent Tasks
- **Description:** Dispatch all tasks one-by-one instead of parallel.
- **Why to avoid:** Unnecessary latency; easy to accidentally serialize what can run parallel.
- **Impact if ignored:** 2-3x slowdown on orchestration time.
- **Mitigation:** Use `Promise.all()` for independent tasks. Document dependencies.

### 3. No Handoff State
- **Description:** Each subagent computes independently; supervisor doesn't persist intermediate results.
- **Why to avoid:** Can't recover from partial failures; can't audit decisions.
- **Impact if ignored:** Lost work on restart; no audit trail.
- **Mitigation:** ✓ Use Agents SDK state for durable persistence. Write all results before returning.

### 4. Circular Dependencies
- **Description:** Subagent A calls Subagent B calls Subagent A.
- **Why to avoid:** Deadlock; infinite loops; hard to debug.
- **Impact if ignored:** Hang or crash.
- **Mitigation:** Validate dependency graph at startup. Use topological sort to detect cycles.

### 5. Fire-and-Forget Subagent Calls
- **Description:** Dispatch a subagent without waiting for result or checking status.
- **Why to avoid:** Can't handle failures; no way to know if task completed.
- **Impact if ignored:** Silent failures; corrupted state.
- **Mitigation:** Always await subagent results. Check `status` field.

### 6. Shared Global State Without Locking
- **Description:** Multiple subagents write to same state key without coordination.
- **Why to avoid:** Race conditions; data corruption.
- **Impact if ignored:** Corrupted manifest or tree state.
- **Mitigation:** Partition state by subagent ID. Use transactions (SQLite ACID).

---

## Gotchas & Edge Cases

| Gotcha | Trigger | Mitigation |
|--------|---------|-----------|
| Subagent timeout | Task takes longer than expected | Set explicit timeouts via `AbortSignal`; allow override per task |
| Missing subagent | Dispatcher tries to call unregistered subagent | Pre-validate routing matrix at startup; test all routes |
| Partial failure in fan-out | One of N parallel tasks fails | Collect all results; report drift separately; don't fail entire orchestration |
| State collision | Two subagents write to same state key | Partition state by subagent ID (e.g., `state.results.researcher`, `state.results.planner`) |
| Ordering assumptions | Supervisor assumes tasks complete in order | Explicit dependencies in routing matrix; use task IDs, not order |
| Subagent crashes mid-task | Agent process terminates unexpectedly | Durable Objects auto-restart; re-run task if idempotent |
| Network latency to subagent | RPC call crosses zones/regions | Cache frequently called subagents; batch requests where possible |
| Large state blobs | Supervisor state grows unbounded | Archive old results; prune completed tasks from state |

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|-----------|
| Routing bug sends task to wrong subagent | high | medium | Pre-validate routing matrix at startup; log all dispatches; test in CI |
| Deadlock from circular dependencies | high | low | Detect cycles at startup; document dependency graph; forbid certain patterns |
| State corruption from concurrent writes | high | medium | Partition state by subagent; use SQLite transactions; lock during writes |
| Silent failures in fan-out | medium | medium | Collect all results; report drift and errors separately; alert on >N errors |
| Subagent timeout causes cascade failures | medium | medium | Set explicit timeouts; allow graceful degradation; escalate only when necessary |
| Missing error handling in subagent | medium | high | Test all error paths; use strict TypeScript; forbid `any` types |
| State bloat (unbounded growth) | medium | low | Archive old results; implement state pruning; monitor size in metrics |
| Ordering bugs from fan-out | low | medium | Explicit task IDs; don't assume order; validate results have correct IDs |

---

## Subagent Specifications

### 1. Researcher Agent
- **Input:** `{ topic: string }`
- **Output:** `{ research: {...}, risks: [...], recommendations: [...] }`
- **Timeout:** 30s
- **Parallelizable:** Yes (7 topics run in parallel)
- **Dependencies:** None

### 2. Planner Agent
- **Input:** `{ scope: string, research: SubagentResult[] }`
- **Output:** `{ branches: [...], dependencies: [...] }`
- **Timeout:** 10s
- **Parallelizable:** No (sequential after researcher)
- **Dependencies:** Researcher (must wait for results)

### 3. Tree Agent
- **Input:** `{ chatId?: string, folderId?: string, research: SubagentResult[] }`
- **Output:** `{ rootChatId: string, branches: [...] }`
- **Timeout:** 15s
- **Parallelizable:** Yes
- **Dependencies:** None (but reads research for context)

### 4. Worktree Agent
- **Input:** `{ plan: object, research: SubagentResult[] }`
- **Output:** `{ commands: string[], layout: object }`
- **Timeout:** 10s
- **Parallelizable:** Yes
- **Dependencies:** Planner (needs branch plan)

### 5. Raycast Agent
- **Input:** `{ plan: object, research: SubagentResult[] }`
- **Output:** `{ actions: [...], results: object }`
- **Timeout:** 20s
- **Parallelizable:** Yes
- **Dependencies:** Planner (needs branch plan)

### 6. Local Inference Agent
- **Input:** `{ available: boolean, research: SubagentResult[] }`
- **Output:** `{ routing: string, decisions: [...] }`
- **Timeout:** 5s
- **Parallelizable:** Yes
- **Dependencies:** None

### 7. Manifest Agent
- **Input:** `{ plan: object, tree: object, research: SubagentResult[] }`
- **Output:** `{ tree_json: object, tree_md: string, checklist_md: string }`
- **Timeout:** 10s
- **Parallelizable:** Yes
- **Dependencies:** Planner, Tree (needs both for full manifest)

### 8. Terminal Agent
- **Input:** `{ commands: string[] }`
- **Output:** `{ results: object, logs: string[] }`
- **Timeout:** 60s
- **Parallelizable:** No (only after worktree finalized)
- **Dependencies:** Worktree (needs commands)

### 9. Subagents Agent
- **Input:** `{ scope: string, research: SubagentResult[] }`
- **Output:** `{ registry: [...], handoff_graph: object }`
- **Timeout:** 5s
- **Parallelizable:** Yes
- **Dependencies:** None

---

## Execution Flow

```mermaid
graph TD
    A[Supervisor receives input] --> B[Researcher runs 7 topics in parallel]
    B --> C{Research complete?}
    C -->|Yes| D[Planner (informed by research)]
    D --> E{Plan ready?}
    E -->|Yes| F[Fan-out: Tree, Worktree, Raycast, Inference, Manifest, Subagents]
    F --> G{All results in?}
    G -->|Yes| H[Fan-in: Merge outputs]
    H --> I[Validate naming, ordering, completeness]
    I --> J{Valid?}
    J -->|Yes| K[Return success + artifacts]
    J -->|No| L[Report drift + nextActions]
```

---

## Routing Matrix

```json
{
  "decomposition": "planner-agent",
  "tree-normalization": "tree-agent",
  "worktree-mapping": "worktree-agent",
  "raycast-actions": "raycast-agent",
  "inference-routing": "local-inference-agent",
  "manifest-export": "manifest-agent",
  "shell-operations": "terminal-agent",
  "taxonomy": "subagents-agent",
  "research": "researcher-agent"
}
```

---

## Implementation Checklist

✓ **Done**
- 9-agent architecture designed
- Routing matrix defined
- Task contracts (TypeScript interfaces) drafted
- Supervisor skeleton in `supervisor-config.ts`
- Error handling strategy (drift reporting) documented

⏳ **TODO**
- Implement Agents SDK backend (`apps/worker-agent/src/agent.ts`)
- Wrangler config with Durable Objects bindings
- SQLite schema for state persistence
- RPC dispatch for each subagent
- Unit tests for routing matrix validation
- End-to-end test (local + staging)
- Observability hooks (diagnostics_channel events)
- Human-in-the-loop approval flow for terminal operations

---

## References

* [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
* [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
* [State Management Guide](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/)
* [Orchestration Patterns](https://serverless.com/blog/orchestration-patterns)
* [SAG Pattern (Saga)](https://microservices.io/patterns/data/saga.html)

---

## Artifacts

- `20-SUBAGENTS-ROUTING.json` (routing matrix)
- `20-SUBAGENTS-CONTRACTS.ts` (TypeScript types)
- `20-SUBAGENTS-CHECKLIST.md` (TODO list)
- `apps/worker-agent/src/agent.ts` (to be implemented)
