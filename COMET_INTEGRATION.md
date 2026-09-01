# Comet / Perplexity MCP Integration

**Status:** ✅ Complete — pplx-mcp-server wired into session bridge

---

## What is Comet?

**Comet** is Perplexity's **browser agent + native macOS app** with:

- Live web access (real-time search, current events, research)
- Native AI chat interface (`/Applications/Comet.app`)
- MCP server exposure via `pplx-mcp-server` (stdio JSON-RPC 2.0)
- Session continuity (context UUID persistence)

**Key difference from other providers:**

| Provider | Model | Type | Web Access |
|---|---|---|---|
| **Codex** | Local | CLI (stateful sessions) | ❌ No |
| **pplx-mlx** | Local MLX Qwen3 | HTTP (stateless) | ❌ No |
| **Claude** | Anthropic API | REST (stateless) | ❌ No |
| **Comet** | Perplexity web | MCP stdio (session-aware) | ✅ **Yes** |

---

## Architecture

### MCP Server Registration

Raycast reads `~/.config/raycast/mcp.json`:

```json
{
  "mcpServers": {
    "pplx-stack": {
      "command": "python",
      "args": ["-m", "pplx_mcp"],
      "cwd": "/Users/pv/Documents/Perplexity/pplx-mcp-server",
      "env": {
        "CHAT_BASE_URL": "http://127.0.0.1:49317/v1",
        "EMBED_BASE_URL": "http://127.0.0.1:49319/v1",
        "AGENT_BASE_URL": "http://127.0.0.1:49320"
      }
    }
  }
}
```

When Raycast AI Chat loads, it:
1. Spawns `python -m pplx_mcp` as a subprocess
2. Speaks JSON-RPC 2.0 over stdin/stdout
3. Can call any of these tools:
   - `stack.status` — health check
   - `chat.complete` — local chat completions
   - `embed` — embeddings
   - `agent.plan` — agent reasoning
   - `agent.asi` — consensus tasks
   - **`session_ask`** ← what we use for web-aware Q&A
   - `session_asi` — structured task in session

### Comet Adapter Flow

```
Raycast invoke-model / AI Extension
         ↓
  send-prompt(provider: "comet", prompt)
         ↓
CometAdapter.send(session, prompt)
         ↓
spawn: python -m pplx_mcp
         ↓
JSON-RPC 2.0 initialize + tools/call
         ↓
pplx-mcp-server: session_ask(question, context_uuid?)
         ↓
Comet browser agent: live web search + reasoning
         ↓
result → SessionManager transcript
         ↓
return to Raycast UI / AI Extension
```

---

## Exposed Tools

### AI Extension: `send-to-comet`

```typescript
export default async function sendToComet(input: {
  sessionId?: string        // existing session (optional)
  question: string         // web-aware question
  includeWebContext?: boolean // inject web context hint
}): Promise<string>
```

**Use cases:**

- "What's the latest news on AI regulation?" → Comet fetches current articles
- "Compare prices for MacBook Pro M5 today" → Comet browses current listings
- "What's the status of [project] right now?" → Comet retrieves live updates
- "Summarize the latest research on [topic]" → Comet gathers recent papers

**Returns:**

```json
{
  "sessionId": "session-abc123",
  "response": "Based on live web search...",
  "provider": "comet",
  "turnCount": 5,
  "success": true
}
```

---

## Session Continuity

Comet sessions are **context-aware**:

```json
{
  "sessionId": "session-abc123",
  "providerBindings": {
    "codex": { "threadId": "01a05dfa-..." },
    "comet": { "sessionUuid": "ctx-xyz789" }
  },
  "transcript": [
    { "provider": "comet", "role": "user", "content": "Latest AI news?" },
    { "provider": "comet", "role": "assistant", "content": "As of Sep 1, 2026..." },
    { "provider": "codex", "role": "user", "content": "Summarize that" },
    { "provider": "codex", "role": "assistant", "content": "The key points..." }
  ]
}
```

**Context UUID persistence:** Comet's `sessionUuid` is stored in `providerBindings.comet`, so follow-up questions in the same session maintain context without re-searching.

---

## Usage Examples

### Manual UI: invoke-model command

```
Raycast → "Invoke Model"
Provider: [Comet]
Prompt: "What are the top 5 AI breakthroughs this week?"
Send →
[Comet fetches live web results]
"As of Sep 1, 2026, the major developments are: ..."

Switch Provider: [Claude]
Prompt: "Explain why these are significant"
Send →
[Claude sees full transcript including Comet's web context]
```

### AI Extension: Auto-orchestration

```
User in Raycast AI:
"Summarize the latest developments in quantum computing and explain them simply"

Raycast AI reasons:
1. "This needs current info" → calls send-to-comet("Latest quantum computing breakthroughs")
2. Gets web-aware response from Comet
3. "Now explain these" → calls send-prompt(claude, "Explain these quantum concepts...")
4. Claude reads Comet's response in transcript
5. Synthesizes: "Here's what you need to know about recent quantum advances..."
```

---

## Running Comet

### Check if it's already running

```bash
ps aux | grep -i comet | grep -v grep
# /Applications/Comet.app/Contents/MacOS/Comet
```

### Start Comet

```bash
open -a Comet
```

### Check MCP server

```bash
ps aux | grep pplx_mcp | grep -v grep
# Should show: python -m pplx_mcp (PID 1296, 1262, etc.)
```

### Test MCP directly (stdio)

```bash
python -m pplx_mcp << 'EOF'
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}
{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "stack.status"}}
EOF
```

Expected output: JSON-RPC responses with `stack.status`, `chat.complete`, `embed`, `agent.*`, `session_*` tools listed.

---

## Integration with Raycast Agent

### Current setup

1. ✅ Comet adapter: `src/session-bridge/adapters/comet-adapter.ts`
2. ✅ AI tool: `src/tools/send-to-comet.ts`
3. ✅ MCP config: `~/.config/raycast/mcp.json`
4. ✅ Package.json: ai.tools includes `send-to-comet`

### To activate

```bash
cd ~/dev/raycast-agent-orchestration/worktrees/wt-40-raycast-integration

# Install deps (if not already done)
npm install

# Start in dev mode
npm run dev
# Raycast opens with extension
```

### In Raycast AI Chat

Comet is now available as a first-class tool:

```
You (in Raycast AI): "What's new in AI today?"

Raycast AI sees:
  - send-prompt(provider: "comet", prompt: "...")
  - send-to-comet(question: "...", includeWebContext: true)

Raycast chooses send-to-comet automatically for web queries.
```

---

## Limitations & Notes

| Item | Status |
|---|---|
| Web access | ✅ Live (via Comet browser) |
| Session persistence | ✅ Context UUID tracked |
| MCP protocol | ✅ 2025-06-18 |
| Raycast integration | ✅ stdio MCP via .config/raycast/mcp.json |
| Cross-provider context | ✅ Full transcript in SessionManager |
| Comet app required | ⚠️ Yes — must run `/Applications/Comet.app` |
| Session timeout | ⏳ Comet's default (likely ~30 min) |

---

## Next Steps

1. Launch Raycast extension: `npm run dev` in wt-40
2. Open Raycast AI Chat → should list `pplx-stack` MCP server
3. Ask a web-aware question → Comet responds
4. Switch to Codex/Claude → they see Comet's context
5. Build a prompt that uses all 4 providers for different strengths:
   - Comet: current info
   - Codex: code generation
   - Claude: reasoning
   - pplx-mlx: quick local inference

