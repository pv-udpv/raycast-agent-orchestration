import {
  Action,
  ActionPanel,
  Form,
  List,
  Toast,
  showToast,
  useNavigation,
  usePromise,
} from "@raycast/api"
import { useState } from "react"
import * as api from "../lib/api"
import { validateWorkloadScope, ValidationError } from "../lib/validation"
import type { BranchPlan } from "../types"

export default function CreateBranchPlan() {
  const { push, pop } = useNavigation()
  const [scope, setScope] = useState("ollama-launch-harness-research")

  const handleCreate = async () => {
    try {
      validateWorkloadScope(scope)
      showToast({ style: Toast.Style.Animated, title: "Generating plan..." })
      const plan = await api.plan(scope)
      push(<BranchPlanReview plan={plan} scope={scope} />)
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create plan",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Plan" onSubmit={handleCreate} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="scope"
        title="Workload Scope"
        value={scope}
        onChange={setScope}
        placeholder="e.g., ollama-launch-harness-research"
      />
    </Form>
  )
}

function BranchPlanReview({ plan, scope }: { plan: BranchPlan; scope: string }) {
  const { pop } = useNavigation()
  const [selectedIndex, setSelectedIndex] = useState(0)

  const handleExecute = async () => {
    showToast({ style: Toast.Style.Animated, title: "Creating branches..." })
    try {
      const result = await api.createBranches(plan)
      showToast({
        style: result.failed === 0 ? Toast.Style.Success : Toast.Style.Warning,
        title: "Branches created",
        message: `${result.created} created, ${result.skipped} skipped, ${result.failed} failed`,
      })
      pop()
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create branches",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <List selectedItemId={String(selectedIndex)} onSelectionChange={(id) => setSelectedIndex(parseInt(id))}>
      {plan.branches.map((branch, idx) => (
        <List.Item
          key={branch.prefix}
          id={String(idx)}
          title={`${branch.prefix} ${branch.title}`}
          subtitle={branch.dependencies.length > 0 ? `Depends on: ${branch.dependencies.join(", ")}` : ""}
          actions={
            <ActionPanel>
              <Action title="Create These Branches" onAction={handleExecute} />
              <Action title="Cancel" onAction={pop} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
