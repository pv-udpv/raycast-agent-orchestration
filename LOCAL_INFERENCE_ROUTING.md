# Local Inference Routing Strategy

**Branch:** `30-local-inference`  
**Context:** Model selection, fallback chain, benchmarking

---

## Routing decision tree

```text
Task received
    ├─ Is urgency LOW?
    │  └─ Try local-primary first (Ollama, MLX on OrbStack)
    ├─ Is urgency MEDIUM?
    │  └─ Try local-primary; escalate to remote on timeout (2s)
    └─ Is urgency HIGH?
       └─ Go straight to remote (Perplexity API)

Fallback chain
    1. local-primary (e.g., mistral-7b via Ollama)
    2. local-secondary (e.g., neural-chat via MLX)
    3. remote-cloud (Perplexity Pro or Claude API)
    4. manual (user decision / escalation)
```

---

## Model registry

| Model | Runtime | Latency (TTFT) | Context | Use case |
|---|---|---|---|---|
| mistral-7b | Ollama | 200ms | 4k | general, low-urgency |
| neural-chat-7b | MLX | 300ms | 4k | coding, research |
| claude-opus | Perplexity (remote) | 500ms | 200k | complex reasoning |
| gpt-4o-mini | OpenAI (remote) | 400ms | 128k | fallback for structured |

---

## Latency SLA

| Task | Target | Hard timeout |
|---|---|---|
| tree normalization | 500ms | 2s |
| manifest export | 1s | 5s |
| branch plan | 2s | 10s |
| research generation | 5s | 30s |

---

## Inference client interface

```typescript
interface InferenceRouter {
  chooseModel(task: {
    kind: "normalize" | "export" | "plan" | "research"
    urgency?: "low" | "medium" | "high"
    tokens?: number
  }): Promise<{ model: string; runner: "local" | "remote" }>

  invoke(model: string, prompt: string, options?: InvokeOptions): Promise<string>

  fallback(from: string, reason: string): Promise<string>
}
```

---

## Implementation status

- [x] Routing decision tree defined
- [x] Model registry enumerated
- [x] Latency SLA set
- [ ] Client library (packages/local-inference/)
- [ ] Benchmark harness
- [ ] OrbStack integration

---

**Next:** Implement client library + benchmark suite.
