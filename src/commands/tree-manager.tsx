import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api"
import { useState, useEffect } from "react"

interface TreeState {
  treeId: string
  rootId?: string
  folderId?: string
  nodes: Record<string, { done: boolean; title: string; chatId?: string }>
}

interface AgentResponse {
  ok: boolean
  output?: string
  model?: string
  runner?: string
  error?: string
}

export default function TreeManager() {
  const [state, setState] = useState<TreeState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTreeState()
  }, [])

  async function loadTreeState() {
    try {
      setIsLoading(true)
      const agentUrl = process.env.AGENT_URL || "http://localhost:8787"
      const resp = await fetch(`${agentUrl}/agents/chat-tree/main`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "exportState", params: {} })
      })

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = (await resp.json()) as TreeState
      setState(data)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tree state",
        message: (err as Error).message
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <Detail isLoading markdown="Loading tree state..." />
  }

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => loadTreeState()} />
          </ActionPanel>
        }
      />
    )
  }

  const stats = state
    ? {
        total: Object.keys(state.nodes).length,
        done: Object.values(state.nodes).filter((n) => n.done).length,
        rootId: state.rootId || "unset",
        folderId: state.folderId || "unset"
      }
    : null

  const markdown = `
# Tree Manager

## Status
- **Root chat:** ${stats?.rootId || "—"}
- **Folder:** ${stats?.folderId || "—"}
- **Total branches:** ${stats?.total || 0}
- **Completed:** ${stats?.done || 0}/${stats?.total || 0}

## Branches
${
  state
    ? Object.entries(state.nodes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, node]) => `- ${id} \`${node.title}\` ${node.done ? "✓" : "☐"}`)
        .join("\n")
    : "—"
}
`

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={() => loadTreeState()} />
        </ActionPanel>
      }
    />
  )
}
