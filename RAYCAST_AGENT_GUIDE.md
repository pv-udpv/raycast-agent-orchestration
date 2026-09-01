# Raycast Agent — Cross-Provider Session Orchestration

**What is this?**

A Raycast extension + AI Extension that acts as a session broker for multi-provider chat:

- **Codex** — local CLI with native session persistence
- **Perplexity** — local MLX model via retrieval KG endpoint
- **Claude** — Anthropic API with transcript replay
- **Raycast AI** — native AI chat can call the above as tools

All share context. Switch providers mid-conversation. Full transcript persists locally.

---

## Two Ways to Use

### 1. Manual UI Command: `invoke-model`

Raycast command → Form UI → sends to a provider → records turn

**Use case:** You want to manually control the session, switch providers, review transcripts.

```
$ open -a Raycast
$ Search: "Invoke Model"
→ Form: [Prompt textarea] [Provider dropdown] [Session display]
→ Send to Codex
→ Switch to Perplexity KG
→ Switch to Claude
→ View full transcript
```

**State:** Persisted to `~/.raycast-sessions/{sessionId}.json`

---

### 2. Raycast AI Callable Tools: AI Extension

Raycast AI native chat can call these tools:

- `send-prompt` — initiate or continue conversation
- `switch-provider` — change providers mid-turn
- `list-sessions` — browse saved sessions
- `get-transcript` — read prior conversation

**Use case:** You ask Raycast AI "Compare Docker approaches across all three models," and it:
1. Calls `send-prompt(sessionId, "Docker best practices", "codex")`
2. Reads response
3. Calls `switch-provider(sessionId, "pplx-mlx", "Is that secure?")`
4. Reads response
5. Calls `switch-provider(sessionId, "claude", "Is it production-ready?")`
6. Synthesizes all three answers

**Prerequisite:** Raycast's native AI must be enabled (requires Raycast Pro or API key setup)

---

## Install + Test

### Build the extension

```bash
cd ~/dev/raycast-agent-orchestration/worktrees/wt-40-raycast-integration

# Option A: Develop mode (live reload)
npm run dev
# Opens Raycast with extension in dev mode

# Option B: Build for distribution
npm run build
# Creates .rayext file in dist/
```

### Run manually (no Raycast app)

```bash
# Test session manager directly
node -e "
const { SessionManager } = require('./src/session-bridge/session-manager.ts')
const mgr = new SessionManager()
mgr.send('codex', 'Hello')
  .then(r => console.log(r))
"
```

### Configure providers

#### Codex (already installed on your Mac)

```bash
codex --version
# Already at /Users/pv/.local/bin/codex
# Sessions auto-persist to ~/.codex
```

#### Perplexity KG (running on your Mac)

```bash
# Verify it's live
curl http://127.0.0.1:49321/health
# Response: {"status":"ok",...}
```

#### Claude (requires API key)

```bash
export ANTHROPIC_API_KEY="sk-ant-YOUR_KEY_HERE"
# Extension reads this on invoke
```

---

## Architecture

### Session State

```
~/.raycast-sessions/session-a1b2c3d4.json
{
  "sessionId": "session-a1b2c3d4",
  "createdAt": 1692374400000,
  "providerBindings": {
    "codex": { "threadId": "01a05dfa-f1ca-..." }
  },
  "transcript": [
    { "turn": 0, "provider": "codex", "role": "user", "content": "..." },
    { "turn": 1, "provider": "codex", "role": "assistant", "content": "..." },
    { "turn": 2, "provider": "pplx-mlx", "role": "user", "content": "..." },
    ...
  ]
}
```

### Provider Flow

```
Raycast UI / AI Extension
        ↓
   SessionManager
    /    |    \
   /     |     \
Codex  Pplx   Claude
(local (local  (remote
 CLI)   HTTP)   API)
```

**Codex:** Stateful (server-side thread). SessionManager stores `threadId`, calls `codex exec resume <threadId>` for subsequent turns.

**Perplexity:** Stateless. SessionManager injects prior transcript into the question string, calls POST `/ask`.

**Claude:** Stateless. SessionManager replays full message history, calls Anthropic Messages API.

---

## Example Flows

### Flow 1: User switches providers manually

```
1. Raycast: invoke-model command
2. User: "Explain Docker" → Provider: Codex → Send
3. SessionManager creates session-abc123
4. Codex responds: "Use multi-stage builds..."
5. User: Provider dropdown → switch to "Perplexity"
6. User: "Is that secure?" → Send
7. SessionManager injects prior turn into Perplexity question
8. Perplexity: "Check the FROM directive..."
9. User: View Transcript → shows both turns
```

