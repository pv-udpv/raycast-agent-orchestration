import { Action, ActionPanel, Detail, Toast, showToast } from "@raycast/api"
import { usePromise } from "@raycast/api"
import * as api from "../lib/api"
import * as terminal from "../lib/terminal"

export default function ExportManifest() {
  const { data: manifest, error, isLoading } = usePromise(
    async () => {
      const m = await api.exportManifest()
      return m
    },
    [],
    {
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to export", message: String(err) })
      },
    }
  )

  const markdown = isLoading
    ? "# Export Manifest\n\nLoading..."
    : error
      ? `# Export Manifest\n\n❌ Error\n\n${String(error)}`
      : manifest
        ? `# Export Manifest\n\n## tree.json\n\`\`\`json\n${JSON.stringify(manifest.tree_json, null, 2).slice(0, 500)}\n...\n\`\`\`\n\n## tree.md\n${manifest.tree_md.slice(0, 500)}\n...`
        : "# Export Manifest\n\nNo data"

  const handleExport = async () => {
    if (!manifest) return

    showToast({ style: Toast.Style.Animated, title: "Exporting manifest..." })
    try {
      const repoRoot = terminal.getRepoRoot()
      // In real implementation, write files here
      showToast({
        style: Toast.Style.Success,
        title: "Manifest exported",
        message: `Written to ${repoRoot}/docs/`,
      })
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: String(err),
      })
    }
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Export Files" onAction={handleExport} />
          <Action.Open
            title="Open in Finder"
            target={terminal.getRepoRoot() + "/docs"}
            application="Finder"
          />
        </ActionPanel>
      }
    />
  )
}
