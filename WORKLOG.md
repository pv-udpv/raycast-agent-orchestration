# Raycast Agent Orchestration — Worklog & Research Digest

**Status:** Chat normalization + git repo scaffolding complete  
**Date:** 2026-08-27 → 2026-08-28  
**Owner:** Paul (pv-udpv)  
**Folder:** Raycast Vault → `Ollama Launch / Harness Research`  
**Repo:** `~/dev/raycast-agent-orchestration`

---

## Phase 1: Problem Statement & Initial Research

**Topic:** `ollama launch` command and integration patterns

**Findings:**
- `ollama launch` is Ollama's interactive setup for coding tools (Claude Code, OpenCode, Codex)
- Supports `--config` flags and persistent session paths
- Intended for terminal-based coding agents, not general chat
- Ecosystem: Ollama backends enable local inference without manual config

**Outcome:** Scoped to comprehensive multi-harness research → need deeper investigation across orchestration, subagents, git workflow, inference routing, etc.

---

## Phase 2: Orchestration System Design

**Scope:** Multi-agent workload coordinator for 9-branch chat-tree + git worktree + local inference

### Designed Components

| Component | Role | Status |
|---|---|---|
| **Supervisor Agent** | Coordinate all tasks; route by domain; merge results | Design ✓ |
| **Researcher Agent** | Deep-dive investigation per topic; surface gotchas & risks | Design ✓ |
| **Planner Agent** | Decompose workload into branch plan | Design ✓ |
| **Tree Agent** | Normalize chat/folder structure | Design ✓ |
| **Worktree Agent** | Map branches to git worktrees | Design ✓ |
| **Raycast Agent** | Raycast command/automation | Design ✓ |
| **Inference Agent** | Local-first model routing + fallback | Design ✓ |
| **Manifest Agent** | Tree export (JSON, MD, checklist) | Design ✓ |
| **Terminal Agent** | Safe shell operations (git, bootstrap) | Design ✓ |
| **Subagents Agent** | Define agent taxonomy & handoff topology | Design ✓ |

### Execution Strategy
- **Fan-out / Fan-in:** Researcher runs first on all 7 topics in parallel → Planner generates plan → All other agents run parallel → Merge results
- **Deterministic:** Sortable prefixes (`NN-slug`), stable naming, no renumbering
- **Durable:** Event bus, persistent task state, audit trail

### Outputs Generated
- `supervisor.md` — unified supervisor prompt
- `routing-schema.json` — explicit task routing matrix
- `subagent-specs.ts` — TypeScript orchestration framework
- `index.ts` — bootstrap scaffold for agents

---

## Phase 3: Research Templates & Risk Register

**Scope:** Deep research per branch topic

### Research Template
Created `RESEARCH_TEMPLATE.md` with sections:
- Executive Summary
- Best Practices (5 per topic)
- Anti-Patterns (3-4 per topic)
- Gotchas & Edge Cases (risk matrix)
- Risk Register (severity × likelihood × mitigation)
- Recommendations (primary + secondary options)
- References & Artifacts

### Research Reports (In Progress)

| Topic | Branch | Research | Risks | Decision Matrix |
|---|---|---|---|---|
| Git Worktree | `10-git-worktree` | ✓ | ✓ | ✓ |
| zbst.tech Subagents | `20-zbst-tech-subagents` | ✓ | ✓ | ✓ |
| Local Inference | `30-local-inference` | ✓ | ✓ | ✓ |
| Raycast Integration | `40-raycast-integration` | Design | — | — |
| Worker Agent | `50-worker-agent` | Design | — | — |
| Terminal Automation | `60-terminal-automation` | Design | — | — |
| Manifest Notes | `70-manifest-notes` | Design | — | — |
| Comparison Matrix | `80-comparison-matrix` | Design | — | — |

