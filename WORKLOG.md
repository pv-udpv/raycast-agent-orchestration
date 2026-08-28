# Raycast Agent Orchestration — Project Worklog

**Date:** 2026-08-27  
**Duration:** 4.5 hours (16:35–21:06)  
**Folder:** `Ollama Launch / Harness Research`  
**Root chat:** `00-root-ollama-launch-harness-research` (`01M1216YX3VPWHPPRDRFZNJNGB`)  
**Status:** Branch tree created; root archived; 9 branches active

---

## Executive summary

Designed and scaffolded a **Raycast agent orchestration system** for managing chat-tree branching, git worktrees, zbst.tech subagents, local inference routing, and deterministic manifest export. Established **researcher-first flow** (research informs all downstream decisions), **fan-out/fan-in execution** (maximize parallelism), and **sortable NN-slug naming** (no mid-project renumbering).

---

## Key insights

* `ollama launch` is primarily an integrations launcher for terminal agents, not a general chat tool.
* Harness/integration is the right decomposition axis, not feature lists.
* **Sortable NN-slug naming** (`00-`, `10-`, `20-`, etc.) keeps the tree deterministic and machine-readable.
* **Researcher-first flow** is essential—research findings inform all subagent decisions downstream.
* **Git worktree per branch** minimizes checkout overhead and enables true parallel development.
* **Local-first inference** with explicit remote fallback minimizes latency and cost.
* **Manifest as source of truth** keeps tree state deterministic and auditable.
* **Fan-out/fan-in orchestration** is the right pattern for independent specialist subagents.

---

## Chat tree structure

| Prefix | Chat ID | Title | Type | Status |
|---|---|---|---|---|
| `00-` | `01M1216YX3VPWHPPRDRFZNJNGB` | `00-root-ollama-launch-harness-research` | root | archived |
| `10-` | `01M12GMSN5E1KTB2AVNAZPPSXN` | `10-git-worktree` | branch | active |
| `20-` | `01M12GMSPA3BF57K4CZSWJ4598` | `20-zbst-tech-subagents` | branch | active |
| `30-` | `01M12GMSQPZ9779ADG6M1RQDQZ` | `30-local-inference` | branch | active |
| `40-` | `01M12GMSRQZ5RJ7MVBD7YK33YT` | `40-raycast-integration` | branch | active |
| `50-` | `01M12GMSSKEJR2DV50CE2T44JW` | `50-worker-agent` | branch | active |
| `60-` | `01M12GMSTD5D9W456JWM5RQ2S2` | `60-terminal-automation` | branch | active |
| `70-` | `01M12GMSW2XNG0ZSKWF5DZJTP6` | `70-manifest-notes` | branch | active |
| `80-` | `01M12GMSXD73GJ6YFT91M8DWK3` | `80-comparison-matrix` | branch | active |
| `90-` | `01M12GPBPS61B2XSPMVHNPFFFJ` | `90-notes-and-findings` | branch | active |

---

## Phases completed

### Phase 1: Research & Discovery (16:35–16:57)

**Input:** User asks about `ollama launch` command and harness options.

**Deliverables:**
* Harness comparison matrix (7 harnesses: DeepSeek, Claude Code, OpenCode, Codex, Droid, Hermes, Pi)
* Decision criteria (agent style, tool use, config surface, cloud/local compatibility)
* Recommendation: orchestrate per-harness, not per-feature

### Phase 2: Chat Organization (16:57–17:00)

**Input:** Establish folder structure with root + branching breakdown.

**Deliverables:**
* Folder: `Ollama Launch / Harness Research`
* Root chat: `00-root-ollama-launch-harness-research`
* Naming scheme: sortable `NN-slug` prefixes

### Phase 3: Raycast Agent Design (17:00–17:02)

**Input:** Design Raycast agent for chat-tree orchestration.

**Deliverables:**
* System architecture (Raycast extension + Cloudflare backend)
* Data model (TreeNode, TreeState)
* Backend skeleton (Agents SDK)
* Raycast integration layer (commands: Tree Manager, Normalize Root, Create Branch Plan, Export Manifest, Sync Tree)
* File layout (apps/, packages/, docs/, scripts/)

