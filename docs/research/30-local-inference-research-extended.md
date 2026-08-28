# Research Report: Local Inference Providers

**Branch:** `30-local-inference`  
**Date:** 2026-08-27  
**Researcher:** Researcher Agent  
**Status:** complete

---

## Executive Summary

Multi-provider inference strategy balances **cost, latency, quality, and availability**. Recommended approach: local-first (Ollama, MLX, HF Transformers) for routine tasks; subscription tier (Claude, Perplexity, Codex) for reasoning/complex queries; fallback chain ensures graceful degradation. Implement unified provider registry with per-task routing rules.

---

## Provider Taxonomy

### Tier 1: Local (No Cost, High Control)

| Provider | Type | Models | Latency | Notes |
|----------|------|--------|---------|-------|
| **Ollama** | Local server | Llama 2, Mistral, Neural Chat, etc. | 100-500ms | Best for MacOS/Linux; easy setup |
| **MLX** | Apple Silicon optimized | MLX-Community models, Llama, Mistral | 50-200ms | Best latency on Apple Silicon; no quantization loss |
| **HF Transformers** | Python library | Any HF model | 100-1000ms | Most flexible; requires GPU/CPU |

### Tier 2: Local-Capable (Hybrid)

| Provider | Type | Models | Latency | Notes |
|----------|------|--------|---------|-------|
| **Perplexity** | API + local fallback | Web search + LLM | 500ms-2s | Subscription; web search capabilities |
| **LM Studio** | Desktop GUI + API | Quantized models | 100-500ms | User-friendly; Windows/Mac/Linux |

### Tier 3: Subscription (High Quality, Managed)

| Provider | Type | Models | Latency | Notes |
|----------|------|--------|---------|-------|
| **Claude (Anthropic)** | API only | Claude 3 (Opus, Sonnet, Haiku) | 500ms-3s | Best reasoning; no local option |
| **Codex (OpenAI)** | API only | GPT-4, GPT-3.5 | 300ms-2s | Best code understanding; subscription |
| **Hugging Face Inference** | API + free tier | Any HF model | 500ms-5s | Free tier available; rate-limited |

---

## Recommended Routing Matrix

### Task: Tree Normalization (2s budget)
```
local-primary (Ollama, MLX)
  ↓ on timeout/error
local-secondary (HF Transformers)
  ↓ on timeout/error
remote-fast (Haiku, GPT-3.5)
  ↓ on timeout/error
manual fallback
```

### Task: Complex Reasoning (10s budget)
```
local-capable (Perplexity web search)
  ↓ on timeout/error
subscription-primary (Claude Opus, GPT-4)
  ↓ on rate limit
subscription-secondary (Claude Sonnet)
  ↓ on rate limit
manual fallback
```

### Task: Code Generation (5s budget)
```
local-primary (Ollama Code Llama)
  ↓ on timeout/error
subscription-primary (Codex, GPT-4)
  ↓ on rate limit
subscription-secondary (Claude Sonnet)
  ↓ on rate limit
manual fallback
```

---

## Provider Configuration

### Ollama
```bash
# Start server
ollama serve

# Available models
ollama pull llama2
ollama pull mistral
ollama pull neural-chat
ollama pull codellama

# API endpoint
http://localhost:11434/api/generate
```

### MLX
```bash
# Install
pip install mlx mlx-lm

# Run server
mlx_lm.server --model mlx-community/Llama-2-7b-chat-hf

# API endpoint
http://localhost:8000/v1/chat/completions
```

### Hugging Face Transformers
```bash
# Install
pip install transformers torch

# Python API
from transformers import pipeline
pipe = pipeline("text-generation", model="mistralai/Mistral-7B-Instruct-v0.1")
```

### Claude (Anthropic)
```bash
# Environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Python SDK
from anthropic import Anthropic
client = Anthropic()
```

### Codex (OpenAI)
```bash
# Environment variable
export OPENAI_API_KEY=sk-...

# Python SDK
import openai
openai.api_key = os.getenv("OPENAI_API_KEY")
```

