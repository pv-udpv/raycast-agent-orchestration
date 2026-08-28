# Raycast Agent Orchestration

A comprehensive orchestration system for managing Raycast-based chat-tree branching, git worktrees, zbst.tech subagents, local inference routing, and deterministic manifest export.

## Structure

```text
00-root-ollama-launch-harness-research/
├── 10-git-worktree
├── 20-zbst-tech-subagents
├── 30-local-inference
├── 40-raycast-integration
├── 50-worker-agent
├── 60-terminal-automation
├── 70-manifest-notes
├── 80-comparison-matrix
└── 90-notes-and-findings
```

## Quick start

```bash
# Bootstrap git worktrees
./scripts/bootstrap-full.sh

# Export manifest
npm run export-manifest

# Validate tree
npm run validate
```

## Key concepts

* **Sortable NN-slug naming** — Deterministic ordering (00-, 10-, 20-, etc.)
* **Researcher-first flow** — Research informs all downstream decisions
* **Fan-out/fan-in orchestration** — Parallel specialist subagents
* **Git worktree isolation** — One worktree per branch
* **Local-first inference** — Minimize latency; fallback to remote

## Documentation

* `WORKLOG.md` — Project timeline and deliverables
* `docs/RESEARCH_TEMPLATE.md` — Research report template
* `docs/RISK_REGISTER.json` — Consolidated risk matrix
* `docs/research/` — Per-branch deep dives

## Next steps

1. Run `./scripts/bootstrap-full.sh` to create worktrees
2. Begin implementation in `10-git-worktree` and `20-zbst-tech-subagents` branches
3. Populate remaining branches with focused work

See `WORKLOG.md` for full project context.
