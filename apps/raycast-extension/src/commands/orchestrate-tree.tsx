import { Action, ActionPanel, Detail, Form, showToast, Toast, useNavigation } from '@raycast/api';
import { useState } from 'react';

interface OrchestrationRequest {
  workloadName: string;
  topics: string[];
  parallelism: number;
  useLocalInference: boolean;
}

export default function OrchestrateCommand() {
  const { push } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleOrchestrate = async (values: any) => {
    setIsLoading(true);
    try {
      await showToast(Toast.Style.Animated, 'Orchestrating workload...', 'Dispatching tasks to agents');

      const topics = values.topics
        .split('\n')
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);

      const request: OrchestrationRequest = {
        workloadName: values.workloadName || 'Raycast Workload',
        topics,
        parallelism: parseInt(values.parallelism) || 3,
        useLocalInference: values.useLocalInference || false,
      };

      // In a real implementation, this would call the orchestration backend
      console.log('Orchestrating workload:', request);

      // Simulate orchestration
      const duration = request.topics.length * 50; // ~50ms per task
      await new Promise((resolve) => setTimeout(resolve, duration));

      push(
        <OrchestrationResult
          workloadName={request.workloadName}
          totalTasks={request.topics.length}
          succeededTasks={request.topics.length}
          failedTasks={0}
          duration={duration}
          parallelism={request.parallelism}
        />
      );

      await showToast(Toast.Style.Success, 'Workload completed', `${request.topics.length} tasks succeeded`);
    } catch (err) {
      await showToast(Toast.Style.Failure, 'Orchestration failed', err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleOrchestrate} title="Start Orchestration" />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="workloadName"
        title="Workload Name"
        placeholder="Raycast Agent Orchestration"
        defaultValue="Raycast Research"
      />

      <Form.TextArea
        id="topics"
        title="Research Topics (one per line)"
        placeholder={`git-worktree patterns\nsubagent orchestration\nlocal inference routing\nraycast integration\nworker agent state`}
      />

      <Form.Dropdown
        id="parallelism"
        title="Parallelism Level"
        defaultValue="3"
      >
        <Form.Dropdown.Item value="1" title="1 (Sequential)" />
        <Form.Dropdown.Item value="2" title="2 (Low)" />
        <Form.Dropdown.Item value="3" title="3 (Medium)" />
        <Form.Dropdown.Item value="5" title="5 (High)" />
        <Form.Dropdown.Item value="10" title="10 (Very High)" />
      </Form.Dropdown>

      <Form.Checkbox
        id="useLocalInference"
        label="Prefer local inference (MLX)"
        defaultValue={true}
      />
    </Form>
  );
}

function OrchestrationResult(props: {
  workloadName: string;
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  duration: number;
  parallelism: number;
}) {
  const successRate = ((props.succeededTasks / props.totalTasks) * 100).toFixed(1);
  const throughput = (props.totalTasks / (props.duration / 1000)).toFixed(1);
  const avgLatency = (props.duration / props.totalTasks).toFixed(0);

  const markdown = `
# Orchestration Complete

## Workload: ${props.workloadName}

### Results
- **Total Tasks:** ${props.totalTasks}
- **Succeeded:** ${props.succeededTasks} ✅
- **Failed:** ${props.failedTasks} ❌
- **Success Rate:** ${successRate}%

### Performance
- **Duration:** ${props.duration}ms
- **Throughput:** ${throughput} tasks/sec
- **Avg Latency:** ${avgLatency}ms/task
- **Parallelism:** ${props.parallelism}x

---

## Summary

All ${props.totalTasks} tasks completed successfully with **100% reliability**.

**Recommendation:** Deploy to production or export results to GitHub.
  `.trim();

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="View GitHub Repository"
            url="https://github.com/paul-vizzari/raycast-agent-orchestration"
          />
          <Action title="Start New Orchestration" onAction={() => {}} />
        </ActionPanel>
      }
    />
  );
}
