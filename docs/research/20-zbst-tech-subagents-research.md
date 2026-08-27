# Research Report: zbst.tech Subagents

**Branch:** `20-zbst-tech-subagents`  
**Date:** 2026-08-27  
**Researcher:** Researcher Agent  
**Status:** complete

---

## Executive Summary

zbst.tech subagent orchestration enables task routing, handoff, and stateful coordination across independent agents. For our workload, we need 9 specialist subagents (researcher, planner, tree, worktree, raycast, inference, manifest, terminal, subagents) + 1 supervisor. Primary recommendation: use explicit routing matrix, fan-out/fan-in execution, and durable state for handoff records.

---

## Best Practices

### 1. Supervisor + Specialist Pattern
- **Description:** One supervisor orchestrates; each specialist owns one domain.
- **Why it matters:** Clear ownership; easy to debug; specialist can deep-dive into domain.
- **How we apply it:** `Supervisor` dispatches tasks by routing rules to 9 subagents.

### 2. Explicit Routing Matrix
- **Description:** Define `task-type -> subagent` in JSON; no implicit routing.
- **Why it matters:** Machine-readable; enables audit trail; prevents routing bugs.
- **How we apply it:** Every task includes `routing` metadata; supervisor logs all dispatches.

### 3. Fan-Out / Fan-In Execution
- **Description:** Supervisor sends independent tasks in parallel; waits for all; merges results.
- **Why it matters:** Maximizes throughput; prevents unnecessary blocking.
- **How we apply it:** Researcher + Planner first; everything else runs parallel.

### 4. Durable Handoff State
- **Description:** Use Agents SDK to persist task state, results, and audit trail.
- **Why it matters:** Survives agent restarts; enables retry without re-compute.
- **How we apply it:** Each subagent writes results to shared state store.

### 5. Human-Readable Task Contracts
- **Description:** Define input/output schemas for each subagent.
- **Why it matters:** Enables type checking; documents expectations; aids debugging.
- **How we apply it:** Use TypeScript interfaces for all task types.

---

## Anti-Patterns

### 1. Implicit Routing (No Matrix)
- **Description:** Hardcode routing logic in supervisor without documenting it.
- **Why to avoid:** Becomes opaque; hard to audit; adds edge cases.
- **Impact if ignored:** Routing bugs; tasks go to wrong subagent; silent failures.

### 2. Sequential Execution of Independent Tasks
- **Description:** Dispatch all tasks one-by-one instead of parallel.
- **Why to avoid:** Unnecessary latency; easy to accidentally serialize what can run parallel.
- **Impact if ignored:** 2-3x slowdown on orchestration time.

### 3. No Handoff State
- **Description:** Each subagent computes independently; supervisor doesn't persist intermediate results.
- **Why to avoid:** Can't recover from partial failures; can't audit decisions.
- **Impact if ignored:** Lost work on restart; no audit trail.

---

## Gotchas & Edge Cases

| Gotcha | Trigger | Mitigation |
|--------|---------|-----------|
| Subagent timeout | Task takes longer than expected | Set explicit timeouts; allow override |
| Missing subagent | Dispatcher tries to call unregistered subagent | Pre-validate routing matrix at startup |
| Partial failure in fan-out | One of N parallel tasks fails | Collect all results; report drift separately |
| State collision | Two subagents write to same key | Partition state by subagent ID |

---

## Recommendations

**Use explicit routing matrix (JSON), fan-out/fan-in execution, durable handoff state via Agents SDK. Document task dependencies upfront; detect cycles at startup.**

---

## References

* [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
* [Orchestration Patterns](https://serverless.com/blog/orchestration-patterns)
* [SAG Pattern](https://microservices.io/patterns/data/saga.html)
