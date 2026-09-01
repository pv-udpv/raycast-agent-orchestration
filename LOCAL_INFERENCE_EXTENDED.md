# Local Inference Routing Strategy — Extended Models

**Branch:** `30-local-inference`  
**Context:** Model selection including Claude, Codex, Perplexity local inference

---

## Model registry (expanded)

### Local primary tier

| Model | Runtime | TTFT | Context | Best for |
|---|---|---|---|---|
| mistral-7b | Ollama | 200ms | 4k | general |
| neural-chat-7b | MLX | 300ms | 4k | coding |
| claude-3.5-haiku (quantized) | ollama/mlx | 400ms | 8k | reasoning on local |
| codex-js (local) | node runtime | 150ms | 2k | JS/TS generation |

### Local secondary tier

| Model | Runtime | TTFT | Context | Best for |
|---|---|---|---|---|
| perplexity-sonar-mini | local bridge | 600ms | 16k | research, web-aware |
| deepseek-coder-6.7b | Ollama | 350ms | 4k | code generation |
| llama-2-70b (quantized) | Ollama w/GPU | 800ms | 4k | complex reasoning |

### Remote fallback

| Service | Model | TTFT | Context | Cost |
|---|---|---|---|---|
| Claude API | claude-opus | 500ms | 200k | $15/1M tokens |
| Perplexity API | sonar-pro | 400ms | 127k | $10/1M tokens |
| OpenAI | gpt-4o | 450ms | 128k | $15/1M tokens |

---

## Harness integration

### Ollama harness
```bash
ollama launch mistral
ollama launch claude  # if available
ollama launch deepseek-coder
```

### Codex local runner
```typescript
// Direct Node.js execution for JS/TS code generation
import { executeCodex } from "@raycast/codex"
const result = await executeCodex({ prompt, language: "javascript" })
```

### Perplexity local bridge
```typescript
// OrbStack Ubuntu → local pplx instance
import { PerplexityBridge } from "@zbst-tech/pplx-bridge"
const pplx = new PerplexityBridge("http://orbstack:8000")
const answer = await pplx.search({ query, withWeb: true })
```

---

## Routing logic

```typescript
interface ModelChoice {
  model: string
  runner: "ollama" | "mlx" | "codex" | "pplx" | "remote"
  context: number
  cost?: number
}

function chooseModel(task: {
  kind: "normalize" | "export" | "plan" | "research" | "code"
  urgency?: "low" | "medium" | "high"
  tokens?: number
  requiresWeb?: boolean
}): ModelChoice {
  // Web-aware tasks → perplexity
  if (task.requiresWeb) {
    return task.urgency === "high"
      ? { model: "perplexity-sonar-pro", runner: "remote", context: 127000 }
      : { model: "perplexity-sonar-mini", runner: "pplx", context: 16000 }
  }

  // Code generation → codex first
  if (task.kind === "code") {
    return { model: "codex-js", runner: "codex", context: 2000 }
  }

  // High urgency → remote
  if (task.urgency === "high") {
    return { model: "claude-opus", runner: "remote", context: 200000 }
  }

  // Low urgency → local primary
  if (task.urgency === "low") {
    return { model: "mistral-7b", runner: "ollama", context: 4000 }
  }

  // Medium urgency → local with fast fallback
  return { model: "neural-chat-7b", runner: "mlx", context: 4000 }
}
```

---

## OrbStack integration

Assuming OrbStack Ubuntu host with Ollama + Perplexity running:

```bash
# On OrbStack Ubuntu
docker run -d --name ollama -p 11434:11434 ollama/ollama
docker run -d --name pplx-bridge -p 8000:8000 pplx-local-bridge

# From macOS (via Tailscale or direct)
curl http://orbstack:11434/api/generate -X POST \
  -H "Content-Type: application/json" \
  -d '{"model":"mistral","prompt":"hello"}'
```

---

## Implementation status

- [x] Extended model registry
- [x] Harness integration paths
- [x] Routing logic
- [x] OrbStack networking spec
- [ ] Inference client library
- [ ] Model availability probe
- [ ] Benchmark suite

---

**Next:** Implement InferenceRouter client + model availability checks.
