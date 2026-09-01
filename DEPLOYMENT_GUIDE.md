# Raycast Agent Orchestration — Deployment Guide

**Document:** Deployment & launch checklist  
**Date:** 2026-08-27  
**Status:** Ready for execution

---

## Overview

This guide walks through deploying the complete Raycast agent orchestration system:

1. **Local development** (macOS + OrbStack)
2. **Cloudflare Workers** (production agent backend)
3. **Raycast extension** (client UI)
4. **End-to-end testing**

---

## Phase 1: Local development setup

### 1.1 Prerequisites

```bash
# Verify installations
which node npm git tailscale orbctl ray
# All should return paths

# Node version
node -v  # Should be >= 18.0.0

# Tailscale status
tailscale ip -4  # Should return 100.x.x.x IP
```

### 1.2 Clone and setup

```bash
cd ~/dev/raycast-agent-orchestration
git fetch origin
git checkout main
git pull origin main

# Ensure all branches are available
git fetch origin 'refs/heads/*:refs/heads/*'

# Verify worktrees
git worktree list | wc -l  # Should show 10 (main + 9 branches)
```

### 1.3 Install dependencies

```bash
# Root workspace
npm install

# Raycast extension dev dependencies
cd worktrees/wt-40-raycast-integration
npm install

# Worker agent dependencies
cd ../wt-50-worker-agent
npm install

# Back to root
cd ../..
```

---

## Phase 2: OrbStack + Tailscale networking

### 2.1 Start OrbStack

```bash
orbctl start
orbctl status  # Verify running
```

### 2.2 Setup Tailscale on OrbStack

```bash
orbctl shell

# Inside OrbStack:
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --accept-routes
tailscale ip -4  # Note this IP (e.g., 100.64.2.15)
exit
```

### 2.3 Verify Tailscale mesh

```bash
# macOS shell
tailscale status

# Should show OrbStack as a peer
# Test connectivity
ORBSTACK_IP=$(tailscale ip -4 -n orbstack 2>/dev/null || echo "100.64.2.15")
ping -c 1 $ORBSTACK_IP
```

### 2.4 Start Ollama on OrbStack

```bash
orbctl shell

# Inside OrbStack:
ollama serve &

# Pull models (takes ~5-10 min)
ollama pull mistral
ollama pull neural-chat
ollama pull deepseek-coder

# Verify
curl http://localhost:11434/api/tags | jq .

exit
```

### 2.5 Test Ollama from macOS

```bash
ORBSTACK_IP=100.64.2.15  # Replace with your actual IP

curl -X POST http://${ORBSTACK_IP}:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "Hello, world!",
    "stream": false
  }' | jq '.response'

# Should return: "Hello, world! How can I help you today?"
```

---

## Phase 3: Deploy ChatTreeAgent to Cloudflare Workers

### 3.1 Setup Wrangler authentication

```bash
cd worktrees/wt-50-worker-agent

# Authenticate with Cloudflare
wrangler login

# Verify
wrangler whoami
```

### 3.2 Configure wrangler.toml

Edit `wrangler.jsonc` (note: Wrangler uses this filename):

```jsonc
{
  "name": "raycast-agent-orchestrator",
  "account_id": "YOUR_ACCOUNT_ID",  // Get from Cloudflare dashboard
  "env": "production"
}
```

### 3.3 Deploy

```bash
# From worktrees/wt-50-worker-agent
wrangler deploy

# Output will show:
# ✓ Uploaded your worker to https://raycast-agent-orchestrator.YOUR_ACCOUNT.workers.dev/
```

### 3.4 Verify deployment

```bash
WORKER_URL="https://raycast-agent-orchestrator.YOUR_ACCOUNT.workers.dev"

curl -X POST ${WORKER_URL}/agents/chat-tree/main \
  -H "Content-Type: application/json" \
  -d '{
    "method": "exportState",
    "params": {}
  }' | jq '.treeId'

# Should return a UUID
```

---

## Phase 4: Configure Raycast extension

### 4.1 Setup extension environment

```bash
cd worktrees/wt-40-raycast-integration

# Create .env.local
cat > .env.local << 'EOF'
AGENT_URL=https://raycast-agent-orchestrator.YOUR_ACCOUNT.workers.dev
ORBSTACK_IP=100.64.2.15
EOF

# Or set in raycast.json preferences after launching
```

### 4.2 Start dev server

```bash
ray develop

# Opens Raycast with the extension in dev mode
# You'll see console logs in terminal
```

### 4.3 Test in Raycast

In Raycast, search for:
- `tree-manager` — should open dashboard
- `invoke-model` — should open form

---

## Phase 5: End-to-end testing

### 5.1 Run T1–T8 tests

Follow the test plan in `worktrees/wt-90-notes-and-findings/E2E_INTEGRATION_TEST.md`:

```bash
# T1: Tree Manager Dashboard
# → Open "Tree Manager" command in Raycast
# → Verify dashboard loads with 10 nodes

# T2: Local inference
# → Open "Invoke Model" command
# → Prompt: "What is the Ollama launch command?"
# → Task: "research", Urgency: "low"
# → Verify response uses mistral-7b, latency ~200–500ms

# T3–T8: Follow test plan
```

### 5.2 Capture results

```bash
# Document results in:
worktrees/wt-90-notes-and-findings/E2E_INTEGRATION_TEST_RESULTS.md
```

---

## Phase 6: Production deployment checklist

- [ ] All branches pushed to GitHub
- [ ] ChatTreeAgent deployed to Cloudflare Workers
- [ ] Raycast extension environment configured
- [ ] OrbStack + Tailscale networking verified
- [ ] Ollama models pulled and accessible
- [ ] E2E tests T1–T8 passing
- [ ] API keys set:
  - [ ] `ANTHROPIC_API_KEY` (for Claude fallback)
  - [ ] `OPENAI_API_KEY` (for GPT fallback)
- [ ] Raycast extension submitted to marketplace (optional)

---

## Troubleshooting

### Agent won't deploy

```bash
# Check Cloudflare auth
wrangler whoami

# Check account_id in wrangler.jsonc
# Get from: https://dash.cloudflare.com/
```

### Raycast extension won't load

```bash
# Check dev server is running
ray develop

# Check environment variables
env | grep AGENT_URL

# Look for red errors in Raycast
# Command Palette → "Show Console"
```

### OrbStack models timeout

```bash
# Verify Ollama is running
orbctl shell
ps aux | grep ollama

# Restart if needed
pkill ollama
ollama serve &
```

### Tailscale connectivity issues

```bash
# Restart Tailscale on both
tailscale down
tailscale up

# Check network
ping 100.64.2.15
```

---

## Quick reference

| Component | Port | Command |
|---|---|---|
| Ollama | 11434 | `ollama serve` |
| Raycast extension | — | `ray develop` |
| Cloudflare Worker | — | `wrangler deploy` |
| OrbStack shell | — | `orbctl shell` |

---

## Next steps

1. **Monitor:** Watch for errors in Raycast console and worker logs
2. **Iterate:** Update specs in branch worktrees
3. **Scale:** Deploy additional subagents as needed
4. **Benchmark:** Run latency tests across model options

---

## Support

For issues:
1. Check troubleshooting section above
2. Review branch specs in corresponding worktree
3. Check GitHub issues: https://github.com/pv-udpv/raycast-agent-orchestration/issues
4. Inspect logs:
   - Raycast: `Command Palette → Show Console`
   - Worker: `wrangler tail`
   - OrbStack: `orbctl shell → journalctl -xe`

---

**Ready to deploy? Start with Phase 1.1.**