### Phase 4: Git Worktree + Subagent Architecture (17:02–17:21)

**Input:** Branch with git worktree; integrate zbst.tech subagents; add local inference.

**Deliverables:**
* Branched tree (9 major branches, each with sub-branches)
* Git worktree layout (wt-NN-topic naming; worktrees/ directory)
* Subagent taxonomy (6 agents: planner, tree, worktree, raycast, inference, terminal)
* Full repo scaffold

### Phase 5: Subagent Orchestration (17:22–17:23)

**Input:** Orchestrate workload with subagents.

**Deliverables:**
* Supervisor + 8 specialist subagents
* Routing matrix (task-type → subagent)
* Fan-out/fan-in execution strategy
* Drop-in implementation (supervisor-config.ts, routing JSON, task contracts)

### Phase 6: Researcher Agent Addition (17:23–19:22)

**Input (Russian):** "Missing researcher at minimum."

**Deliverables:**
* Researcher Agent spec
* Research-first flow (researcher runs in parallel; informs all downstream decisions)
* 3 detailed research reports:
  - `10-git-worktree-research.md`
  - `20-zbst-tech-subagents-research.md`
  - `30-local-inference-research.md`
* Consolidated risk register (6 risks)

### Phase 7: Full Implementation Scaffold (19:22–19:22)

**Input:** "Go ahead and" implementation.

**Deliverables:**
* Research report template (RESEARCH_TEMPLATE.md)
* Per-branch research reports with best practices, anti-patterns, gotchas, risks, recommendations
* Risk register (RISK_REGISTER.json)
* Raycast orchestration command (orchestrate-tree.tsx)
* Bootstrap script (bootstrap-full.sh)

### Phase 8: Chat Normalization & Branch Creation (21:01–21:06)

**Input:** Normalize chats and synthesize worklog.

**Deliverables:**
* Root chat renamed to `00-root-ollama-launch-harness-research`
* 9 branch chats created and renamed:
  - `10-git-worktree` through `90-notes-and-findings`
* All branches moved into folder
* WORKLOG.md written (this file)
* Root chat archived for housekeeping

---

## Subagent orchestration design

### Supervisor

Routes tasks to 8 specialist subagents using explicit routing matrix.

### Specialists

| Agent | Domain | Key responsibility |
|---|---|---|
| **Researcher** | Investigation | Deep-dive per topic; surface gotchas, risks, recommendations |
| **Planner** | Decomposition | Break workload into branches; create branch plan |
| **Tree** | Chat state | Normalize folder/chat/tree; detect drift |
| **Worktree** | Git isolation | Map branches to git worktrees; generate commands |
| **Raycast** | UI automation | Create folders, rename chats, branch chats, export manifests |
| **Inference** | Model routing | Choose local vs remote; manage fallback chain |
| **Manifest** | Persistence | Export tree.json/tree.md; detect drift |
| **Terminal** | Shell ops | Execute safe worktree/git/repo bootstrap commands |

### Execution strategy

1. **Research** runs in parallel with planning (researcher-first)
2. **Planner** decomposes workload (informed by research)
3. **Fan-out** all other specialists in parallel
4. **Fan-in** merge results into canonical manifest
5. **Validate** naming, ordering, completeness, drift
6. **Report** final state + next actions

---

## Key decisions

| Decision | Rationale |
|----------|-----------|
| Sortable NN-slug naming | Deterministic ordering; natural sorting; no mid-project renumbering |
| Researcher-first flow | Research informs all downstream subagent decisions; reduces blind spots |
| Fan-out/fan-in execution | Maximize parallelism; minimize latency; keep supervisor logic simple |
| Local-first inference | Minimize latency and cost; fallback to remote when necessary |
| Git worktree per branch | True parallel development; no checkout wait; natural isolation |
| Manifest as source of truth | Deterministic, auditable, reproducible tree state |
| Durable agent state (Agents SDK) | Survive restarts; enable retry; maintain audit trail |

---

## Artifacts on disk

