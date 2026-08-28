# Manifest Persistence — Export, Sync, Drift Detection

**Branch:** `70-manifest-notes`  
**Context:** Tree state persistence, drift detection, version control

---

## Manifest files

### `tree.json`
Machine-readable canonical state:
- All nodes with metadata
- Chat IDs and worktree mappings
- Done status per node
- Timestamps

### `tree.md`
Human-readable summary:
- Table format (prefix → title → chat ID → worktree)
- Stats summary
- Quick reference

### `tree-checklist.md`
Task tracking:
- Per-branch checklist
- Dependencies
- Owner assignment
- Status tracking

---

## Sync operations

### Export (local → disk)
```bash
npm run export-manifest
# Writes: tree.json, tree.md, tree-checklist.md
```

### Import (disk → agent state)
```bash
npm run sync-tree
# Loads tree.json into ChatTreeAgent via RPC
```

### Drift detection
```bash
npm run validate
# Compares disk vs agent state; reports mismatches
```

---

## Drift scenarios

| Scenario | Detection | Resolution |
|---|---|---|
| Missing branch | node count mismatch | Create branch + update manifest |
| Title changed | title mismatch | Rename branch + export |
| Chat ID wrong | chatId mismatch | Update manifest or re-sync chat |
| Orphaned worktree | extra node | Remove worktree + update manifest |

---

## Determinism rules

Manifests must be:
- **Sorted by prefix** (00-, 10-, 20-, etc.)
- **Stable key ordering** (same output for same input)
- **No timestamp noise** in diffable outputs
- **No auto-IDs** unless explicitly generated

---

## Implementation status

- [x] tree.json schema defined
- [x] tree.md template created
- [ ] Export script
- [ ] Sync script
- [ ] Drift detection algorithm

---

**Next:** Implement export/sync/validate scripts.
