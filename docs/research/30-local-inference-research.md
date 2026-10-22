# Research Report: Local Inference

**Branch:** `30-local-inference`  
**Date:** 2026-08-27  
**Researcher:** Researcher Agent  
**Status:** in-progress
**Evidence status:** incomplete
**Compatibility claim:** Responses text streaming was reported as smoke-tested in a prior run; this report does not establish full Responses/Codex compatibility.

---

## Evidence Record

- **Sources:** [OpenAI Responses streaming guide](https://developers.openai.com/api/docs/guides/streaming-responses?api-mode=responses); `~/mlx-serve/anthropic_adapter.py`; `~/mlx-serve/README.md`
- **Orchestration repository baseline inspected:** `6315bac254bc2fb423ace11ef2f84658ebb3e12d` (working tree was dirty; this is not a commit for all inspected files)
- **Adapter artifact SHA-256:** `f750fe2d3a8b1808c5c62551d9013d903f4ec8e75f9b8acab2c13c7031f09167`
- **Adapter README SHA-256:** `6d46a58e0a39dcab216f2d48df3438b79d83f2f94fba2005c5dde1abbb8859ac`
- **Runtime/model:** listener `127.0.0.1:8788` responded HTTP 200 to a root probe; previous recorded test used `mlx-community/Qwen3-30B-A3B-Instruct-2507-4bit`.
- **Exact historical test command:** unavailable in retained run record; do not infer or reconstruct it as an executed command.
- **Expected protocol events:** `response.created`, text delta event(s), `response.completed`, expected text and usage.
- **Observed in the retained run summary:** those event classes and expected text/usage were reported after correcting SSE line framing. Raw event transcript/log artifact and exact command were not retained here.
- **Evidence status:** `incomplete` for an auditable report; prior run supports only `streaming-smoke-tested`.
- **Compatibility status:** not tested with a real Responses or Codex client; function-call streaming remains unverified. Anthropic Messages SSE is separate and unresolved.

## Reproduction (proposed, not executed for this report)

Run sequentially against the intended local runtime; capture stdout, stderr, exit status, and adapter/model versions. Do not run concurrent inference requests.

```sh
python3 - <<'PY'
import json, urllib.request
url = "http://127.0.0.1:8788/v1/responses"
payload = {"model": "mlx-community/Qwen3-30B-A3B-Instruct-2507-4bit", "input": "Reply with exactly: RESPONSES_STREAM_SMOKE_OK", "stream": True}
request = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(request, timeout=180) as response:
    print("HTTP", response.status)
    for line in response:
        print(line.decode("utf-8", errors="replace"), end="")
PY
```

Expected: HTTP 200; `response.created`; one or more text deltas whose concatenated text is exactly `RESPONSES_STREAM_SMOKE_OK`; `response.completed` with usage. This script is a proposed reproduction, not a claim of a newly executed test.

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
