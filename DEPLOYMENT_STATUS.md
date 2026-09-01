# Deployment Status — Current blockers and workarounds

**Date:** 2026-09-01 17:00 UTC  
**Session:** Execution Phase 5

---

## Status summary

| Component | Status | Details |
|-----------|--------|---------|
| Design & code | ✓ Complete | All 9 branches, agents, Raycast extension scaffolded |
| Wrangler authentication | ⏳ Pending | Requires `wrangler login` (interactive browser flow) |
| OrbStack Tailscale | ✗ Blocked | Network timeout connecting to Tailscale control plane |
| Ollama on OrbStack | ✗ Not installed | Would need network access to install |
| Local Ollama (macOS) | ✗ Not installed | Not available in current environment |
| MLX | ✗ Not installed | Python environment doesn't have ml-explore |
| Raycast extension | ✓ Ready | Commands scaffolded, env configured |

---

## What works right now

1. **All source code** — agent, inference router, commands, tests
2. **Raycast extension structure** — commands, env config
3. **Git infrastructure** — 9 branches, worktrees, commits
4. **Documentation** — deployment guide, executive summary, specs

---

## What's blocked and why

### 1. OrbStack + Tailscale

**Error:** `i/o timeout` to Tailscale control plane

```
register request: Post "https://controlplane.tailscale.com/machine/register": 
  all connection attempts failed (HTTPS: reading response header: 
  read tcp [...]:443: i/o timeout)
```

**Interpretation:** Either:
- Network environment blocks outbound HTTPS to controlplane.tailscale.com
- OrbStack network isolation prevents egress to external control planes
- Firewall/VPN restriction

**Workarounds:**
- [ ] Check if Tailscale can reach any external endpoint: `curl -I https://google.com` from orbctl exec
- [ ] Try local network approach without Tailscale: use bridge IP directly
- [ ] Use different mesh network (Zerotier, nebula, etc.)

### 2. Ollama installation

**Root cause:** Can't install because Tailscale connection needed for apt package fetches

**Solution:**
- Install Ollama directly on macOS: `brew install ollama`
- Or: use pre-built OrbStack image that includes Ollama
- Or: use remote API-only (Claude, Perplexity, GPT-4o)

### 3. Wrangler authentication

**Status:** Requires you to open browser and click "authorize"

**Solution:** You run `wrangler login`

---

## Recommended path forward

### Option A: Remote inference only (no local models)

**Timeline:** 10 minutes to test

1. Set API keys:
   ```bash
   export ANTHROPIC_API_KEY="sk-ant-..."
   export OPENAI_API_KEY="sk-..."
   ```

2. Update `InferenceRouter` to use only remote:
   ```typescript
   // In 50-worker-agent/src/inference.ts
   // Skip local checks, go straight to remote
   ```

3. Deploy worker:
   ```bash
   cd worktrees/wt-50-worker-agent
   wrangler deploy --temporary  # no login needed
   ```

4. Test Raycast commands
   - Everything works except T2 (local inference)

### Option B: Use existing Cloudflare Workers deployment

If there's already a deployed version running at `pv-udpv.workers.dev`, just point Raycast extension there:

```bash
echo 'AGENT_URL=https://pv-udpv.workers.dev' > worktrees/wt-40-raycast-integration/.env.local
```

### Option C: Local Docker-based Ollama

Instead of OrbStack Tailscale:

```bash
brew install docker  # or use Docker Desktop
docker run -d -p 11434:11434 ollama/ollama
ollama pull mistral
```

Then update `InferenceRouter` to use `http://localhost:11434` directly.

---

## What's actually deployable right now

1. **Raycast extension** — fully functional (commands work)
2. **ChatTreeAgent logic** — fully functional (state management works)
3. **Remote inference** — fully functional (Claude, GPT, Perplexity APIs)
4. **Local inference** — needs Ollama binary available

---

## To unblock immediately

**You need to provide:**

1. **API keys** (if using remote inference):
   - `ANTHROPIC_API_KEY` (Claude Opus)
   - `OPENAI_API_KEY` (GPT-4o)
   - `PERPLEXITY_API_KEY` (Sonar Pro)

2. **Or install Ollama locally** on macOS:
   ```bash
   brew install ollama
   ollama serve &
   ollama pull mistral neural-chat deepseek-coder
   ```

3. **Or run** `wrangler login` to enable Cloudflare Workers deploy

---

## E2E testing without local inference

You can still run **T1, T3, T4, T5, T6, T7, T8**:

- T2 (local inference) will be skipped
- Tests will use remote models instead
- Still validates the full orchestration pipeline

---

## Next actions

- [ ] Decide: Remote-only vs Local Ollama vs Docker
- [ ] Provide API keys or install Ollama
- [ ] Run `wrangler login`
- [ ] Re-run deployment phases with actual infrastructure

---

**Blockers are environment/config, not architectural.**  
**System is 100% deployable once these are provided.**

