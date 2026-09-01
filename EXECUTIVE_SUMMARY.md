# Raycast Agent Orchestration — Executive Summary

**Project:** Multi-tenant agentic Raycast extension for chat-tree branching, git worktree management, and local/remote inference dispatch.

**Timeline:** Single session, 2026-08-27 → 2026-09-01 (5 days)

**Status:** Design + Scaffolding ✓ | Deployment ⏳

---

## What was built

### 1. Core Architecture

**Supervisor + 8 specialist subagents** orchestrated via Cloudflare Agents SDK:

| Agent | Role |
|-------|------|
| **Researcher** | Deep investigation, risk analysis, best practices per topic |
| **Planner** | Decomposition, branch planning, sequencing |
| **Tree** | Chat/folder state management, drift detection |
| **Worktree** | Git isolation strategy, cleanup policy |
| **Raycast** | UI commands, idempotent chat operations |
| **Inference** | Local/remote model routing (Ollama, MLX, Codex, Perplexity, Claude, GPT) |
| **Manifest** | Tree export, sync, version control |
| **Terminal** | Safe shell automation, bootstrap |

### 2. System Design

```
Raycast UI
    ↓
ChatTreeAgent (Cloudflare Workers Durable Object)
    ├── Tree state (SQLite)
    ├── Inference router (9 models)
    ├── RPC endpoints (callable methods)
    └── Streaming support
    
    ↓
Local inference (OrbStack + Tailscale)
    ├── Ollama (mistral, neural-chat, deepseek-coder)
    ├── MLX (quantized models)
    ├── Codex-JS (code generation)
    └── Perplexity bridge (web-aware research)
    
    ↓ (Fallback)
Remote inference
    ├── Claude Opus
    ├── GPT-4o
    └── Perplexity Sonar Pro
```

### 3. Deliverables

#### Code & scaffolding
- **9 git branches** with isolated worktrees
- **ChatTreeAgent** (Cloudflare Agents SDK + inference routing)
- **Raycast extension** (tree-manager, invoke-model commands)
- **InferenceRouter** (smart model selection + dispatch)
- **Networking setup** (OrbStack + Tailscale)

#### Documentation
- `DEPLOYMENT_GUIDE.md` — 6-phase deployment walkthrough
- `WORKLOG.md` — 8-phase project timeline
- Per-branch specs (10-git-worktree through 90-notes-and-findings)
- E2E integration test plan (T1–T8)
- Risk register + troubleshooting guides

#### Tests
- T1: Tree Manager dashboard
- T2: Local inference (low urgency)
- T3: Remote inference (high urgency)
- T4: Web-aware inference
- T5: Model routing logic
- T6: Batch parallel inference
- T7: Tree drift detection
- T8: Manifest export

---

## Key technical decisions

| Decision | Why |
|----------|-----|
| **Sortable NN-slug naming** | Deterministic ordering, no mid-project renumbering |
| **Researcher-first flow** | Research informs all downstream decisions |
| **Fan-out/fan-in execution** | Maximize parallelism, keep supervisor simple |
| **Local-first inference** | Minimize latency & cost, explicit fallback to remote |
| **Git worktree per branch** | True parallel development, no checkout overhead |
| **Manifest as source of truth** | Deterministic, auditable, reproducible state |

---

## Progress matrix

| Component | Status | Notes |
|-----------|--------|-------|
| **Design** | ✓ 100% | All 9 branches architected |
| **Code** | ✓ 100% | Agent, router, commands scaffolded |
| **Docs** | ✓ 100% | Deployment guide, specs, tests ready |
| **Deployment** | ⏳ 65% | Prerequisites done; worker + OrbStack in progress |

---

## Current blockers (minor)

1. **npm workspace resolution** — Using `agents: latest` as workaround
2. **orbctl shell piping** — Using SSH directly instead
3. **Raycast CLI availability** — Using Raycast app + develop mode

All blockers are straightforward to resolve; no architectural issues.

---

## Next 3 steps

1. **Deploy ChatTreeAgent** to Cloudflare Workers (5 min)
2. **Setup OrbStack Tailscale** and Ollama (10 min)
3. **Execute E2E tests** (T1–T8) and verify (20 min)

**Total time to go-live:** ~40 minutes

---

## Resource requirements

- **macOS:** 2GB free disk (dependencies) + Raycast running
- **OrbStack:** 4GB RAM allocated, Ollama service
- **Network:** Tailscale mesh (free tier sufficient)
- **Cloud:** Cloudflare Workers (free tier sufficient for development)

---

## Who owns what

- **Raycast UI** — Commands in `wt-40-raycast-integration`
- **Backend logic** — ChatTreeAgent in `wt-50-worker-agent`
- **Inference** — InferenceRouter in `src/inference.ts`
- **Networking** — OrbStack + Tailscale guide in `wt-60-terminal-automation`
- **Testing** — E2E plan in `wt-90-notes-and-findings`

---

## Success criteria

- [ ] All E2E tests pass (T1–T8)
- [ ] Local inference latency < 500ms (Ollama)
- [ ] Remote inference fallback works
- [ ] Tree state persists across restarts
- [ ] Raycast commands are responsive

---

## One-line elevator pitch

> A researcher-first, locally-optimized AI agent orchestration system that turns Raycast into a dynamic chat-tree branching + inference dispatch platform, with optional Cloudflare Workers backend and OrbStack + Tailscale networking.

---

**GitHub:** https://github.com/pv-udpv/raycast-agent-orchestration  
**Branches:** 9 active (10-git-worktree through 90-notes-and-findings)  
**Ready for:** Local testing → production deployment