### Key Risk Register
- **RISK-001:** Branch lock from stale worktree (high severity, low likelihood) → automate cleanup
- **RISK-002:** Routing bug sends task to wrong subagent (high severity, medium likelihood) → validate routing matrix
- **RISK-003:** Local inference unavailable (high severity, medium likelihood) → implement health checks + fallback
- **RISK-004:** Chat ops not idempotent (medium severity, high likelihood) → use idempotency keys
- **RISK-005:** Manifest drift undetected (medium severity, medium likelihood) → run sync-agent regularly

---

## Phase 4: Raycast Command & Bootstrap Script

**Scope:** Executable infrastructure for full orchestration

### Raycast Command
- `orchestrate-tree.tsx` — Raycast extension command
- Input: workload scope, chat ID, folder ID, repo path
- Output: markdown report with all agent results (research, plan, tree, worktrees, manifest, subagents, drift, next actions)

### Bootstrap Script
- `bootstrap-full.sh` — create directory structure, initialize git, create 9 worktrees
- Topics: `10-git-worktree` through `90-notes-and-findings`
- Creates `worktrees/main` + `worktrees/wt-NN-*` layout
- Generates initial manifest (`tree-bootstrap.json`)
- Status: Ready to execute

---

## Phase 5: Chat Normalization & Repo Scaffolding

### Chat Structure
**Root:** `00-root-ollama-launch-harness-research`  
**Folder:** `Ollama Launch / Harness Research`

### Child Branches (Created)
1. `10-git-worktree` — Worktree patterns, isolation, cleanup
2. `20-zbst-tech-subagents` — Subagent orchestration strategy
3. `30-local-inference` — Model routing, fallback chain
4. `40-raycast-integration` — Chat ops, UI automation
5. `50-worker-agent` — Durable state, SQL schema
6. `60-terminal-automation` — Safety, auditability, recovery
7. `70-manifest-notes` — Determinism, versioning, exports
8. `80-comparison-matrix` — Tradeoff analysis
9. `90-notes-and-findings` — Research synthesis & conclusions

### Git Repo
- **Location:** `~/dev/raycast-agent-orchestration`
- **Structure:**
  ```
  .
  ├── README.md
  ├── WORKLOG.md (this file)
  ├── package.json
  ├── docs/
  │   ├── research/
  │   │   ├── 10-git-worktree-research.md
  │   │   ├── 20-zbst-tech-subagents-research.md
  │   │   ├── 30-local-inference-research.md
  │   │   └── ...
  │   ├── research-templates/
  │   │   └── RESEARCH_TEMPLATE.md
  │   ├── RISK_REGISTER.json
  │   └── tree-bootstrap.json
  ├── packages/
  │   └── orchestration/src/
  │       ├── supervisor-config.ts
  │       └── subagents/
  │           ├── index.ts
  │           ├── researcher-agent.ts
  │           ├── planner-agent.ts
  │           └── ...
  ├── apps/
  │   └── raycast-extension/src/
  │       └── commands/
  │           └── orchestrate-tree.tsx
  └── scripts/
      └── bootstrap-full.sh
  ```
- **Status:** Scaffolding ready; awaiting first commit

---

## Phase 6: Next Actions

### Immediate (Ready Now)
- [ ] `git add -A && git commit -m "docs: orchestration design + research templates + supervisor specs"`
- [ ] Create GitHub remote: `pv-udpv/raycast-agent-orchestration`
- [ ] `git remote add origin https://github.com/pv-udpv/raycast-agent-orchestration.git`
- [ ] `git push -u origin main`
- [ ] `./scripts/bootstrap-full.sh` — create 9 worktrees

### Short-term (This Week)
- [ ] Populate remaining research reports (`40-60-70-80`)
- [ ] Integrate Researcher Agent into zbst.tech subagent taxonomy
- [ ] Test Raycast `orchestrate-tree` command in extension
- [ ] Validate routing matrix + test supervisor dispatch logic
- [ ] Build out `tree-agent` + `worktree-agent` stubs

