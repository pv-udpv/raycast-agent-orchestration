# Research Report: Local Inference

**Branch:** `30-local-inference`  
**Date:** 2026-08-27  
**Researcher:** Researcher Agent  
**Status:** complete

---

## Executive Summary

Local inference minimizes latency and cost for routine tasks. For our workload, prefer local models (Ollama, MLX, etc.) for tree normalization, manifest export, and simple routing. Fallback to remote (Perplexity, Claude) for complex reasoning. Primary recommendation: implement a routing policy with 4-tier fallback chain: local-primary → local-secondary → remote-cloud → manual.

---

## Best Practices

### 1. Tier-Based Routing Policy
- **Description:** Define explicit model order: local-primary, local-secondary, remote, manual.
- **Why it matters:** Predictable behavior; enables graceful degradation; easy to benchmark.
- **How we apply it:** Each task specifies `tier` requirement; router picks best available model.

### 2. Latency Budget Per Task
- **Description:** Set a max latency per task type (e.g., tree-normalization: 2s, reasoning: 10s).
- **Why it matters:** Prevents slow local models blocking everything.
- **How we apply it:** Router enforces timeout; escalates to remote if exceeded.

### 3. Model Availability Registry
- **Description:** Keep a runtime registry of available models with health status.
- **Why it matters:** Don't route to unavailable models; detect health degradation.
- **How we apply it:** Periodically probe local/remote endpoints; update registry.

### 4. Benchmark Before Deployment
- **Description:** Measure TTFT, latency, quality for each model on real tasks.
- **Why it matters:** Avoid deploying slow models; enables data-driven routing decisions.
- **How we apply it:** Use `pplx-harness` or similar to evaluate model performance.

### 5. Fallback Logging
- **Description:** Log every fallback decision (why, from which tier, to which tier).
- **Why it matters:** Detect patterns; identify underperforming local models; optimize policy.
- **How we apply it:** Write fallback events to manifest; include in drift report.

---

## Anti-Patterns

### 1. Hard-Coded Local-Only (No Fallback)
- **Description:** Try local; if it fails, error out instead of falling back.
- **Why to avoid:** Single point of failure; no graceful degradation.
- **Impact if ignored:** Service outage if local inference goes down.

### 2. Prefer Remote Without Trying Local
- **Description:** Default to remote; use local only if remote is slow.
- **Why to avoid:** Wastes local capacity; increases cost and latency.
- **Impact if ignored:** Higher latency, higher cost, worse UX.

### 3. No Latency Budget
- **Description:** Send request to local model without timeout.
- **Why to avoid:** Slow model blocks entire orchestration.
- **Impact if ignored:** Cascading timeouts; orchestration hangs.

---

## Gotchas & Edge Cases

| Gotcha | Trigger | Mitigation |
|--------|---------|-----------|
| Model quantization → different outputs | Comparing local vs remote results | Document expected diff; allow tolerance |
| Context window mismatch | Local model has smaller context | Split input or escalate to remote |
| Batch inference latency | Local model slower in batch | Queue requests; stagger |
| VRAM OOM | Local model runs out of memory | Queue requests; use swap fallback |
| Network blip during remote fallback | Remote unreachable temporarily | Retry with exponential backoff |

---

## Recommendations

**Implement 4-tier fallback: local-primary → local-secondary → remote-cloud → manual. Set latency budgets per task. Monitor model health. Log all fallbacks.**

---

## References

* [Ollama Model Library](https://ollama.com)
* [MLX Framework](https://ml-explore.github.io/mlx/build/html/index.html)
* [Perplexity API Docs](https://docs.perplexity.ai)
* [TTFT Benchmarking](https://www.anyscale.com/blog/ttft-benchmarking)