### Perplexity
```bash
# Environment variable
export PPLX_API_KEY=pplx-...

# HTTP API
curl -X POST https://api.perplexity.ai/chat/completions \
  -H "Authorization: Bearer $PPLX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Unified Provider Registry

```typescript
type ProviderConfig = {
  id: string
  name: string
  tier: "local" | "hybrid" | "subscription"
  models: string[]
  baseUrl?: string
  apiKey?: string
  latencyBudget: number // ms
  maxTokens: number
  supportsFunctions?: boolean
  supportsStreaming?: boolean
  costPer1kTokens?: number
  fallbackTo?: string
}

const providers: Record<string, ProviderConfig> = {
  "ollama-local": {
    id: "ollama-local",
    name: "Ollama (Local)",
    tier: "local",
    models: ["llama2", "mistral", "neural-chat", "codellama"],
    baseUrl: "http://localhost:11434/api",
    latencyBudget: 2000,
    maxTokens: 4096,
    supportsFunctions: false,
    supportsStreaming: true,
    costPer1kTokens: 0,
    fallbackTo: "mlx-local"
  },
  "mlx-local": {
    id: "mlx-local",
    name: "MLX (Apple Silicon)",
    tier: "local",
    models: ["Llama-2-7b", "Mistral-7B", "neural-chat"],
    baseUrl: "http://localhost:8000/v1",
    latencyBudget: 1500,
    maxTokens: 4096,
    supportsFunctions: false,
    supportsStreaming: true,
    costPer1kTokens: 0,
    fallbackTo: "hf-transformers"
  },
  "hf-transformers": {
    id: "hf-transformers",
    name: "Hugging Face Transformers",
    tier: "local",
    models: ["any-hf-model"],
    latencyBudget: 5000,
    maxTokens: 2048,
    supportsFunctions: false,
    supportsStreaming: false,
    costPer1kTokens: 0,
    fallbackTo: "claude-haiku"
  },
  "claude-opus": {
    id: "claude-opus",
    name: "Claude 3 Opus",
    tier: "subscription",
    models: ["claude-3-opus-20240229"],
    baseUrl: "https://api.anthropic.com",
    latencyBudget: 3000,
    maxTokens: 4096,
    supportsFunctions: true,
    supportsStreaming: true,
    costPer1kTokens: 0.015,
    fallbackTo: "claude-sonnet"
  },
  "claude-sonnet": {
    id: "claude-sonnet",
    name: "Claude 3 Sonnet",
    tier: "subscription",
    models: ["claude-3-sonnet-20240229"],
    baseUrl: "https://api.anthropic.com",
    latencyBudget: 2000,
    maxTokens: 4096,
    supportsFunctions: true,
    supportsStreaming: true,
    costPer1kTokens: 0.003,
    fallbackTo: "claude-haiku"
  },
  "claude-haiku": {
    id: "claude-haiku",
    name: "Claude 3 Haiku",
    tier: "subscription",
    models: ["claude-3-haiku-20240307"],
    baseUrl: "https://api.anthropic.com",
    latencyBudget: 1000,
    maxTokens: 4096,
    supportsFunctions: true,
    supportsStreaming: true,
    costPer1kTokens: 0.00025,
    fallbackTo: "gpt-4"
  },
  "gpt-4": {
    id: "gpt-4",
    name: "GPT-4",
    tier: "subscription",
    models: ["gpt-4-turbo"],
    baseUrl: "https://api.openai.com/v1",
    latencyBudget: 3000,
    maxTokens: 8192,
    supportsFunctions: true,
    supportsStreaming: true,
    costPer1kTokens: 0.03,
    fallbackTo: "gpt-3.5-turbo"
  },
  "gpt-3.5-turbo": {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    tier: "subscription",
    models: ["gpt-3.5-turbo"],
    baseUrl: "https://api.openai.com/v1",
    latencyBudget: 1500,
    maxTokens: 4096,
    supportsFunctions: true,
    supportsStreaming: true,
    costPer1kTokens: 0.0005,
    fallbackTo: "perplexity-online"
  },
  "perplexity-online": {
    id: "perplexity-online",
    name: "Perplexity (Web Search)",
    tier: "hybrid",
    models: ["perplexity-online", "perplexity-sonar-pro"],
    baseUrl: "https://api.perplexity.ai/chat/completions",
    latencyBudget: 5000,
    maxTokens: 4096,
    supportsFunctions: false,
    supportsStreaming: true,
    costPer1kTokens: 0.005,
    fallbackTo: "codex"
  },
  "codex": {
    id: "codex",
    name: "OpenAI Codex",
    tier: "subscription",
    models: ["code-davinci-002", "text-davinci-003"],
    baseUrl: "https://api.openai.com/v1",
    latencyBudget: 2000,
    maxTokens: 4096,
    supportsFunctions: false,
    supportsStreaming: true,
    costPer1kTokens: 0.01,
    fallbackTo: "claude-opus"
  },
  "hf-inference-api": {
    id: "hf-inference-api",
    name: "Hugging Face Inference API",
    tier: "subscription",
    models: ["meta-llama/Llama-2-7b", "mistralai/Mistral-7B"],
    baseUrl: "https://api-inference.huggingface.co",
    latencyBudget: 5000,
    maxTokens: 2048,
    supportsFunctions: false,
    supportsStreaming: false,
    costPer1kTokens: 0,
    fallbackTo: "claude-haiku"
  }
}
```

---

## Per-Task Routing Profiles

### Profile: Tree Normalization (Fast, Accurate)
```json
{
  "name": "tree-normalization",
  "budget": 2000,
  "quality": "high",
  "routing": [
    "ollama-local",
    "mlx-local",
    "claude-haiku",
    "gpt-3.5-turbo"
  ]
}
```

### Profile: Research & Analysis (Best Quality)
```json
{
  "name": "research-analysis",
  "budget": 10000,
  "quality": "highest",
  "routing": [
    "perplexity-online",
    "claude-opus",
    "gpt-4",
    "claude-sonnet"
  ]
}
```

### Profile: Code Generation (Balanced)
```json
{
  "name": "code-generation",
  "budget": 5000,
  "quality": "high",
  "routing": [
    "ollama-local",
    "codex",
    "gpt-4",
    "claude-opus"
  ]
}
```

### Profile: Fallback (Always Responds)
```json
{
  "name": "fallback",
  "budget": 30000,
  "quality": "acceptable",
  "routing": [
    "ollama-local",
    "mlx-local",
    "hf-transformers",
    "claude-haiku",
    "gpt-3.5-turbo",
    "hf-inference-api"
  ]
}
```

---

## Environment Setup

```bash
# Local inference
export OLLAMA_HOST=http://localhost:11434
export MLX_SERVER_HOST=http://localhost:8000

