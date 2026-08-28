# Raycast Integration — Commands & Chat Ops

**Branch:** `40-raycast-integration`  
**Context:** Raycast extension commands, idempotent chat operations, manifest export

---

## Command suite

### 1. Tree Manager
Opens dashboard showing:
- Current root chat
- Folder ID
- Missing branches
- Manifest sync status
- Quick actions (normalize, branch, export)

**Command:** `tree-manager`
**Shortcut:** None (dashboard-only)

### 2. Normalize Root Chat
Renames current chat to canonical root.

**Command:** `normalize-root-chat`
**Input:** none (uses current chat)
**Output:** chat renamed, folder assigned

### 3. Create Branch Plan
Generates the exact prefix tree.

**Command:** `create-branch-plan`
**Input:** workload scope
**Output:** branch plan checklist (markdown)

### 4. Export Manifest
Writes `tree.json` and `tree.md`.

**Command:** `export-tree-manifest`
**Input:** current state
**Output:** files written to repo

### 5. Sync Tree
Compares current chat tree vs manifest.

**Command:** `sync-tree`
**Input:** none
**Output:** drift report

---

## Chat ops — Idempotency

All chat operations must be idempotent:

| Operation | Idempotent? | Method |
|---|---|---|
| Create folder | Yes | Check exists first |
| Rename chat | Yes | Compare current title |
| Branch chat | Yes | Check parent state |
| Move to folder | Yes | Check current folder |

---

## Implementation checklist

- [x] Command definitions
- [ ] UI layouts (each command)
- [ ] Integration with chat API
- [ ] Error handling & rollback
- [ ] Raycast.json configuration

---

**Next:** Implement command UIs + chat API integration.
