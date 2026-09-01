# Cross-Provider Session Sharing

**Problem:** How do you maintain conversation context when switching between Codex, Perplexity, and Claude in Raycast without losing thread history?

**Solution:** A session-bridge layer that:

1. **Persists sessions locally** → `~/.raycast-sessions/{sessionId}.json`
2. **Maintains provider-specific state** → Codex thread IDs, etc.
3. **Injects transcript context** → Each provider sees recent history
4. **Enables mid-session provider switching** → No context loss

---

## Architecture

```
Raycast invoke-model command
  ↓
SessionManager (session-bridge/)
  ├─ types.ts          — SessionState, Turn, ProviderAdapter interface
  ├─ session-manager.ts — Load/save/export, provider dispatch
  └─ adapters/
      ├─ codex-adapter.ts      — `codex exec [--resume threadId] ...`
      └─ pplx-adapter.ts       — `POST /ask` with injected context
      └─ claude-adapter.ts     — (TBD) Anthropic API
```

---

## Core Files

### `src/session-bridge/types.ts`

```typescript
export interface SessionState {
  sessionId: string
  createdAt: number
  providerBindings: {
    codex?: { threadId: string }
    // Add as needed for other providers
  }
  transcript: Turn[]  // Full conversation history
}

export type ProviderId = "codex" | "pplx-mlx" | "claude"

export interface ProviderAdapter {
  send(session: SessionState, prompt: string): Promise<AdapterResult>
}
```

### `src/session-bridge/session-manager.ts`

Core API:

```typescript
class SessionManager {
  // Load or create a session
  constructor(sessionId?: string)

  // Send to a provider (records turn automatically)
  async send(provider: ProviderId, prompt: string): Promise<string>

  // Switch provider mid-session (full context injected)
  async switchProvider(provider: ProviderId, nextPrompt: string): Promise<string>

  // Export for tree-agent or analysis
  export(): SessionState

  // List all sessions in ~/.raycast-sessions
  static listSessions(): string[]

  // Load existing session
  static load(sessionId: string): SessionManager
}
```

**Usage in Raycast:**

```typescript
const mgr = new SessionManager()
const response1 = await mgr.send("codex", "Write a function")
const response2 = await mgr.switchProvider("pplx-mlx", "Optimize that")
const response3 = await mgr.send("claude", "Is it secure?")

// All three calls share context
console.log(mgr.export().transcript)  // Shows full 6-turn conversation
```

---

## Provider Adapters

### Codex Adapter

**Resume behavior:**

- First call: Creates new Codex session
- Later calls: Resumes thread_id via `codex exec resume <threadId>`
- Thread lives in `~/.codex` (not ephemeral)

```bash
# First turn
codex exec --json --skip-git-repo-check "Your question"
# Output: { "thread_id": "01a05dfa-..." }

# Later turns
codex exec --json resume "01a05dfa-..." "Follow-up"
# Codex's server automatically has the history
```

**Context injection:** Only needed on first turn; not needed on resume (Codex maintains its own server-side state).

### Perplexity KG Adapter

**Stateless:** Sends questions to `http://127.0.0.1:49321/ask`

```bash
curl -X POST http://127.0.0.1:49321/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "...context history...\n\nActual question"}'
```

**Context injection:** Full transcript injected before each call (KG has no memory between calls).

### Claude Adapter (TBD)

Use Anthropic API with conversation history:

```typescript
await fetch("https://api.anthropic.com/v1/messages", {
  body: JSON.stringify({
    messages: [
      { role: "user", content: "..." },
      { role: "assistant", content: "..." },
      // ... full transcript
      { role: "user", content: newPrompt }
    ]
  })
})
```

---

## Raycast Integration

### `src/commands/invoke-model.tsx`

**Main command:** Wrapper around SessionManager.

```typescript
export default function InvokeModelCommand() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [state, setState] = useState<SessionState | null>(null)

  // On load, restore last session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("lastSessionId")
    if (saved && SessionManager.listSessions().includes(saved)) {
      const mgr = SessionManager.load(saved)
      setSessionId(saved)
      setState(mgr.export())
    }
  }, [])

  // Submit form: send prompt to provider
  async function handleSubmit(prompt: string, provider: ProviderId) {
    const mgr = SessionManager.load(sessionId!)
    const response = await mgr.send(provider, prompt)
    setState(mgr.export())  // Update UI with new turn
  }

  // Provider switch: full context preserved
  async function handleSwitchProvider(newProvider: ProviderId, prompt: string) {
    const mgr = SessionManager.load(sessionId!)
    const response = await mgr.switchProvider(newProvider, prompt)
    setState(mgr.export())
  }
}
```