### Medium-term (Next Week)
- [ ] Deploy Supervisor + Agents SDK to Cloudflare Workers (`apps/worker-agent`)
- [ ] Wire Terminal Agent to actually execute shell commands (via `terminal__run-command`)
- [ ] Implement durable state for task tracking + audit trail
- [ ] Set up CI/CD (Forgejo + Woodpecker) for testing + deployment

### Long-term (Next Month)
- [ ] Integrate local inference (Ollama, MLX) with model registry
- [ ] Full end-to-end orchestration test (root chat → branches → worktrees → manifest export)
- [ ] Benchmark subagent latency + optimize routing
- [ ] Document final tree topology in `90-notes-and-findings`

---

## Decision Log

| Decision | Rationale | Date |
|---|---|---|
| Use `NN-slug` sortable prefixes | Deterministic; easy to sort & audit | 2026-08-27 |
| Supervisor + 8 Specialist Subagents | Clear ownership; parallelizable | 2026-08-27 |
| Fan-out / Fan-in execution | Maximize throughput; prevent blocking | 2026-08-27 |
| 4-tier inference fallback | Balance performance + reliability + cost | 2026-08-27 |
| Explicit routing matrix (JSON) | Machine-readable; enables audit trail | 2026-08-27 |
| One worktree per major branch | Instant context-switch; natural isolation | 2026-08-27 |

---

## Open Questions

1. **GitHub Remote Setup** — Create under `pv-udpv` or under Perplexity org? (Assuming `pv-udpv` for now)
2. **Raycast Extension Registration** — Does the `orchestrate-tree` command need to be registered in `package.json`?
3. **Local Inference Backend** — Which model to use for each task? (Ollama, MLX, or cloud?) Start with placeholder routing.
4. **Manifest Versioning** — Should `tree.json` be version-controlled or generated on-the-fly?
5. **Chat Branching Sync** — How to keep Raycast chat branches in sync with git worktrees? (Metadata file? Symlink?)

---

## Artifacts & Links

| Artifact | Path | Status |
|---|---|---|
| Supervisor Prompt | `docs/supervisor.md` | ✓ |
| Routing Schema | `docs/routing-schema.json` | ✓ |
| Orchestration Framework | `packages/orchestration/src/supervisor-config.ts` | ✓ |
| Raycast Command | `apps/raycast-extension/src/commands/orchestrate-tree.tsx` | ✓ |
| Bootstrap Script | `scripts/bootstrap-full.sh` | ✓ |
| Research Template | `docs/research-templates/RESEARCH_TEMPLATE.md` | ✓ |
| Git Worktree Research | `docs/research/10-git-worktree-research.md` | ✓ |
| Subagents Research | `docs/research/20-zbst-tech-subagents-research.md` | ✓ |
| Inference Research | `docs/research/30-local-inference-research.md` | ✓ |
| Risk Register | `docs/RISK_REGISTER.json` | ✓ |
| Chat Root | Raycast: `00-root-ollama-launch-harness-research` | ✓ |
| Child Branches (9) | Raycast: `10-git-worktree` → `90-notes-and-findings` | ✓ |
| Worklog (This File) | `WORKLOG.md` | ✓ |

---

## Summary

**What we built:**
- **Orchestration design** for a 10-agent system (supervisor + 9 specialists)
- **Research framework** with templates, risk registers, and decision matrices
- **Git repo scaffold** with directory structure, bootstrap script, and Raycast integration
- **Chat tree** normalized and branched into 9 parallel research threads

**Current state:**
- Design complete; scaffolding ready
- Git repo exists at `~/dev/raycast-agent-orchestration`
- Raycast folder structure matches repo organization
- All design docs written; awaiting first commit

**Next:** Execute `bootstrap-full.sh`, commit to GitHub, and begin populating research threads with focused work per branch.

---

**Author:** Raycast AI (Claude Sonnet 5)  
**Last Updated:** 2026-08-28 02:36:01 UTC  
**Chat ID:** `01M12QEMXKY44BRVB0RJJZ0T0K`
