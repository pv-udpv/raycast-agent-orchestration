# Research Report: Git Worktree

**Branch:** `10-git-worktree`  
**Date:** 2026-08-27  
**Researcher:** Researcher Agent  
**Status:** complete

---

## Executive Summary

Git worktree enables isolated branch development without checkout overhead. For our 9-branch workload, one worktree per major branch minimizes merge conflicts and accelerates context-switching. Primary recommendation: use `wt-NN-topic` naming, keep worktrees in `worktrees/` directory, automate cleanup with a lifecycle script.

---

## Best Practices

### 1. One Worktree Per Major Branch
- **Description:** Create `wt-10-git-worktree`, `wt-20-zbst-tech-subagents`, etc. Avoid mixing unrelated work.
- **Why it matters:** Prevents accidental commits to wrong branch; each worktree is an isolated filesystem view.
- **How we apply it:** Bootstrap 9 worktrees upfront; document branch→worktree mapping in manifest.

### 2. Stable, Sortable Naming
- **Description:** Use `wt-NN-slug` (e.g., `wt-10-git-worktree`, `wt-20-zbst-tech-subagents`).
- **Why it matters:** Makes listing/searching deterministic; sorts naturally.
- **How we apply it:** Never renumber existing worktrees unless rebuilding from scratch.

### 3. Dedicated Worktree Directory
- **Description:** Keep all worktrees under `worktrees/`, not scattered across filesystem.
- **Why it matters:** Easier cleanup, audit, and documentation.
- **How we apply it:** `worktrees/main`, `worktrees/wt-10-*`, etc.

### 4. Share Main .git
- **Description:** Worktrees share one `.git` directory; each worktree has its own branch checkout.
- **Why it matters:** Disk efficient; changes to one branch don't require full re-clone.
- **How we apply it:** Default behavior with `git worktree add`; no special action needed.

### 5. Automate Cleanup
- **Description:** Run `git worktree prune` and remove stale worktrees on schedule.
- **Why it matters:** Prevents disk leaks from dead worktrees.
- **How we apply it:** Add cleanup script to CI or cron; document in README.

---

## Anti-Patterns

### 1. Renumbering Worktrees Mid-Project
- **Description:** Changing `wt-10-*` to `wt-05-*` after creation.
- **Why to avoid:** Breaks references in CI, docs, and team mental model.
- **Impact if ignored:** Confusion about which worktree maps to which branch; merge conflicts.

### 2. Sharing Uncommitted State Between Worktrees
- **Description:** Editing the same file in two worktrees simultaneously without committing first.
- **Why to avoid:** Git can't track both changes; one is lost.
- **Impact if ignored:** Silent data loss.

### 3. Forgetting to `git worktree remove`
- **Description:** Deleting a worktree directory manually without `git worktree remove`.
- **Why to avoid:** Git still thinks the worktree exists; can lock the branch.
- **Impact if ignored:** Branch remains locked; `git checkout` fails until you manually fix it.

---

## Gotchas & Edge Cases

| Gotcha | Trigger | Mitigation |
|--------|---------|-----------|
| IDE indexes all worktrees simultaneously | Using VS Code, IntelliJ with worktrees | Exclude worktree dirs from IDE indexing |
| Branch lock persists after crash | Worktree process crashes mid-operation | Run `git worktree repair` |
| Bisect conflicts across worktrees | Running `git bisect` in one worktree | Avoid concurrent bisect in multiple worktrees |

---

## Recommendations

**Use one worktree per major branch, named `wt-NN-topic`, stored in `worktrees/` directory. Automate cleanup with a weekly `git worktree prune` + audit script.**

---

## References

* [Git Worktree Docs](https://git-scm.com/docs/git-worktree)
* [GitHub: Working with Git Worktrees](https://github.blog/open-source/git/working-with-git-worktrees/)
