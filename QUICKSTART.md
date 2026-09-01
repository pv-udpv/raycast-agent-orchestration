# Quick Start — Raycast Agent Orchestration

**Status:** Fully scaffolded, ready to deploy

---

## 1. Prerequisites (5 min)

```bash
# Verify you have these
node --version          # >= 18.0.0
npm --version           # >= 11.0.0
wrangler --version      # should work
git worktree list       # should show 10

# All checked?
echo "✓ Ready to deploy"
```

---

## 2. Deploy Worker (10 min)

### Option A: Temporary (no login)

```bash
cd ~/dev/raycast-agent-orchestration/worktrees/wt-50-worker-agent
npx wrangler deploy --temporary
# Output: https://[random].workers.dev
# Note the URL, use it below
```

### Option B: Production (requires login)

```bash
wrangler login
# Opens browser, authenticate with Cloudflare
cd worktrees/wt-50-worker-agent
wrangler deploy
# URL: https://raycast-agent-orchestrator.pv-udpv.workers.dev
```

---

## 3. Configure API Keys (optional but recommended)

```bash
# For remote inference fallback
export ANTHROPIC_API_KEY="sk-ant-YOUR_KEY"
export OPENAI_API_KEY="sk-YOUR_KEY"

# Or add to Cloudflare Workers secrets:
wrangler secret put ANTHROPIC_API_KEY
# Paste your key, press Ctrl+D
```

---

## 4. Setup Local Inference (optional)

### With Docker (easiest)

```bash
docker run -d -p 11434:11434 ollama/ollama
docker exec ollama ollama pull mistral
curl http://localhost:11434/api/tags
```

### Or macOS native

```bash
brew install ollama
ollama serve &
ollama pull mistral neural-chat deepseek-coder
```

---

## 5. Launch Raycast Extension

```bash
# Option A: Via Raycast app
open -a Raycast
# Search: "tree-manager" or "invoke-model"

# Option B: Via CLI (if you have ray CLI)
cd ~/dev/raycast-agent-orchestration/worktrees/wt-40-raycast-integration
ray develop
```

---

## 6. Run E2E Tests

```bash
cd ~/dev/raycast-agent-orchestration

# With deployed worker
export AGENT_URL="https://your-worker.workers.dev"
./run-e2e-tests.sh

# Or point to local mock
export AGENT_URL="http://localhost:8787"
./run-e2e-tests.sh
```

---

## 7. Try Commands in Raycast

In Raycast:

1. **Tree Manager** → shows tree state (10 nodes)
2. **Invoke Model** → send prompt, get response
   - Low urgency → uses local Ollama (if running)
   - High urgency → uses Claude Opus (if key set)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `curl: command not found` | Use `brew install curl` |
| Worker 404 | Check URL in `.env.local` |
| Ollama timeout | Ensure `ollama serve` is running |
| API key errors | Set `ANTHROPIC_API_KEY` env var |
| Raycast not loading | Try `ray develop` in extension dir |

---

## What works right now

✓ Tree state management (SQLite-backed)  
✓ Model routing logic  
✓ Remote inference (Claude, GPT, Perplexity)  
✓ Raycast UI commands  
✓ Git worktrees + branch isolation  

⏳ Local Ollama (needs binary)  
⏳ OrbStack Tailscale (network blocked)  
⏳ Full E2E tests (need local models)  

---

## Next steps

1. Run Step 2 (deploy worker)
2. Run Step 5 (launch Raycast)
3. Run Step 6 (tests)
4. Optionally: Step 4 (local models)

---

**Deployment time: ~20 minutes**

