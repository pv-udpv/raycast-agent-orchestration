# Implementation: zbst.tech Subagent Orchestration

**Status:** scaffolded  
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

### ✓ Scaffolded

* Supervisor agent skeleton (agent.ts)
* 8 subagent stubs (subagents.ts)
* wrangler.jsonc with DO bindings
* SUBAGENT_REGISTRY and ROUTING_MATRIX (index.ts)
* durable_objects migration setup (v1 tag)

### ⏳ Next Steps

1. **Wire routing** — connect Supervisor to actual subagent DOs
2. **Implement @callable endpoints** — add real logic per subagent
3. **Add persistent storage** — use SQL for orchestration history
4. **Test locally** — wrangler dev with local DO bindings
5. **Deploy to zbst.tech** — wrangler deploy --env production
6. **Expose API** — POST /orchestrate, GET /state, GET /agents

---

## Immediate TODOs

### 1. Supervisor.callSubagent() implementation

Replace stub with actual RPC invocation:

```typescript
private async callSubagent(role: string, input: unknown): Promise<unknown> {
  const id = this.env.d1.prepare(
    `SELECT do_id FROM subagent_instances WHERE role = ?`
  ).bind(role).first() as { do_id: string } | undefined

  if (!id) throw new Error(`No instance for ${role}-agent`)

  const stub = this.env[`${role}Agent`].get(id.do_id)
  return stub.fetch("https://agent/", {
    method: "POST",
    body: JSON.stringify({ method: role, input })
  })
}
```

### 2. Add SQL schema for state tracking

```sql
CREATE TABLE orchestrations (
  id TEXT PRIMARY KEY,
  status TEXT,
  phase TEXT,
  results JSONB,
  errors JSONB,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE subagent_instances (
  id TEXT PRIMARY KEY,
  role TEXT,
  do_id TEXT,
  health TEXT,
  last_heartbeat TEXT
);
```

### 3. Implement real subagent logic

Each DO should:
* Read from SQL
* Perform work
* Write results back to SQL
* Return response

Example:

```typescript
@callable()
async research(input: { topic: string }) {
  // Dispatch to local-inference-agent for actual research
  const findings = await this.callInferenceAgent({
    task: "research",
    topic: input.topic
  })
  
  // Store in SQL
  await this.sql`
    INSERT INTO research_findings (topic, findings, created_at)
    VALUES (${input.topic}, ${JSON.stringify(findings)}, ${new Date().toISOString()})
  `
  
  return findings
}
```

### 4. Add error handling & retries

Wrap all @callable with try/catch and retry logic:

```typescript
@callable()
async orchestrate(input: any) {
  try {
    // ... work
  } catch (err) {
    // Log to SQL error_log
    await this.retry(async () => {
      // retry logic
    }, { maxAttempts: 3, backoff: "exponential" })
  }
}
```

### 5. Expose HTTP endpoints

```typescript
fetch(req: Request) {
  if (req.url.endsWith("/orchestrate")) {
    const supervisor = this.env.Supervisor.get("singleton")
    return supervisor.fetch(req)
  }
  if (req.url.endsWith("/state")) {
    const supervisor = this.env.Supervisor.get("singleton")
    return new Response(JSON.stringify(supervisor.state))
  }
  // ...
}
```

---

## Testing

### Local (wrangler dev)

```bash
cd apps/worker-agent
wrangler dev --local
# Test at http://localhost:8787/agents/supervisor/test
```

### Integration

```bash
# Boot bootstrap-full.sh to create worktrees
bash scripts/bootstrap-full.sh

# Then deploy supervisor and run orchestration
wrangler deploy --env staging
curl -X POST https://orchestrator-staging.zbst.tech/orchestrate \
  -H "content-type: application/json" \
  -d '{"workloadScope": "00-ollama-launch-harness-research"}'
```

---

## Deployment Checklist

- [ ] wrangler.jsonc configured for zbst.tech
- [ ] All 9 DOs registered as bindings
- [ ] SQL schema migrated (D1 or Vectorize)
- [ ] Health checks implemented
- [ ] Retry logic added
- [ ] Error logging to SQL
- [ ] API endpoints exposed
- [ ] CORS headers set
- [ ] Rate limiting configured
- [ ] Monitoring/observability setup (diagnostics_channel)
- [ ] wrangler deploy --env production executed
- [ ] Smoke tests pass on production

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
