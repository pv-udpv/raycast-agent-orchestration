# Implementation: zbst.tech Subagent Orchestration

**Status:** local subagent RPC wired and verified; not production-deployed
**Date:** 2026-08-27
**Target:** orchestrator.zbst.tech (Cloudflare Workers)

---

## Architecture

```text
orchestrator.zbst.tech (Cloudflare Worker)
    ├── Supervisor DO
    │   ├── @callable orchestrate()
    │   └── durable state (orchestrationId, status, phase, results)
    │
    ├── ResearcherAgent DO
    │   ├── @callable research(topic)
    │   └── finds best practices, anti-patterns, gotchas, risks
    │
    ├── PlannerAgent DO
    │   ├── @callable plan(scope, research)
    │   └── generates branch plan with NN- prefixes
    │
    ├── TreeAgent DO
    │   ├── @callable normalizeTree(chatId)
    │   └── validates folder/chat structure
    │
    ├── WorktreeAgent DO
    │   ├── @callable mapWorktrees(plan)
    │   └── generates git worktree commands
    │
    ├── RaycastAgent DO
    │   ├── @callable executeRaycastOps(plan)
    │   └── orchestrates chat/folder operations
    │
    ├── InferenceAgent DO
    │   ├── @callable defineRouting(available)
    │   └── 4-tier fallback policy
    │
    ├── ManifestAgent DO
    │   ├── @callable exportManifest(plan)
    │   └── generates tree.json, tree.md
    │
    └── TerminalAgent DO
        ├── @callable executeTerminalOps(commands)
        └── safe shell execution (gated by safety checks)
```

---

## Current Status

### ✓ Implemented and locally verified

* Supervisor worker routes include `POST /dispatch-subagent` and read-only `POST /subagent-state`.
* `src/subagent-dispatch.ts` maps eight allowlisted agent names to their Durable Object bindings and RPC methods; dispatch uses a stable named DO identity, with an optional caller-provided dispatch ID.
* Subagent `fetch()` handlers validate the RPC method allowlist. `getAgentState` is available for read-only state inspection.
* Wrangler/Miniflare local Durable Object dispatch was exercised for all eight allowlisted agents; each returned HTTP 200. The results confirmed current handler behavior, including scaffold/planning responses, not completion of real external operations.
* Researcher state was read before and after a Wrangler restart using the same persistence directory in a separate local persistence test.
* Worker unit tests, TypeScript type-check, `git diff --check`, and a production-config Wrangler dry-run passed. These checks do not constitute a deployment or remote RPC test.

### ⏳ Remaining work

1. Implement substantive production behavior for each subagent. Several handlers remain deterministic scaffolds; the Researcher can use its configured provider path, while other integrations are not thereby verified.
2. Decide whether orchestration history requires D1/SQL. Current verified persistence is Durable Object state storage, not the SQL schema proposed in the original draft.
3. Add failure/retry policy and observability based on concrete idempotency requirements.
4. Add provider-backed tests with citation-bearing responses and failure cases; current all-agent dispatch smoke used empty/static inputs and did not verify external integrations.
5. Review auth, CORS, rate limits, and production configuration before any deployment. No staging/production deployment or remote RPC has been verified.

---

## Immediate TODOs

### 1. Broaden dispatch verification

The dispatch path now exists in `apps/worker-agent/src/subagent-dispatch.ts` and the worker exposes `POST /dispatch-subagent`. Preserve the allowlist and verify each subagent’s real behavior independently; successful generic RPC routing is not evidence that an agent performs its intended external operation.

### 2. Decide on orchestration-history storage

The current worker configuration declares SQLite-backed Durable Objects; it does not declare a D1 binding. The SQL schema below is a proposal only and must not be treated as deployed or usable until a storage backend, migrations, retention, and failure semantics are selected.

```sql
CREATE TABLE orchestrations (
  id TEXT PRIMARY KEY,
  status TEXT,
  phase TEXT,
  results TEXT,
  errors TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### 3. Replace scaffolds with bounded, real behavior

For each subagent, specify inputs, outputs, external dependencies, time/resource budgets, and evidence requirements. In particular, `TerminalAgent.executeTerminalOps` currently records commands as `ready-to-execute`; it does not execute shell commands and must not be described or used as a shell executor.

### 4. Add failure handling only with defined semantics

Define which calls are idempotent and which errors are retryable before adding retries. Persist enough operation identity to prevent duplicate side effects; do not blindly retry Raycast, terminal, or provider operations.

### 5. Keep routes and deployment claims evidence-bounded

`/dispatch-subagent` and `/subagent-state` are implemented worker routes. Their existence and local tests do not establish authentication posture, production reachability, or remote Durable Object behavior. Audit those separately before exposure.

---

## Testing

### Local unit and type checks

```bash
npm run test --prefix apps/worker-agent
npm run type-check --prefix apps/worker-agent
```

### Local Durable Object integration

Start Wrangler on an available loopback port other than `8787` (reserved for the local MLX service) and use a dedicated persistence directory. Set `DISPATCH_TEST_URL` to that local address to enable the dispatch integration tests. Set `DISPATCH_PERSISTED_TOPIC` only when the matching persisted state has already been seeded, for example:

```bash
DISPATCH_TEST_URL=http://127.0.0.1:<port> npm run test:dispatch-local --prefix apps/worker-agent
```

A local Miniflare/Wrangler RPC call verifies local stub dispatch only. Persistence across restart requires a state probe both before and after restarting Wrangler with the same persistence directory. Do not infer restart persistence from a successful repeated dispatch.

### Build/config validation

```bash
cd apps/worker-agent
./node_modules/.bin/wrangler deploy --dry-run --outdir /tmp/rao-worker-dry-run
```

This bundles and validates the selected configuration; it does not deploy. Do not run a remote deploy or use port `8787` as part of this local verification.

---

## Deployment Checklist

- [x] Wrangler config declares all 9 Durable Object bindings and v1 SQLite-class migration.
- [ ] Select and migrate orchestration-history storage if required; no D1 binding/schema is currently configured.
- [ ] Audit authentication, CORS, and rate limits for the public routes.
- [ ] Define retry/idempotency behavior and persistent error reporting.
- [x] Wrangler observability is enabled in the current config; application-level event instrumentation remains unverified.
- [ ] Review staging config and run a staging deployment only as a separately approved task.
- [ ] Verify remote RPC and production smoke tests after an explicitly authorized deployment.

A successful dry-run is a bundle/configuration check, not evidence that any remote environment is deployed or reachable.

---

## Monitoring & Observability

Use Cloudflare diagnostics_channel:

```typescript
import { diagnosticsChannel } from "diagnostics_channel"

const orchestrationChannel = diagnosticsChannel.channel("orchestration")

orchestrationChannel.publish({
  event: "orchestration_started",
  orchestrationId: this.state.orchestrationId,
  timestamp: new Date().toISOString()
})
```

Enable in wrangler.json:

```jsonc
{
  "observability": {
    "enabled": true
  },
  "analytics_engine_bindings": [
    {
      "binding": "ANALYTICS"
    }
  ]
}
```

---

## Next Branch Focus

Once this branch (`20-zbst-tech-subagents`) reaches "deployable", move to:

* `30-local-inference` — implement actual model routing with Ollama/MLX
* `50-worker-agent` — integrate with zbst.tech (sync secrets, auth, logging)
* `60-terminal-automation` — implement safe shell execution (git worktree commands)
