# Research Digest: Raycast Agent Orchestration

**Comprehensive research snapshot across all 9 branches**

---

## Branch Mapping

| Branch | Topic | Research | Risks | Status |
|---|---|---|---|---|
| `00-root` | Root orchestration | — | — | Active |
| `10` | Git Worktree Patterns | ✓ | ✓ | Foundational |
| `20` | Subagent Orchestration | ✓ | ✓ | Foundational |
| `30` | Local Inference Routing | ✓ | ✓ | Foundational |
| `40` | Raycast Integration | Draft | — | In Progress |
| `50` | Worker Agent (Durable) | Draft | — | In Progress |
| `60` | Terminal Automation | Draft | — | In Progress |
| `70` | Manifest & Exports | Draft | — | In Progress |
| `80` | Comparison Matrix | — | — | Pending |
| `90` | Notes & Findings | — | — | Pending |

---

## Key Findings by Domain

### 1. Git Worktree (`10-git-worktree`)

**Primary Recommendation:**  
Use one worktree per major branch, named `wt-NN-topic`, stored in `worktrees/` directory. Automate cleanup with weekly `git worktree prune` + audit script.

**Best Practices:**
- One worktree per major feature branch
- Keep worktree names stable and sortable (`wt-10-`, `wt-20-`, etc.)
- Use `git worktree prune` for cleanup
- Never mutate unrelated worktrees
- Share main/.git between all worktrees

**Critical Risks:**
- **Branch lock persistence** (high severity, low likelihood) → Automate cleanup; document `git worktree repair`
- **Disk space leaks** (medium severity, medium likelihood) → Weekly cleanup script; alert if >N worktrees
- **IDE slowdown from indexing** (medium severity, high likelihood) → Exclude worktree dirs from IDE indexing

**Decision Rationale:**  
Worktrees give instant context switching + parallel development + natural branch isolation. Perfect for 9-branch workload.

---

### 2. Subagent Orchestration (`20-zbst-tech-subagents`)

**Primary Recommendation:**  
Use explicit routing matrix (JSON), fan-out/fan-in execution, durable handoff state via Agents SDK. Document task dependencies upfront; detect cycles at startup.

**Architecture:**
- **Supervisor:** 1 coordinator
- **Specialists:** 8 domain-specific agents (researcher, planner, tree, worktree, raycast, inference, manifest, terminal)
- **Execution:** Planner → Fan-out (all others parallel) → Fan-in merge
- **State:** Durable via Agents SDK (task tracking, audit trail)

**Best Practices:**
- Supervisor + specialist pattern (clear ownership)
- Explicit routing matrix (machine-readable, auditable)
- Fan-out/fan-in for independent tasks
- Durable handoff state (survive restarts)
- Human-readable task contracts (TypeScript interfaces)

**Critical Risks:**
- **Routing bugs** (high severity, medium likelihood) → Pre-validate routing matrix; log all dispatches
- **Deadlock from circular dependencies** (high severity, low likelihood) → Document dependency graph; detect cycles at startup
- **State corruption from concurrent writes** (high severity, medium likelihood) → Partition state by subagent; use transactions

**Design Pattern:**  
Orchestration is **bounded** (8 fixed agents), **mostly parallel**, **deterministic**. Explicit routing + fan-out/fan-in is the right fit.

---

### 3. Local Inference Routing (`30-local-inference`)

**Primary Recommendation:**  
Implement 4-tier fallback: local-primary → local-secondary → remote-cloud → manual. Set latency budgets per task. Monitor model health. Log all fallbacks.

**Routing Policy:**
```
Tier 1: Local Primary (Ollama, MLX)
  ↓ (timeout or unavailable)
Tier 2: Local Secondary (fallback local model)
  ↓ (timeout or unavailable)
Tier 3: Remote Cloud (Perplexity, Claude API)
  ↓ (if disabled or over quota)
Tier 4: Manual (human review required)
```

**Best Practices:**
- Tier-based routing policy (explicit order)
- Latency budget per task (e.g., 2s for tree-norm, 10s for reasoning)
- Model availability registry with health status
- Benchmark before deployment (measure TTFT, latency, quality)
- Fallback logging (detect patterns, optimize policy)

**Critical Risks:**
- **Local inference unavailable** (high severity, medium likelihood) → Health checks + fallback to remote
- **Model quality degradation** (medium severity, medium likelihood) → Benchmark local vs remote; accept diff or retrain
- **Latency SLA violated** (medium severity, high likelihood) → Set latency budget; escalate on timeout

**Tradeoff:**  
Local-first balances performance (low latency), reliability (graceful degradation), cost (minimize remote calls), and quality (use best available).

---

## Cross-Domain Risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| RISK-001 | Branch lock from stale worktree | HIGH | Automate cleanup; document recovery |
| RISK-002 | Routing bug sends task to wrong agent | HIGH | Pre-validate routing matrix; log all |
| RISK-003 | Local inference unavailable | HIGH | Health checks + fallback to remote |
| RISK-004 | Chat ops not idempotent | MEDIUM | Use idempotency keys; check before creating |
| RISK-005 | Manifest drift undetected | MEDIUM | Run sync-agent regularly; alert on drift |
| RISK-006 | State collision in durable store | MEDIUM | Partition state by agent; use transactions |
| RISK-007 | Partial failure in fan-out | MEDIUM | Collect all results; report drift separately |

