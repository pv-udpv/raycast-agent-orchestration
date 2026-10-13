# Local Responses API / Codex smoke evidence

**Status: streaming smoke-tested only; not fully compatible.** This is separate from Anthropic Messages SSE and does not establish its status.

## Recorded test

- Client: Codex CLI `0.154.0`
- Local endpoint: `http://127.0.0.1:8788/v1`
- Wire API: `responses`; reasoning effort: `none`
- Adapter source SHA-256: `f750fe2d3a8b1808c5c62551d9013d903f4ec8e75f9b8acab2c13c7031f09167` (`/Users/pv/mlx-serve/anthropic_adapter.py` at test time)
- Expected: a text answer and a terminal Responses event
- Observed: requested text was returned and `turn.completed` was emitted
- Exact command/transcript: not retained in the available handoff; this record is not a reproducible test artifact

## Limits

This evidence covers a text-only client turn. It does not establish function-call streaming, `previous_response_id`, multimodal inputs, complete protocol conformance, or compatibility across Codex workflows. The adapter and test live outside this repository; this branch documents the observed smoke result and does not modify or ship the adapter.

The live research module likewise reports provider-cited research as `incomplete`, and static guidance or provider failures as `unverified`; it does not claim independent verification.