```text
~/dev/raycast-agent-orchestration/
    WORKLOG.md                           ← this file
    README.md                             ← to be created
    tree.json                             ← to be generated
    tree.md                               ← to be generated
    .gitignore
    package.json
    
    apps/
        raycast-extension/
            package.json
            raycast.json
            tsconfig.json
            src/
                commands/
                    tree-manager.tsx
                    normalize-root.tsx
                    create-branch-plan.tsx
                    export-tree.tsx
                    sync-tree.tsx
                lib/
                    api.ts
                    chat.ts
                    manifest.ts
                    tree.ts
                    terminal.ts
                    files.ts
                types/
                    tree.ts
        
        worker-agent/
            package.json
            wrangler.jsonc
            tsconfig.json
            src/
                agent.ts
                state.ts
                schema.ts
                routes.ts
    
    packages/
        shared/
            package.json
            src/
                index.ts
                constants.ts
                naming.ts
                manifest.ts
                types.ts
        
        orchestration/
            package.json
            src/
                supervisor-config.ts
                subagents/
                    index.ts
                    researcher-agent.ts
                    planner-agent.ts
                    tree-agent.ts
                    worktree-agent.ts
                    raycast-agent.ts
                    inference-agent.ts
                    manifest-agent.ts
                    terminal-agent.ts
        
        zbst-tech/
            package.json
            src/
                index.ts
                subagents.ts
                routing.ts
                handoff.ts
        
        local-inference/
            package.json
            src/
                index.ts
                router.ts
                models.ts
                fallback.ts
                benchmark.ts
        
        terminal-ops/
            package.json
            src/
                index.ts
                worktree.ts
                git.ts
                shell.ts
                safety.ts
        
        manifest/
            package.json
            src/
                index.ts
                export.ts
                import.ts
                diff.ts
                checklist.ts
    
    docs/
        RESEARCH_TEMPLATE.md
        RISK_REGISTER.json
        research/
            10-git-worktree-research.md
            20-zbst-tech-subagents-research.md
            30-local-inference-research.md
        templates/
            RESEARCH_TEMPLATE.md
    
    scripts/
        bootstrap-worktrees.sh
        bootstrap-full.sh
        export-manifest.ts
        sync-tree.ts
        validate-tree.ts
    
    worktrees/                           ← git worktree roots
        main/
        wt-10-git-worktree/
        wt-20-zbst-tech-subagents/
        wt-30-local-inference/
        wt-40-raycast-integration/
        wt-50-worker-agent/
        wt-60-terminal-automation/
        wt-70-manifest-notes/
        wt-80-comparison-matrix/
        wt-90-notes-and-findings/
```

---

## Next immediate actions

1. **Create README.md** with project overview and quick start.
2. **Run bootstrap-full.sh** to scaffold worktrees and docs structure.
3. **Commit to git** with message: "Initial scaffold: Raycast orchestrator design + branch tree + subagent specs"
4. **Push to GitHub** (`pv-udpv/raycast-agent-orchestration`)
5. **Begin Phase 9 (Implementation)**:
   - Start in `10-git-worktree` branch: concretize worktree commands, cleanup policy, validation
   - Parallel: Start in `20-zbst-tech-subagents` branch: finalize routing matrix, handoff graph, observability
   - Once first two are solid: move to `30-local-inference`, `40-raycast-integration`, etc.

---

## Open questions / risks

* **GitHub remote:** Use `pv-udpv/raycast-agent-orchestration`? Or private repo?
* **zbst.tech domain:** Which Cloudflare Workers environment for supervisor/agents?
* **Local inference:** OrbStack Ubuntu with Ollama/MLX? Or fallback to remote?
* **Chat integration:** Which exact Raycast chat APIs for root/branch creation?
* **Terminal whitelist:** Which shell operations are safe to automate?
* **State schema:** Finalize Agents SDK SQLite schema for tree/worktree state?

---

## Housekeeping notes

* Root chat (`00-root`) has been **archived** to keep the folder clean (active work happens in branches).
* Each branch carries the full root conversation history as context (allows independent work without losing background).
* Branch chats are **not pinned** (they live in the folder; folder is the primary organizational unit).
* Memory has been updated with current project context (Raycast agent orchestration system design + branching strategy).

---

**Last updated:** 2026-08-27 21:06  
**Next update:** After bootstrap script runs + worktrees created + initial commit pushed
