import { Action, ActionPanel, Detail, Toast, showToast, usePromise } from "@raycast/api"
import { useMemo } from "react"
import * as api from "../lib/api"
import * as terminal from "../lib/terminal"
import type { DriftReport, OrchestratedResult } from "../types"

export default function TreeManager() {
  const { data: state, error: stateError, isLoading: stateLoading } = usePromise(
    api.getTreeState,
    [],
    { onError: (err) => showToast({ style: Toast.Style.Failure, title: "Failed to load state", message: String(err) }) }
  )

  const { data: drift, error: driftError, isLoading: driftLoading } = usePromise(
    async () => {
      if (!state) return null
      // Mock implementation: would call supervisor.syncTree with actual chat data
      return { matches: [], mismatches: [], missing: [], extra: [] } as DriftReport
    },
    [state],
    { onError: (err) => showToast({ style: Toast.Style.Failure, title: "Failed to sync", message: String(err) }) }
  )

  const markdown = useMemo(() => {
    if (stateLoading || driftLoading) return "# Tree Manager\n\nLoading..."

    if (stateError) {
      return `# Tree Manager\n\n❌ Error\n\n${String(stateError)}`
    }

    if (!state) {
      return "# Tree Manager\n\nNo state available. Run 'Normalize Root' first."
    }

    const branchCount = Object.values(state.nodes).filter((n) => n.type === "branch").length
    const driftCount = (drift?.mismatches?.length ?? 0) + (drift?.missing?.length ?? 0)

    let md = `# Tree Manager\n\n`
    md += `**Root Chat:** ${state.rootId || "not set"}\n`
    md += `**Folder:** ${state.folderId || "not set"}\n`
    md += `**Branches:** ${branchCount}\n`
    md += `**Last Updated:** ${new Date(state.updatedAt).toLocaleString()}\n`
    md += `**Sync Status:** ${driftCount === 0 ? "✓ Clean" : `⚠ ${driftCount} drifts`}\n\n`

    if (drift && driftCount > 0) {
      md += `## Drift Report\n\n`
      if (drift.mismatches.length > 0) {
        md += `### Mismatches\n`
        drift.mismatches.forEach((m) => {
          md += `- **${m.title}**: expected "${m.expected}", got "${m.actual}"\n`
        })
      }
      if (drift.missing.length > 0) {
        md += `### Missing\n`
        drift.missing.forEach((m) => {
          md += `- ${m.title} (${m.action})\n`
        })
      }
    }

    return md
  }, [state, drift, stateLoading, driftLoading, stateError])

  const handleBootstrapAndSync = async () => {
    showToast({ style: Toast.Style.Animated, title: "Orchestrating...", message: "Running full bootstrap" })
    try {
      const result: OrchestratedResult = await api.bootstrapAndSync()
      if (result.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Orchestration complete",
          message: `${result.branches?.created ?? 0} branches created`,
        })
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Orchestration failed",
          message: result.errors.join("; "),
        })
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Orchestration error",
        message: String(error),
      })
    }
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={stateLoading || driftLoading}
      actions={
        <ActionPanel>
          <Action
            title="Run Full Orchestration"
            onAction={handleBootstrapAndSync}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          />
          <Action.Open
            title="Open in Finder"
            target={terminal.getRepoRoot()}
            application="Finder"
          />
        </ActionPanel>
      }
    />
  )
}
