# Raycast Agent Orchestration

**zbst.tech hosted orchestration system for chat-tree branching, git worktrees, and subagent task dispatch.**

Supervisor + 8 specialist subagents coordinate:
- Chat tree normalization
- Git worktree layout
- Local inference routing (4-tier fallback)
- Manifest export and drift detection
- Terminal-safe automation

Deployed to **orchestrator.zbst.tech** (Cloudflare Workers + Durable Objects).

---

## Quick Start

```bash
# Bootstrap local development
bash scripts/bootstrap-full.sh

# Start wrangler dev
cd apps/worker-agent
wrangler dev --local

# Orchestrate via API
curl -X POST http://localhost:8787/agents/supervisor/test/orchestrate \
  -H "content-type: application/json" \
  -d '{"workloadScope": "00-ollama-launch-harness-research"}'
```

---

## Project Structure

```
apps/
  ├── raycast-extension/    # Raycast UI commands
  └── worker-agent/         # Cloudflare Workers agent backend (zbst.tech)

packages/
  ├── zbst-tech/            # Subagent taxonomy, routing matrix, registry
  ├── local-inference/      # Model routing & fallback policy
  ├── terminal-ops/         # Safe shell execution
  ├── manifest/             # Tree export, sync, drift detection
  └── shared/               # Shared types and utilities

docs/
  ├── research/             # Per-branch research reports
  ├── tree.json             # Canonical manifest
  └── RISK_REGISTER.json    # Consolidated risks

scripts/
  ├── bootstrap-full.sh     # Create worktrees + scaffold
  └── export-manifest.ts    # Export tree to disk

worktrees/
  ├── wt-10-git-worktree/
  ├── wt-20-zbst-tech-subagents/
  ├── ... (8 total)
  └── wt-90-notes-and-findings/
```

---

## Subagents

| Agent | Role | Sequencing |
|-------|------|-----------|
| **Researcher** | Deep investigation per topic | early (parallel) |
| **Planner** | Decompose into branches | early (sequential) |
| **Tree** | Normalize chat/folder structure | parallel |
| **Worktree** | Map branches to git worktrees | parallel |
| **Raycast** | Chat and folder operations | parallel |
| **Inference** | Model routing (4-tier fallback) | parallel |
| **Manifest** | Tree export and drift detection | parallel |
| **Terminal** | Safe shell execution | late (sequential) |

---

## Deployment

### Staging

```bash
wrangler deploy --env staging
# → https://orchestrator-staging.zbst.tech/
```

### Production

```bash
wrangler deploy --env production
# → https://orchestrator.zbst.tech/
```

---

## Chat Branches

Each topic has a dedicated Raycast chat:

- `00-root-ollama-launch-harness-research` — overview and coordination
- `10-git-worktree` — worktree patterns, cleanup policy, commands
- `20-zbst-tech-subagents` — **[THIS BRANCH]** agent orchestration
- `30-local-inference` — model selection, routing, benchmarks
- `40-raycast-integration` — chat API, folder operations
- `50-worker-agent` — Cloudflare Workers integration
- `60-terminal-automation` — shell safety, auditing
- `70-manifest-notes` — tree export, drift, snapshots
- `80-comparison-matrix` — decision tradeoffs
- `90-notes-and-findings` — scratch, open questions, followups

---

## Progress

### Phase 1–7: Design ✓
- Architecture designed
- Chat tree materialized (9 branches)
- Research reports drafted
- Risk register compiled

### Phase 8: Implementation (in progress)
- Supervisor + subagent scaffolds written
- zbst.tech wrangler config prepared
- SUBAGENT_REGISTRY and ROUTING_MATRIX live
- Durable Objects bindings configured
- Subagent stubs ready for real logic

### Phase 9: Deployment
- Wire routing (Supervisor → DOs)
- Add SQL persistence
- Deploy to zbst.tech
- Smoke tests

---

## Next Steps

1. Implement real subagent logic (SQL + LLM calls)
2. Test locally with wrangler dev
3. Deploy staging environment
4. Run end-to-end orchestration test
5. Move to `30-local-inference` for model routing

---

## Contacts & Docs

- **Owner:** @pv-udpv (Paul)
- **Domain:** zbst.tech
- **Repo:** pv-udpv/raycast-agent-orchestration
- **Worklog:** ./WORKLOG.md
- **Risks:** ./docs/RISK_REGISTER.json
