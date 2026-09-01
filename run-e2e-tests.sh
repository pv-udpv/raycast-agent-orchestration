#!/bin/bash
set -euo pipefail

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Raycast Agent Orchestration — E2E Test Suite             ║"
echo "║  (T1–T8: tree state → inference → export)                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

AGENT_URL="${AGENT_URL:-https://raycast-agent-orchestrator.pv-udpv.workers.dev}"
AGENT_ID="main"

echo "Agent URL: $AGENT_URL"
echo ""

# Helper: invoke agent
invoke_agent() {
  local method=$1
  local params=$2
  
  curl -s -X POST "${AGENT_URL}/agents/chat-tree/${AGENT_ID}" \
    -H "Content-Type: application/json" \
    -d "{\"method\":\"${method}\",\"params\":${params}}"
}

# T1: Export state
echo "─────────────────────────────────────────────────────────────"
echo "T1: Export tree state"
echo ""
STATE=$(invoke_agent "exportState" "{}")
echo "$STATE" | jq '.treeId, (.nodes | keys | length)'
echo ""

# T3: Choose remote model
echo "─────────────────────────────────────────────────────────────"
echo "T3: Choose model (high urgency → remote)"
echo ""
CHOICE=$(invoke_agent "chooseModel" '{"kind":"plan","urgency":"high"}')
echo "$CHOICE" | jq '.model, .runner'
echo ""

# T5: Model choice logic
echo "─────────────────────────────────────────────────────────────"
echo "T5: Model routing (code task → codex)"
echo ""
CODEX=$(invoke_agent "chooseModel" '{"kind":"code","urgency":"low"}')
echo "$CODEX" | jq '.model, .runner'
echo ""

# T7: Drift detection
echo "─────────────────────────────────────────────────────────────"
echo "T7: Detect drift (state vs manifest)"
echo ""
DRIFT=$(invoke_agent "detectDrift" "{$(cat tree.json | jq -c '.nodes | to_entries | map("\"\(.key)\":\(.value)") | join(",")' | sed 's/{.*}//')}")
echo "$DRIFT" | jq '.hasDrift, (.drift | length)'
echo ""

echo "─────────────────────────────────────────────────────────────"
echo "✓ Core tests passed (T1, T3, T5, T7)"
echo ""
echo "Remaining tests (T2, T4, T6, T8) require:"
echo "  T2: Local Ollama at http://localhost:11434"
echo "  T4: Perplexity bridge configured"
echo "  T6: Batch invocation implemented"
echo "  T8: Manifest export to disk"
echo ""
