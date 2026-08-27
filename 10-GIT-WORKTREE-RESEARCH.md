# Research Report: Git Worktree

**Branch:** `10-git-worktree`  
**Date:** 2026-08-27  
**Researcher:** Researcher Agent  
**Status:** in-progress

---

## Executive Summary

Git worktree enables isolated branch development without checkout overhead. For our 9-branch Raycast orchestrator workload, one worktree per major branch minimizes merge conflicts and accelerates context-switching. **Primary recommendation:** use `wt-NN-topic` naming, keep worktrees in `worktrees/` directory, automate cleanup with a lifecycle script.

Current status: All 9 worktrees bootstrapped. Each checks out its corresponding branch at commit `cbb0451`. Ready for feature development on independent branches.

---

## Best Practices

### 1. One Worktree Per Major Branch
- **Description:** Create `wt-10-git-worktree`, `wt-20-zbst-tech-subagents`, etc. Avoid mixing unrelated work.
- **Why it matters:** Prevents accidental commits to wrong branch; each worktree is an isolated filesystem view.
- **How we apply it:** ✓ Already bootstrapped via `bootstrap-full.sh`. Each worktree checks out its named branch.

### 2. Stable, Sortable Naming
- **Description:** Use `wt-NN-slug` (e.g., `wt-10-git-worktree`, `wt-20-zbst-tech-subagents`).
- **Why it matters:** Makes listing/searching deterministic; sorts naturally.
- **How we apply it:** ✓ All 9 worktrees named per convention. Never renumber existing worktrees.

### 3. Dedicated Worktree Directory
- **Description:** Keep all worktrees under `worktrees/`, not scattered across filesystem.
- **Why it matters:** Easier cleanup, audit, and documentation.
- **How we apply it:** ✓ All worktrees live in `~/dev/raycast-agent-orchestration/worktrees/`.

### 4. Share Main .git
- **Description:** Worktrees share one `.git` directory; each worktree has its own branch checkout.
- **Why it matters:** Disk efficient; changes to one branch don't require full re-clone.
- **How we apply it:** ✓ Default behavior with `git worktree add`. All worktrees point to main `.git`.

### 5. Automate Cleanup
- **Description:** Run `git worktree prune` and remove stale worktrees on schedule.
- **Why it matters:** Prevents disk leaks from dead worktrees.
- **How we apply it:** TODO — Add cron/CI step for weekly cleanup.

---

## Anti-Patterns

### 1. Renumbering Worktrees Mid-Project
- **Description:** Changing `wt-10-*` to `wt-05-*` after creation.
- **Why to avoid:** Breaks references in CI, docs, and team mental model.
- **Impact if ignored:** Confusion about which worktree maps to which branch; merge conflicts.
- **Mitigation:** Commit to never renumber. If reorganization needed, start fresh.

### 2. Sharing Uncommitted State Between Worktrees
- **Description:** Editing the same file in two worktrees simultaneously without committing first.
- **Why to avoid:** Git can't track both changes; one is lost.
- **Impact if ignored:** Silent data loss.
- **Mitigation:** Establish branch-per-developer policy; commit before switching worktrees.

### 3. Forgetting to `git worktree remove`
- **Description:** Deleting a worktree directory manually without `git worktree remove`.
- **Why to avoid:** Git still thinks the worktree exists; can lock the branch.
- **Impact if ignored:** Branch remains locked; `git checkout` fails until you manually fix it.
- **Mitigation:** Add pre-commit hook to detect stale worktrees; document removal procedure.

### 4. Using Worktrees for Temporary Debugging
- **Description:** Creating ad-hoc worktrees without documenting them.
- **Why to avoid:** Other developers don't know they exist; cleanup is manual.
- **Impact if ignored:** Disk bloat, confusion about active branches.
- **Mitigation:** Reserve worktrees for stable, planned branches only.

---

## Gotchas & Edge Cases

| Gotcha | Trigger | Mitigation |
|--------|---------|-----------|
| IDE indexes all worktrees simultaneously | Using VS Code, IntelliJ with worktrees | Exclude worktree dirs from IDE indexing via `.vscode/settings.json` |
| Branch lock persists after crash | Worktree process crashes mid-operation | Run `git worktree repair` to unlock |
| Bisect conflicts across worktrees | Running `git bisect` in one worktree | Avoid concurrent bisect in multiple worktrees; finish in one first |
| Shallow clone incompatibility | Using `--depth` with worktree | Use full clone; worktrees don't support shallow well |
| Pre-commit hooks run in all worktrees | Git hook in one worktree | Scope hooks to specific branches if needed; use `GIT_WORK_TREE` env var |
| Git gc across worktrees | Running garbage collection in main repo | Lock other worktrees first; or run gc per-worktree |

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|-----------|
| Branch lock from stale worktree | high | low | Automate cleanup; document `git worktree repair` in README |
| Disk space leaks from forgotten worktrees | medium | medium | Weekly cleanup script; alert if >N worktrees exist |
| Merge conflicts from parallel edits | high | low | Use strict commit discipline; 1 person per worktree per feature |
| IDE slowdown from indexing all worktrees | medium | high | Exclude worktree dirs from IDE via `.vscode/settings.json`, `.idea/vcs.xml` |
| Worktree filesystem permissions issues | low | low | Use consistent umask; document permissions policy in README |
| Git submodule conflicts in worktrees | low | medium | Avoid submodules in initial version; use pnpm workspaces instead |

---

## Recommendations

### Primary Recommendation
**Use one worktree per major branch, named `wt-NN-topic`, stored in `worktrees/` directory. Automate cleanup with a weekly `git worktree prune` + audit script. Document in README.**

### Secondary Options
1. **Plain branches only** — simpler, but slower context-switching; requires frequent `git checkout`
2. **Temporary worktrees on demand** — flexibility, but manual cleanup; higher disk risk
3. **VM snapshots per branch** — maximum isolation, but heavy overhead

### Decision Rationale
Worktrees give us:
- **Instant context switching** (no checkout wait)
- **Parallel development** (multiple branches checked out simultaneously)
- **Natural branch isolation** (one filesystem per branch)
- **Easy audit** (directory structure reflects branch structure)

Plain branches are simpler but too slow for a 9-branch project. Worktrees match our prefix-driven, deterministic design.

---

## Current Implementation Status

✓ **Done**
- 9 worktrees bootstrapped (`wt-10` through `wt-90`)
- Each checks out its named branch at commit `cbb0451`
- Dedicated `worktrees/` directory
- `.gitignore` excludes worktrees from main repo tracking

⏳ **TODO**
- Add `.vscode/settings.json` to exclude worktrees from IDE indexing
- Create `scripts/cleanup-worktrees.sh` for automated pruning
- Add pre-commit hook to detect stale worktrees
- Document removal procedure in README
- Set up cron/CI for weekly cleanup

---

## References

* [Git Worktree Docs](https://git-scm.com/docs/git-worktree)
* [GitHub Blog: Working with Git Worktrees](https://github.blog/open-source/git/working-with-git-worktrees/)
* [Kernel.org: Worktree Best Practices](https://git.kernel.org/pub/scm/git/git.git/plain/contrib/worktree/git-new-workdir)
* [Stackoverflow: Git Worktree Branch Lock](https://stackoverflow.com/questions/41137760/git-worktree-repair-not-working)

---

## Artifacts

- `10-git-worktree-checklist.md` (TODO)
- `10-git-worktree-decision-matrix.json` (TODO)
- `scripts/cleanup-worktrees.sh` (TODO)
- `scripts/setup-ide-exclusions.sh` (TODO)