**UI:**

- Dropdown: Select Codex, Perplexity, or Claude
- Form: Prompt input
- Transcript view: Shows all turns (color-coded by provider)
- Actions: "Start new session", "Load session", "View transcript", "Switch provider"

---

## Session Persistence

All session state lives in `~/.raycast-sessions/{sessionId}.json`:

```json
{
  "sessionId": "session-a1b2c3d4",
  "createdAt": 1692374400000,
  "providerBindings": {
    "codex": { "threadId": "01a05dfa-f1ca-7220-..." }
  },
  "transcript": [
    {
      "turn": 0,
      "provider": "codex",
      "role": "user",
      "content": "Write a function",
      "timestamp": 1692374401000
    },
    {
      "turn": 1,
      "provider": "codex",
      "role": "assistant",
      "content": "def hello():\n  return 'world'",
      "timestamp": 1692374402000
    },
    {
      "turn": 2,
      "provider": "pplx-mlx",
      "role": "user",
      "content": "Optimize that",
      "timestamp": 1692374403000
    },
    {
      "turn": 3,
      "provider": "pplx-mlx",
      "role": "assistant",
      "content": "Use a lambda or tuple...",
      "timestamp": 1692374404000
    }
  ]
}
```

**Rationale:**

- Survives Raycast restarts
- Can be exported for analysis or tree-agent sync
- Enables "resume from 2 weeks ago" use case
- Compatible with harness benchmarking (all runs in one file)

---

## Example Workflow

### Single-session, multi-provider

User in Raycast:

```
Provider: [Codex]
Prompt: "Optimize a Docker build"
→ [Codex responds]

Provider: [Perplexity]  ← Switch
Prompt: "Can you check for security issues?"
→ [Perplexity sees the full conversation above + your new prompt]

Provider: [Claude]  ← Switch again
Prompt: "Is this production-ready?"
→ [Claude sees all 4 turns so far]

View Transcript:
[Codex] user: Optimize a Docker build
[Codex] assistant: Use multi-stage builds...
[Perplexity] user: Can you check...
[Perplexity] assistant: The `FROM` should...
[Claude] user: Is this production-ready?
[Claude] assistant: Yes, but consider...
```

### Harness: Compare all three

(Future: invoke-harness command)

```
Provider: [All: Codex + Perplexity + Claude]
Prompt: "Explain quantum entanglement"
→ Creates 3 parallel turns
→ Returns comparison table (response quality, latency, token counts)
```

---

## To Integrate with Tree-Agent

Once this session bridge is live, the `tree-agent` can:

1. **Poll session state** → `GET /export?sessionId=X`
2. **Create nodes for each turn** → One node per (provider, prompt, response)
3. **Build comparison trees** → Parent = prompt; children = responses per provider
4. **Export merged state** → tree.json contains both session transcript AND tree structure

Example tree structure after the workflow above:

```json
{
  "nodeId": "root",
  "children": [
    {
      "nodeId": "0-codex",
      "parentNodeId": "root",
      "provider": "codex",
      "prompt": "Optimize a Docker build",
      "response": "Use multi-stage builds...",
      "children": [
        {
          "nodeId": "1-perplexity",
          "provider": "perplexity",
          "prompt": "Can you check for security?",
          "response": "The FROM should...",
          "children": [...]
        }
      ]
    }
  ]
}
```

---

## Testing

```bash
# 1. Start session
SESSION_ID=$(uuidgen)
node -e "
  const { SessionManager } = require('./session-manager.ts')
  const mgr = new SessionManager('$SESSION_ID')
  // Test send/switchProvider
"

# 2. Verify ~/.raycast-sessions/$SESSION_ID.json exists
ls -la ~/.raycast-sessions/

# 3. Reload and verify transcript persists
node -e "
  const { SessionManager } = require('./session-manager.ts')
  const mgr = SessionManager.load('$SESSION_ID')
  console.log(mgr.export().transcript.length)  // Should be > 0
"
```

---

## Next Steps

1. ✅ `types.ts` — Session + Turn + ProviderAdapter interface
2. ✅ `session-manager.ts` — Load/save logic
3. ✅ `adapters/codex-adapter.ts` — `codex exec` wrapper with resume
4. ✅ `adapters/pplx-adapter.ts` — HTTP POST to pplx_kg/ask
5. ⏳ `adapters/claude-adapter.ts` — Anthropic API + history
6. ⏳ `commands/invoke-model.tsx` — Raycast UI integration
7. ⏳ `harness-compare` command — Parallel multi-provider invocation
8. ⏳ Tree-agent sync — Export sessions as tree nodes

