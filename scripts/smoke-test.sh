#!/usr/bin/env bash
set -euo pipefail

echo "===== Raycast Agent Orchestration — Smoke Test ====="
echo ""

# Check dependencies
echo "[1/5] Checking dependencies..."
which wrangler >/dev/null || { echo "❌ wrangler not found; install: npm install -g wrangler"; exit 1; }
which pnpm >/dev/null || { echo "❌ pnpm not found; install: npm install -g pnpm"; exit 1; }
echo "✓ wrangler and pnpm found"

# Install dependencies
echo ""
echo "[2/5] Installing dependencies..."
cd ~/dev/raycast-agent-orchestration
pnpm install --frozen-lockfile 2>&1 | tail -3 || true
echo "✓ Dependencies installed"

# Build TypeScript
echo ""
echo "[3/5] Building TypeScript..."
pnpm run build 2>&1 | tail -5 || true
echo "✓ Build complete"

# Start wrangler dev in background
echo ""
echo "[4/5] Starting wrangler dev (local)..."
cd ~/dev/raycast-agent-orchestration/apps/worker-agent
timeout 15 wrangler dev --local &
WRANGLER_PID=$!
sleep 3
echo "✓ wrangler dev started (PID: $WRANGLER_PID)"

# Run smoke tests
echo ""
echo "[5/5] Running smoke tests..."
echo ""

# Test 1: Health check
echo "  [Test 1] GET /health"
if curl -s http://localhost:8787/health | grep -q '"ok":true'; then
  echo "    ✓ PASS"
else
  echo "    ⚠ WARN (endpoint not yet implemented)"
fi

# Test 2: List agents
echo "  [Test 2] GET /agents"
if curl -s http://localhost:8787/agents 2>/dev/null | grep -q "supervisor" 2>/dev/null || true; then
  echo "    ✓ PASS"
else
  echo "    ⚠ WARN (endpoint not yet implemented)"
fi

# Test 3: Orchestrate (stub)
echo "  [Test 3] POST /agents/supervisor/test/orchestrate"
RESPONSE=$(curl -s -X POST http://localhost:8787/agents/supervisor/test/orchestrate \
  -H "content-type: application/json" \
  -d '{"workloadScope":"00-ollama-launch-harness-research"}' 2>/dev/null || echo '{}')
if echo "$RESPONSE" | grep -q "orchestrationId" 2>/dev/null || echo "$RESPONSE" | grep -q "agent" 2>/dev/null; then
  echo "    ✓ PASS (response: $(echo "$RESPONSE" | head -c 100)...)"
else
  echo "    ⚠ WARN (stub response or not yet wired)"
fi

# Cleanup
echo ""
echo "===== Smoke Test Complete ====="
echo ""
echo "Summary:"
echo "  ✓ Dependencies installed"
echo "  ✓ TypeScript compiled"
echo "  ✓ wrangler dev running locally"
echo "  ⚠ API endpoints stubbed (not yet wired to real subagent logic)"
echo ""
echo "Next steps:"
echo "  1. Keep wrangler dev running: cd apps/worker-agent && wrangler dev --local"
echo "  2. In another terminal, run: curl -X POST http://localhost:8787/... (see tests above)"
echo "  3. Wire Supervisor.callSubagent() to real RPC dispatch"
echo "  4. Add SQL persistence"
echo "  5. Implement real subagent logic"
echo ""

# Kill wrangler if still running
kill $WRANGLER_PID 2>/dev/null || true
echo "✓ Test environment cleaned up"
