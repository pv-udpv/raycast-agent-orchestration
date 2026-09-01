# Raycast Agent Orchestration — Deployment Checklist

**Generated:** 2026-09-01 16:55 UTC  
**Status:** Setup phase complete

---

## ✓ Completed

- [x] All 9 branches created and committed to GitHub
- [x] Git worktrees initialized (wt-10 through wt-90)
- [x] Deployment guide created (DEPLOYMENT_GUIDE.md)
- [x] OrbStack + Tailscale networking spec documented
- [x] ChatTreeAgent with inference routing implemented
- [x] Raycast extension commands (tree-manager, invoke-model)
- [x] E2E integration test plan (T1–T8)
- [x] Raycast extension environment configured

---

## ⏳ In Progress

- [ ] Wrangler authentication setup
  - Run: `wrangler login`
  - Get account_id from https://dash.cloudflare.com/
  
- [ ] Worker dependencies
  - Currently installing (agents, typescript, @types/node)
  - May take 2–3 minutes

- [ ] Tailscale on OrbStack
  - Need to fix SSL cert issue in orbctl
  - Alternative: SSH into OrbStack directly
  ```bash
  ssh orbstack
  curl -fsSL https://tailscale.com/install.sh | sh
  sudo tailscale up
  ```

---

## 🚀 Next immediate steps

### 1. Complete worker setup
```bash
cd ~/dev/raycast-agent-orchestration/worktrees/wt-50-worker-agent
npm install
wrangler deploy --temporary  # Or after: wrangler login
```

### 2. Fix OrbStack Tailscale
```bash
ssh orbstack
# Inside OrbStack:
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
tailscale ip -4
```

### 3. Start Ollama on OrbStack
```bash
ssh orbstack
ollama serve &
ollama pull mistral neural-chat deepseek-coder
```

### 4. Test connectivity from macOS
```bash
ORBSTACK_IP=100.64.2.15  # Replace with actual from step 2
curl http://${ORBSTACK_IP}:11434/api/tags
```

### 5. Launch Raycast extension
```bash
# Need to install Raycast CLI or use Raycast.app directly
# Option A: Via app (faster)
open -a Raycast

# Option B: Via CLI (after fixing npm workspace)
cd ~/dev/raycast-agent-orchestration/worktrees/wt-40-raycast-integration
npm install  # Install local dependencies
# Then search for "tree-manager" in Raycast
```

### 6. Run E2E tests
Follow: `worktrees/wt-90-notes-and-findings/E2E_INTEGRATION_TEST.md`

---

## 🔧 Current blockers

1. **npm workspace resolution** — `agents` package not found
   - Fix: Use `"agents": "latest"` or install from GitHub
   
2. **orbctl exec shell piping** — pipe character not working
   - Fix: SSH directly into OrbStack instead
   
3. **Raycast CLI not in npm** — `@raycast/cli` doesn't exist
   - Use Raycast app instead + develop mode

---

## 📊 Progress: 65% complete

- Design: ✓ 100%
- Code scaffolding: ✓ 100%
- Deployment guide: ✓ 100%
- Local setup: ⏳ 65%
  - [x] Prerequisites installed
  - [x] Git/worktrees ready
  - [x] Raycast extension env configured
  - [ ] Worker deployed
  - [ ] OrbStack Tailscale live
  - [ ] Ollama models loaded
  
---

**Last update:** 2026-09-01 16:55  
**Next: Finish worker + OrbStack setup, then E2E tests**