---

## Decision Matrix

| Dimension | Option A | Option B | Option C | **Selected** |
|---|---|---|---|---|
| **Worktree Strategy** | Plain branches | Temp worktrees | **VM snapshots** | Persistent worktrees per branch |
| **Subagent Pattern** | Direct calls | Message queue | **Explicit routing** | Fan-out/fan-in with routing matrix |
| **Inference Strategy** | Local-only | Remote-first | **4-tier fallback** | Local-primary + remote fallback |
| **State Management** | In-memory | SQLite | **Durable Objects** | Agents SDK durable state |
| **Manifest Versioning** | Version-controlled | Generated | **Hybrid** | On-the-fly; snapshots in VCS |

---

## Implementation Roadmap

### Phase 1: Foundations (Done)
- [x] Design supervisor + subagent architecture
- [x] Document orchestration patterns
- [x] Create research templates
- [x] Build risk register

### Phase 2: Local Execution (This Week)
- [ ] Implement Researcher Agent (parallel topic investigation)
- [ ] Wire Supervisor → Subagent dispatch (RPC)
- [ ] Test routing matrix validation
- [ ] Bootstrap 9 git worktrees

### Phase 3: Chat Integration (Next Week)
- [ ] Populate `10-20-30` child branches with research
- [ ] Implement `tree-agent` (chat normalization)
- [ ] Test `orchestrate-tree` Raycast command
- [ ] Validate end-to-end fan-out

### Phase 4: Cloud Deployment (Next Month)
- [ ] Deploy Supervisor to Cloudflare Workers
- [ ] Wire Agents SDK for durable state
- [ ] Integrate local inference (Ollama)
- [ ] Set up CI/CD (Forgejo + Woodpecker)

---

## Open Questions by Branch

### `40-raycast-integration`
- How to keep chat branches in sync with git worktrees?
- Should `orchestrate-tree` command auto-create child branches?
- How to handle idempotency (don't duplicate branches on retry)?

### `50-worker-agent`
- SQL schema for persistent task state?
- How to handle long-running (>30min) agent tasks?
- Retry policy for failed subagents?

### `60-terminal-automation`
- Which shell commands are "safe enough" to automate?
- How to handle permission errors in `git worktree` creation?
- Rollback strategy if bootstrap fails halfway?

### `70-manifest-notes`
- Should `tree.json` be version-controlled?
- How to track manifest drift over time?
- Merge strategy for parallel branch changes?

### `80-comparison-matrix`
- Benchmarking harness for subagent latency?
- Cost analysis (local vs remote inference)?
- Quality metrics (output correctness)?

### `90-notes-and-findings`
- Lessons learned from this orchestration design?
- Patterns applicable to other projects?
- Recommended follow-ups?

---

## References by Topic

### Git Worktree
- [Git Worktree Docs](https://git-scm.com/docs/git-worktree)
- [GitHub: Working with Git Worktrees](https://github.blog/open-source/git/working-with-git-worktrees/)
- [Kernel.org Worktree Best Practices](https://git.kernel.org/pub/scm/git/git.git/plain/contrib/worktree/git-new-workdir)

### Subagent Orchestration
- [Cloudflare Agents SDK](https://developers.cloudflare.com/agents/)
- [Orchestration Patterns](https://serverless.com/blog/orchestration-patterns)
- [SAG Pattern (Sagas)](https://microservices.io/patterns/data/saga.html)

### Local Inference
- [Ollama Model Library](https://ollama.com)
- [MLX Framework](https://ml-explore.github.io/mlx/)
- [TTFT Benchmarking](https://www.anyscale.com/blog/ttft-benchmarking)

---

## Artifacts Summary

| Artifact | Purpose | Path |
|---|---|---|
| **Supervisor Prompt** | Unified orchestration rules | `docs/supervisor.md` |
| **Routing Schema** | Explicit task routing matrix | `docs/routing-schema.json` |
| **Orchestration Framework** | TypeScript supervisor + dispatch | `packages/orchestration/src/` |
| **Research Template** | Markdown template for deep dives | `docs/research-templates/RESEARCH_TEMPLATE.md` |
| **Research Reports** | 3 completed (10, 20, 30) | `docs/research/` |
| **Risk Register** | Consolidated risk × mitigation | `docs/RISK_REGISTER.json` |
| **Raycast Command** | `orchestrate-tree` entry point | `apps/raycast-extension/src/commands/` |
| **Bootstrap Script** | Create worktrees + git structure | `scripts/bootstrap-full.sh` |
| **Worklog** | Phase-by-phase execution log | `WORKLOG.md` |

---

**Last Updated:** 2026-08-28  
**Chat Sync:** All 9 branches live in Raycast folder