**Session file:**
```json
{
  "sessionId": "session-abc123",
  "transcript": [
    { "provider": "codex", "role": "user", "content": "Explain Docker" },
    { "provider": "codex", "role": "assistant", "content": "Use multi-stage builds..." },
    { "provider": "pplx-mlx", "role": "user", "content": "Is that secure?" },
    { "provider": "pplx-mlx", "role": "assistant", "content": "Check the FROM..." }
  ]
}
```

### Flow 2: Raycast AI auto-orchestrates

```
User in Raycast AI: "Compare Docker approaches on all three models"

Raycast AI calls:
1. list-sessions() → "No active session"
2. send-prompt(
     sessionId: undefined,
     prompt: "What are Docker best practices?",
     provider: "codex"
   ) → "Use multi-stage builds, minimal base images..."

3. switch-provider(
     sessionId: "session-xyz789",
     newProvider: "pplx-mlx",
     prompt: "What about security?"
   ) → "Scan for CVEs with..."

4. switch-provider(
     sessionId: "session-xyz789",
     newProvider: "claude",
     prompt: "Production readiness?"
   ) → "Yes, but consider..."

5. get-transcript(
     sessionId: "session-xyz789"
   ) → full conversation history

Raycast AI synthesizes: "All three models agree on X, but Perplexity emphasizes security while Claude focuses on..."
```

---

## Raycast AI Extension Details

### How AI Extensions work in Raycast

1. Extension defines `ai.instructions` in `package.json` — tells the AI how to think
2. Extension defines `ai.tools[]` — functions the AI can call
3. When user asks a question in Raycast AI, it:
   - Reads the instructions
   - Looks for relevant tools
   - Calls tools if needed
   - Synthesizes answer

### Our AI instructions

```json
"ai": {
  "instructions": "You are the Tree Orchestrator AI agent. You can send prompts to multiple inference providers (Codex, Perplexity/pplx-mlx, Claude) and switch between them seamlessly while preserving full conversation context...",
  "tools": [
    { "name": "send-prompt", "description": "..." },
    { "name": "switch-provider", "description": "..." },
    { "name": "list-sessions", "description": "..." },
    { "name": "get-transcript", "description": "..." }
  ]
}
```

### Tool signatures

Each tool lives in `src/tools/*.ts` and exports a default function:

```typescript
export default async function sendPrompt(input: Input): Promise<string> {
  // input.sessionId, input.prompt, input.provider
  // Returns JSON string with { success, response, sessionId, ... }
}
```

Raycast AI parses the returned JSON and uses it for decision-making.

---

## Deployment

### Development

```bash
cd ~/dev/raycast-agent-orchestration/worktrees/wt-40-raycast-integration
npm run dev
# Raycast opens with extension in dev mode
# Changes auto-reload
```

### Production

```bash
npm run build
# Creates dist/*.rayext
# Drag into Raycast app or share with others
```

### Publishing to Raycast Store

(Future: submit to store if desired)

```bash
ray publish
```

---

## Known Limitations

| Issue | Status | Workaround |
|-------|--------|-----------|
| Codex sessions expire after 7 days | By design | Restart conversation or use API directly |
| No built-in GUI for session browsing | Roadmap | Use `list-sessions` tool or `invoke-model` UI |
| Perplexity KG has no native sessions | Expected | SessionManager manages history via transcript injection |
| Claude API costs | By design | Use low-cost models like claude-3-5-haiku |

---

## Next Steps

1. ✅ Session-bridge core (types, manager, adapters)
2. ✅ invoke-model command UI
3. ✅ AI Extension tools + instructions
4. ✅ Claude adapter (Anthropic API)
5. ⏳ Tree-agent sync (export sessions as tree nodes)
6. ⏳ Harness integration (batch compare across providers)
7. ⏳ Web UI dashboard (sessions browser)

---

## Testing Checklist

- [ ] `npm install` succeeds
- [ ] `npm run dev` opens Raycast with extension
- [ ] invoke-model command appears in search
- [ ] Codex adapter works (creates session, records turn)
- [ ] Perplexity adapter works (sends to localhost:49321)
- [ ] Claude adapter works (calls Anthropic API if key set)
- [ ] Session persists to ~/.raycast-sessions/
- [ ] Switch provider mid-session preserves context
- [ ] Raycast AI can call send-prompt tool
- [ ] AI transcript injection works (prior turns in context)

---

## Quick start (5 min)

```bash
cd ~/dev/raycast-agent-orchestration/worktrees/wt-40-raycast-integration

# Install dependencies
npm install

# Start dev mode
npm run dev
# (Raycast opens)

# In Raycast:
# Search: "Invoke Model"
# Prompt: "Hello, Codex"
# Provider: Codex
# Send

# Check session file
cat ~/.raycast-sessions/session-*.json | jq .transcript
```

Done!

