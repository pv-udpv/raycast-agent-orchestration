import { Action, ActionPanel, Detail, Toast, showToast, usePromise } from "@raycast/api"
import * as api from "../lib/api"
import type { DriftReport } from "../types"

export default function SyncTree() {
  const { data: drift, error, isLoading } = usePromise(
    async () => {
      // Mock: would fetch actual chat tree from Raycast + sync with supervisor
      return {
        matches: ["00-root", "10-git-worktree", "20-zbst-tech-subagents"],
        mismatches: [],
        missing: [],
        extra: [],
      } as DriftReport
    },
    [],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Sync failed", message: String(err) })
      },
    }
  )

  const markdown = isLoading
    ? "# Sync Tree\n\nScanning..."
    : error
      ? `# Sync Tree\n\n❌ Error\n\n${String(error)}`
      : drift
        ? `# Sync Report\n\n` +
          `✓ Matches: ${drift.matches.length}\n` +
          `${drift.mismatches.map((m) => `⚠ ${m.title}: expected "${m.expected}", got "${m.actual}"\n`).join("")}` +
          `${drift.missing.map((m) => `✗ Missing: ${m.title}\n`).join("")}` +
          (drift.extra.length > 0 ? `📌 Extra: ${drift.extra.join(", ")}\n` : "")
        : "# Sync Tree\n\nNo data"

  const handleFix = async () => {
    if (!drift) return
    showToast({
      style: Toast.Style.Animated,
      title: "Fixing drift...",
      message: `${drift.mismatches.length} mismatches, ${drift.missing.length} missing`,
    })
    // In real implementation, perform remediation
    showToast({ style: Toast.Style.Success, title: "Drift resolved" })
  }

  const driftCount = (drift?.mismatches?.length ?? 0) + (drift?.missing?.length ?? 0)

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {driftCount > 0 && <Action title="Fix Drift" onAction={handleFix} />}
          <Action title="Refresh" onAction={() => location.reload()} />
        </ActionPanel>
      }
    />
  )
}