# Subscriptions
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export PERPLEXITY_API_KEY=pplx-...
export HUGGINGFACE_API_KEY=hf_...
```

---

## Cost Estimation (per 1M tokens)

| Provider | Cost |
|----------|------|
| Ollama | $0 |
| MLX | $0 |
| HF Transformers | $0 |
| Claude Haiku | $0.25 |
| GPT-3.5 Turbo | $0.50 |
| Claude Sonnet | $3 |
| GPT-4 Turbo | $30 |
| Claude Opus | $15 |
| Perplexity | $5 |
| Codex | $10 |

**Recommendation:** Use local for routine tasks; subscription tiers for reasoning/complex work.

---

## Best Practices

1. **Cache provider availability** — don't probe every request
2. **Set per-task budgets** — enforce latency SLAs
3. **Log all routing decisions** — enable optimization
4. **Benchmark regularly** — models improve; costs change
5. **Use streaming** — reduce latency perception
6. **Implement circuit breakers** — fast fail on provider outages

---

## References

* [Ollama Docs](https://ollama.ai)
* [MLX Framework](https://ml-explore.github.io/mlx/build/html/index.html)
* [Claude API](https://docs.anthropic.com)
* [OpenAI API](https://platform.openai.com/docs)
* [Perplexity API](https://docs.perplexity.ai)
* [HF Inference](https://huggingface.co/inference-api)
