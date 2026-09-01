# End-to-end integration test

**Branch:** `90-notes-and-findings`  
**Purpose:** Validate the full orchestration pipeline from Raycast → Agent → Local/Remote inference

---

## Test matrix

| Test | Flow | Expected |
|---|---|---|
| T1 | Raycast tree-manager loads | Dashboard shows 10 nodes, 0 done |
| T2 | Invoke model (low urgency) | Uses local Ollama (mistral-7b) |
| T3 | Invoke model (high urgency) | Uses remote (Claude Opus) |
| T4 | Invoke model (research + web) | Uses Perplexity (local bridge if available) |
| T5 | Model choice routing | Returns correct choice for task/urgency combo |
| T6 | Batch inference | Processes 3 requests in parallel |
| T7 | Tree sync | Detects drift between manifest and agent state |
| T8 | Manifest export | Writes tree.json and tree.md |

---

## Preconditions

- [ ] Tailscale network active (macOS ↔ OrbStack)
- [ ] Ollama running on OrbStack: `ollama serve`
- [ ] Models pulled: `mistral`, `neural-chat`, `deepseek-coder`
- [ ] ChatTreeAgent deployed or running locally
- [ ] Raycast extension in dev mode: `ray develop`

---

## Test execution

### T1: Tree Manager Dashboard

```bash
# In Raycast
1. Open "Tree Manager" command
2. Verify dashboard loads
3. Check: 10 nodes, 0 done, root/folder IDs
```

**Pass criteria:** Dashboard renders without errors.

---

### T2: Local inference (low urgency)

```bash
# In Raycast → Invoke Model
1. Prompt: "What is the Ollama launch command?"
2. Task kind: "research"
3. Urgency: "low"
4. Click "Invoke"
```

**Expected output:**
- Model: `mistral-7b`
- Runner: `ollama`
- Latency: 200–500ms
- Response includes information about ollama launch

**Pass criteria:** Uses local model, response is relevant.

---

### T3: Remote inference (high urgency)

```bash
# In Raycast → Invoke Model
1. Prompt: "Design a scalable multi-tenant SaaS architecture"
2. Task kind: "plan"
3. Urgency: "high"
4. Click "Invoke"
```

**Expected output:**
- Model: `claude-opus`
- Runner: `remote`
- Latency: 400–800ms
- Response is detailed architectural guidance

**Pass criteria:** Uses remote model, response quality is high.

---

### T4: Web-aware inference

```bash
# In Raycast → Invoke Model
1. Prompt: "Latest Raycast updates in 2026"
2. Task kind: "research"
3. Urgency: "medium"
4. Click "Invoke"
```

**Expected output:**
- Model: `perplexity-sonar-mini` (if OrbStack bridge available)
- Runner: `pplx` or `remote`
- Latency: 400–1000ms
- Response includes current information

**Pass criteria:** Returns web-aware response.

---

### T5: Model choice routing

```typescript
// Direct API test
curl -X POST http://localhost:8787/agents/chat-tree/main \
  -H "Content-Type: application/json" \
  -d '{
    "method": "chooseModel",
    "params": {
      "kind": "code",
      "urgency": "low"
    }
  }'

// Expected: { model: "codex-js", runner: "codex", context: 2000 }
```

**Pass criteria:** Returns correct model choice.

---

### T6: Batch inference

```typescript
curl -X POST http://localhost:8787/agents/chat-tree/main \
  -H "Content-Type: application/json" \
  -d '{
    "method": "batchInvoke",
    "params": {
      "requests": [
        { "id": "req1", "kind": "plan", "prompt": "Plan for branch 10", "urgency": "low" },
        { "id": "req2", "kind": "research", "prompt": "Git worktree gotchas", "urgency": "low" },
        { "id": "req3", "kind": "code", "prompt": "Generate TypeScript routing", "urgency": "medium" }
      ]
    }
  }'

// Expected: Array of 3 results with matching IDs, all ok: true
```

**Pass criteria:** All 3 complete within 10 seconds, all have results.

---

### T7: Tree sync

```bash
# Export current tree state
curl -X POST http://localhost:8787/agents/chat-tree/main \
  -H "Content-Type: application/json" \
  -d '{ "method": "exportState", "params": {} }' > /tmp/agent-tree.json

# Compare with local manifest
diff /tmp/agent-tree.json tree.json
# Should have no drift (or only updatedAt difference)

# Detect drift explicitly
curl -X POST http://localhost:8787/agents/chat-tree/main \
  -H "Content-Type: application/json" \
  -d '{
    "method": "detectDrift",
    "params": { "externalManifest": <contents of tree.json> }
  }'

// Expected: { ok: true, hasDrift: false, drift: [] }
```

**Pass criteria:** No drift detected, or drift is explained.

---

### T8: Manifest export

```bash
# From repo root
npm run export-manifest

# Verify files
ls -la tree.json tree.md
stat tree.json | grep Modify  # Should be recent
```

**Pass criteria:** Both files exist, recent timestamps.

---

## Results template

| Test | Status | Notes |
|---|---|---|
| T1 | ☐ | — |
| T2 | ☐ | — |
| T3 | ☐ | — |
| T4 | ☐ | — |
| T5 | ☐ | — |
| T6 | ☐ | — |
| T7 | ☐ | — |
| T8 | ☐ | — |

**Overall:** ☐ PASS ☐ FAIL

---

## Failure modes

| Failure | Likely cause | Fix |
|---|---|---|
| T1: Dashboard won't load | Agent URL wrong | Check env: `echo $AGENT_URL` |
| T2: Timeout | OrbStack unreachable | Verify Tailscale: `tailscale status` |
| T2: Model not found | Ollama missing model | Pull: `ollama pull mistral` |
| T3: Auth error | API key missing | Set `ANTHROPIC_API_KEY` |
| T6: Only 1 result | Batch not parallel | Check agent logs |
| T7: Drift detected | Manifest stale | Run: `npm run export-manifest` |

---

**Next:** Execute tests and document results.
