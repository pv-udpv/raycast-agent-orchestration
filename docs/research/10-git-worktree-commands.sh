#!/usr/bin/env bash
# Git Worktree Bootstrap Commands
# Branch: 10-git-worktree
# Purpose: Create and configure all 9 worktrees per NN-slug naming convention

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKTREE_ROOT="$REPO_ROOT/worktrees"

echo "[WORKTREE BOOTSTRAP] Starting git worktree creation"
echo "[WORKTREE BOOTSTRAP] Repo: $REPO_ROOT"
echo "[WORKTREE BOOTSTRAP] Worktree root: $WORKTREE_ROOT"
echo ""

# Create base directory
mkdir -p "$WORKTREE_ROOT"

# 1. Main worktree (canonical)
echo "[WORKTREE] Creating main worktree..."
if [ ! -d "$WORKTREE_ROOT/main" ]; then
  git -C "$REPO_ROOT" worktree add "$WORKTREE_ROOT/main" main || echo "[WORKTREE] main already exists"
fi

# 2. Create topic worktrees in order
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
    echo "[WORKTREE] Creating: $WORKTREE_NAME"
    git -C "$REPO_ROOT" worktree add "$WORKTREE_PATH" -b "$TOPIC" 2>/dev/null || \
      echo "[WORKTREE] Could not create $WORKTREE_NAME (branch may exist)"
  else
    echo "[WORKTREE] Already exists: $WORKTREE_NAME"
  fi
done

echo ""
echo "[WORKTREE BOOTSTRAP] Listing created worktrees:"
git -C "$REPO_ROOT" worktree list --porcelain | awk '{print "  - " $1}'

echo ""
echo "[WORKTREE BOOTSTRAP] ✓ Bootstrap complete!"
echo ""
echo "Next steps:"
echo "  1. cd $WORKTREE_ROOT/wt-10-git-worktree"
echo "  2. Review and edit branch-specific code"
echo "  3. Commit changes to the branch"
echo "  4. git worktree remove wt-10-git-worktree (when done)"
echo ""
