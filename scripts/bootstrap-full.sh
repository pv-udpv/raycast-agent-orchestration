#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_ROOT="$REPO_ROOT/worktrees"

echo "[BOOTSTRAP] Starting full orchestration bootstrap"
echo "[BOOTSTRAP] Repo root: $REPO_ROOT"
echo "[BOOTSTRAP] Worktree root: $WORKTREE_ROOT"

# 1. Create worktree directory
mkdir -p "$WORKTREE_ROOT"

# 2. Create main worktree (if not exists)
if [ ! -d "$WORKTREE_ROOT/main" ]; then
  echo "[BOOTSTRAP] Creating main worktree..."
  git -C "$REPO_ROOT" worktree add "$WORKTREE_ROOT/main" main 2>/dev/null || echo "[BOOTSTRAP] Main worktree already exists or branch missing"
fi

# 3. Create research worktrees
echo "[BOOTSTRAP] Creating research worktrees..."
declare -a TOPICS=(
  "10-git-worktree"
  "20-zbst-tech-subagents"
  "30-local-inference"
  "40-raycast-integration"
  "50-worker-agent"
  "60-terminal-automation"
  "70-manifest-notes"
  "80-comparison-matrix"
  "90-notes-and-findings"
)

for TOPIC in "${TOPICS[@]}"; do
  WORKTREE_NAME="wt-${TOPIC}"
  WORKTREE_PATH="$WORKTREE_ROOT/$WORKTREE_NAME"
  
  if [ ! -d "$WORKTREE_PATH" ]; then
    echo "[BOOTSTRAP] Creating worktree: $WORKTREE_NAME"
    git -C "$REPO_ROOT" worktree add "$WORKTREE_PATH" -b "$TOPIC" 2>/dev/null || echo "[BOOTSTRAP] Worktree already exists: $WORKTREE_NAME"
  else
    echo "[BOOTSTRAP] Worktree already exists: $WORKTREE_NAME"
  fi
done

# 4. Create docs directory structure
echo "[BOOTSTRAP] Creating docs structure..."
mkdir -p "$REPO_ROOT/docs/research"
mkdir -p "$REPO_ROOT/docs/research-templates"
mkdir -p "$REPO_ROOT/packages/orchestration/src/subagents"

# 5. Generate research templates
echo "[BOOTSTRAP] Copying research templates..."
cat > "$REPO_ROOT/docs/research-templates/RESEARCH_TEMPLATE.md" << 'TEMPLATE'
# Research Report: {TOPIC}

**Branch:** `NN-{topic}`  
**Date:** {DATE}  
**Researcher:** Researcher Agent  
**Status:** complete | in-progress | blocked

---

## Executive Summary

{One paragraph summary}

---

## Best Practices

### 1. {Practice}
- **Description:** 
- **Why it matters:** 
- **How we apply it:** 

---

## Anti-Patterns

### 1. {Anti-pattern}
- **Description:** 
- **Why to avoid:** 
- **Impact if ignored:** 

---

## Gotchas & Edge Cases

| Gotcha | Trigger | Mitigation |
|--------|---------|-----------|
| {gotcha} | when {condition} | {mitigation} |

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|-----------|
| {risk} | high/med/low | high/med/low | {mitigation} |

---

## Recommendations

### Primary Recommendation
{Clear, actionable recommendation}

---

## References

* [Link 1: Title]
* [Link 2: Title]

---

**Artifacts:** 
- `{topic}-decision-matrix.json`
- `{topic}-checklist.md`
TEMPLATE

# 6. Initialize subagent stubs
echo "[BOOTSTRAP] Initializing subagent stubs..."
for AGENT in researcher planner tree worktree raycast inference manifest terminal subagents; do
  touch "$REPO_ROOT/packages/orchestration/src/subagents/${AGENT}-agent.ts" 2>/dev/null || true
done

# 7. Export initial manifest
echo "[BOOTSTRAP] Exporting initial manifest..."
cat > "$REPO_ROOT/docs/tree-bootstrap.json" << 'MANIFEST'
{
  "treeId": "raycast-agent-orchestration-v1",
  "name": "raycast-agent-orchestration",
  "rootId": "00-root",
  "createdAt": "2026-08-27T21:05:00Z",
  "updatedAt": "2026-08-27T21:05:00Z",
  "branches": [
    { "prefix": "00-", "title": "root" },
    { "prefix": "10-", "title": "git-worktree" },
    { "prefix": "20-", "title": "zbst-tech-subagents" },
    { "prefix": "30-", "title": "local-inference" },
    { "prefix": "40-", "title": "raycast-integration" },
    { "prefix": "50-", "title": "worker-agent" },
    { "prefix": "60-", "title": "terminal-automation" },
    { "prefix": "70-", "title": "manifest-notes" },
    { "prefix": "80-", "title": "comparison-matrix" },
    { "prefix": "90-", "title": "notes-and-findings" }
  ]
}
MANIFEST

# 8. Summary
echo ""
echo "[BOOTSTRAP] ✓ Bootstrap complete!"
echo "[BOOTSTRAP] Worktrees:"
ls -la "$WORKTREE_ROOT" 2>/dev/null | grep "^d" | awk '{print "  - " $NF}' || echo "  (none yet)"
echo ""
echo "[BOOTSTRAP] Next steps:"
echo "  1. cd $WORKTREE_ROOT/wt-10-git-worktree"
echo "  2. Review docs/research/ for research reports"
echo "  3. Run git status to verify tree"
