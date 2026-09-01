# OrbStack + Tailscale Networking Setup

**Branch:** `60-terminal-automation`  
**Purpose:** Enable macOS → OrbStack Ubuntu low-latency inference over Tailscale mesh

---

## Architecture

```text
macOS Raycast
    ↓
ChatTreeAgent (Cloudflare Workers / local dev)
    ↓ (HTTP)
OrbStack Ubuntu (Tailscale peer)
    ├── Ollama (port 11434)
    ├── MLX service (port 5000)
    └── Perplexity bridge (port 8000)
```

---

## Prerequisites

1. **OrbStack** installed on macOS
2. **Tailscale** installed on both macOS and OrbStack Ubuntu
3. **Ollama** running in OrbStack Ubuntu
4. **Perplexity local bridge** or similar running in OrbStack

---

## Step 1: Enable Tailscale on macOS

```bash
# Install (if needed)
brew install tailscale

# Authenticate and join mesh
tailscale up --accept-routes

# Get your IP
tailscale ip -4
# Example output: 100.64.1.42
```

---

## Step 2: Start OrbStack with Tailscale

```bash
# Start OrbStack
orbctl start

# Inside OrbStack shell
orbctl shell

# Inside the container:
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate
sudo tailscale up --accept-routes

# Get Ubuntu IP
tailscale ip -4
# Example output: 100.64.2.15
```

---

## Step 3: Start Ollama in OrbStack

```bash
# In OrbStack shell
ollama serve &

# Verify it's listening
curl http://localhost:11434/api/tags

# Pull models
ollama pull mistral
ollama pull neural-chat
ollama pull deepseek-coder
```

---

## Step 4: Test connectivity from macOS

```bash
# macOS shell
ORBSTACK_IP=100.64.2.15  # Replace with actual Tailscale IP

# Test Ollama endpoint
curl http://${ORBSTACK_IP}:11434/api/tags

# Test inference
curl -X POST http://${ORBSTACK_IP}:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral",
    "prompt": "Hello",
    "stream": false
  }' | jq '.response'
```

---

## Step 5: Configure InferenceRouter

Update environment variables:

```bash
# .env or wrangler.toml
OLLAMA_ENDPOINT=http://100.64.2.15:11434
PPLX_ENDPOINT=http://100.64.2.15:8000
TAILSCALE_NETWORK=enabled
```

Or in code:

```typescript
const ollamaEndpoint = `http://${process.env.ORBSTACK_IP || "100.64.2.15"}:11434`
const pplxEndpoint = `http://${process.env.ORBSTACK_IP || "100.64.2.15"}:8000`
```

---

## Step 6: Verify from Raycast

In the Raycast extension:

```typescript
const agentUrl = process.env.AGENT_URL || "http://localhost:8787"
const resp = await fetch(`${agentUrl}/agents/chat-tree/main`, {
  method: "POST",
  body: JSON.stringify({
    method: "chooseModel",
    params: {
      kind: "research",
      urgency: "low"  // Prefer local Ollama
    }
  })
})
const choice = await resp.json()
// Should return: { model: "mistral-7b", runner: "ollama", endpoint: "http://100.64.2.15:11434" }
```

---

## Step 7: Optional — Perplexity local bridge

If running Perplexity container:

```bash
# In OrbStack shell
docker run -d \
  --name pplx-bridge \
  -p 8000:8000 \
  your-perplexity-bridge-image

# Verify
curl http://localhost:8000/search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "example", "withWeb": true}'
```

Then update config:

```typescript
const pplxEndpoint = `http://100.64.2.15:8000`
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `Connection refused` | Verify OrbStack is running: `orbctl status` |
| `Host unreachable` | Check Tailscale on both devices: `tailscale status` |
| `Ollama not listening` | SSH into OrbStack, start Ollama: `ollama serve` |
| `High latency` | Check Tailscale ping: `ping 100.64.2.15` |
| `DNS not resolving` | Use direct IP instead of hostname |

---

## Performance expectations

| Model | Runtime | Latency (TTFT) | Notes |
|---|---|---|---|
| mistral-7b | Ollama (CPU) | 300–500ms | OrbStack CPU only |
| neural-chat-7b | Ollama (CPU) | 400–600ms | — |
| deepseek-coder-6.7b | Ollama (CPU) | 350–550ms | — |
| With GPU acceleration | — | 100–200ms | Not yet in OrbStack |

---

## Implementation status

- [x] Tailscale mesh networking spec
- [x] OrbStack Ollama setup
- [x] Connectivity verification
- [ ] Perplexity bridge integration
- [ ] GPU acceleration (future)
- [ ] Latency benchmarking

---

**Next:** Deploy to OrbStack and benchmark end-to-end latency.
