import { Action, ActionPanel, Detail, Toast, showToast, usePromise } from "@raycast/api"
import * as api from "../lib/api"
import type { OrchestratedResult } from "../types"

export default function OrchestrateFull() {
  const { data: result, error, isLoading } = usePromise(
    async () => {
      showToast({
        style: Toast.Style.Animated,
        title: "Orchestrating...",
        message: "Running full bootstrap workflow",
      })
      const r = await api.bootstrapAndSync()
      if (r.success) {
        showToast({
          style: Toast.Style.Success,
          title: "Orchestration complete",
          message: `${r.branches?.created ?? 0} branches created`,
        })
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Orchestration failed",
          message: r.errors.slice(0, 2).join("; "),
        })
      }
      return r
    },
    [],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Orchestration error", message: String(err) })
      },
    }
  )

  const markdown = isLoading
    ? `# Orchestration in Progress\n\n⏳ Running bootstrap workflow...`
    : error
      ? `# Orchestration Failed\n\n❌ ${String(error)}`
      : result
        ? `# Orchestration Complete\n\n${result.success ? "✓ Success" : "✗ Failed"}\n\n` +
          `## Results\n` +
          `- Branches: ${result.branches?.created ?? 0} created, ${result.branches?.skipped ?? 0} skipped\n` +
          `- Plan: ${result.plan?.branches.length ?? 0} branches\n` +
          `- Tree: ${Object.keys(result.tree?.nodes ?? {}).length} nodes\n` +
          `${result.drift ? `- Drift: ${result.drift.mismatches.length} mismatches\n` : ""}`
        : "# Orchestration\n\nNo data"

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {result?.success && <Action title="View Result" />}
        </ActionPanel>
      }
    />
  )
}
