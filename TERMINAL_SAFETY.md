# Terminal Automation — Safe Shell Operations

**Branch:** `60-terminal-automation`  
**Context:** Worktree bootstrap, git operations, safe command execution

---

## Safe command whitelist

Operations allowed in terminal automation:

| Category | Command | Safety level |
|---|---|---|
| git worktree | `git worktree add` | safe |
| git worktree | `git worktree remove` | safe |
| git worktree | `git worktree prune` | safe |
| git worktree | `git worktree repair` | safe |
| git operations | `git add`, `git commit` | safe |
| git operations | `git push` | careful (requires auth) |
| directory ops | `mkdir -p` | safe (idempotent) |
| file ops | `cat`, `echo` | safe |
| file ops | `rm -rf worktrees/*` | **dangerous** (needs confirmation) |

---

## Dangerous operations (require explicit approval)

* `git push --force`
* `git reset --hard`
* `rm -rf .git`
* Database mutations (`ALTER TABLE`, `DELETE`)

---

## Bootstrap flow

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. Create worktree directories
mkdir -p worktrees

# 2. Create main worktree (if not exists)
if [ ! -d worktrees/main ]; then
  git worktree add worktrees/main main
fi

# 3. Create feature worktrees
for branch in 10-git-worktree 20-zbst-tech-subagents ... 90-notes-and-findings; do
  if [ ! -d "worktrees/wt-${branch}" ]; then
    git worktree add "worktrees/wt-${branch}" -b "${branch}"
  fi
done

# 4. Create docs structure
mkdir -p docs/research docs/templates

# 5. Export initial manifest
cat > tree.json << EOF
{...}
EOF

echo "✓ Bootstrap complete"
```

---

## Error handling

All scripts must:
- Exit on first error (`set -e`)
- Abort if preconditions fail
- Log all operations
- Provide rollback instructions on failure

---

## Implementation status

- [x] Safe command whitelist defined
- [x] Bootstrap script created
- [ ] Error handling suite
- [ ] Rollback procedures
- [ ] CI/CD integration

---

**Next:** Implement error handling + CI integration.
