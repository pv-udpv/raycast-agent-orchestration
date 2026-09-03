/**
 * Master Workload Orchestrator
 * Demonstrates full end-to-end orchestration:
 * - Fan-out: Dispatch tasks to 9 agents in parallel
 * - Agent execution: Each worktree executes its task
 * - Fan-in: Collect results, synthesize findings
 * - Export: Generate manifest, push to GitHub
 */

import { Supervisor } from './supervisor.js';
import { ProviderRouter } from './routing/provider-router.js';
import { SessionBridge } from './session/bridge.js';
import { AgentDispatcher } from './subagents/integration-index.js';
import type { ProviderConfig } from './routing/provider-router.js';
import type { AgentTask } from './types/agent.js';

interface WorkloadConfig {
  workloadId: string;
  workloadName: string;
  topics: string[];
  parallelism: number;
  timeout: number;
}

interface WorkloadResult {
  workloadId: string;
  totalTasks: number;
  succeededTasks: number;
  failedTasks: number;
  duration: number;
  results: Map<string, unknown>;
  errors: Map<string, string>;
}

async function orchestrateWorkload(config: WorkloadConfig): Promise<WorkloadResult> {
  console.log(`\n🎯 Master Workload Orchestrator\n`);
  console.log(`   Workload: ${config.workloadName}`);
  console.log(`   ID: ${config.workloadId}`);
  console.log(`   Topics: ${config.topics.length}`);
  console.log(`   Parallelism: ${config.parallelism}\n`);

  const startTime = Date.now();
  const result: WorkloadResult = {
    workloadId: config.workloadId,
    totalTasks: config.topics.length,
    succeededTasks: 0,
    failedTasks: 0,
    duration: 0,
    results: new Map(),
    errors: new Map(),
  };

  // Initialize supervisor
  const sessionId = `workload-${config.workloadId}`;
  const chatId = `orchestration-${Date.now()}`;

  const providers: ProviderConfig[] = [
    {
      name: 'pplx-mlx',
      baseUrl: 'http://100.77.133.10:49320',
      timeout: 30000,
      healthCheckUrl: 'http://100.77.133.10:49320/health',
      priority: 0,
      enabled: true,
    },
    {
      name: 'claude',
      baseUrl: 'https://api.anthropic.com',
      timeout: 60000,
      priority: 1,
      enabled: true,
    },
    {
      name: 'comet',
      baseUrl: 'https://comet.api',
      timeout: 60000,
      priority: 2,
      enabled: true,
    },
    {
      name: 'codex',
      baseUrl: 'https://codex.api',
      timeout: 60000,
      priority: 3,
      enabled: true,
    },
  ];

  const supervisor = new Supervisor({
    sessionId,
    chatId,
    providers,
  });

  console.log(`📡 Provider Router State`);
  const routerState = supervisor['router'].getRoutingState();
  for (const provider of routerState.providers) {
    const icon = provider.healthy ? '✅' : '❌';
    console.log(`   ${icon} ${provider.name} (priority: ${provider.priority})`);
  }
  console.log();

  // Create tasks
  console.log(`📋 Creating ${config.topics.length} research tasks...\n`);
  const tasks: AgentTask[] = config.topics.map((topic, idx) => ({
    id: `task-${idx + 1}`,
    agentType: 'researcher',
    description: `Research and analyze: ${topic}`,
    input: {
      topics: [topic],
      outputBranch: `docs/research`,
    },
    metadata: {
      priority: 'high',
      urgency: 'high',
      requiresWeb: idx % 2 === 0,
    },
  }));

  // Fan-out: Dispatch tasks in parallel (respecting parallelism limit)
  console.log(`🚀 Dispatching tasks (parallelism: ${config.parallelism})...\n`);

  const executeInBatches = async (
    tasks: AgentTask[],
    batchSize: number
  ): Promise<Map<string, unknown>> => {
    const results = new Map<string, unknown>();

    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      console.log(`   Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tasks.length / batchSize)}: ${batch.length} tasks`);

      const batchResults = await Promise.allSettled(
        batch.map(async (task) => {
          const taskStart = Date.now();
          try {
            const taskResult = await supervisor.orchestrate(task);
            const taskDuration = Date.now() - taskStart;

            if (taskResult.status === 'success') {
              result.succeededTasks++;
              results.set(task.id, {
                status: 'success',
                duration: taskDuration,
                output: taskResult.output,
              });
              console.log(`      ✅ ${task.id} (${taskDuration}ms)`);
            } else {
              result.failedTasks++;
              result.errors.set(task.id, taskResult.error?.message || 'Unknown error');
              console.log(`      ❌ ${task.id}: ${taskResult.error?.message}`);
            }
          } catch (err) {
            result.failedTasks++;
            const errMsg = err instanceof Error ? err.message : String(err);
            result.errors.set(task.id, errMsg);
            console.log(`      ❌ ${task.id}: ${errMsg}`);
          }
        })
      );
    }

    return results;
  };

  result.results = await executeInBatches(tasks, config.parallelism);

  console.log();

  // Collect metrics
  result.duration = Date.now() - startTime;

  // Fan-in: Synthesize results
  console.log(`📊 Workload Summary\n`);
  console.log(`   Total Tasks:      ${result.totalTasks}`);
  console.log(`   Succeeded:        ${result.succeededTasks} ✅`);
  console.log(`   Failed:           ${result.failedTasks} ❌`);
  console.log(`   Success Rate:     ${((result.succeededTasks / result.totalTasks) * 100).toFixed(1)}%`);
  console.log(`   Duration:         ${result.duration}ms`);
  console.log(`   Throughput:       ${(result.totalTasks / (result.duration / 1000)).toFixed(2)} tasks/sec\n`);

  // Session state
  const sessionState = supervisor['bridge'].getState();
  console.log(`💾 Session State\n`);
  console.log(`   Session ID:       ${sessionState.sessionId}`);
  console.log(`   Chat ID:          ${sessionState.chatId}`);
  console.log(`   Messages:         ${sessionState.messageCount}`);
  console.log(`   Last Provider:    ${sessionState.lastProvider}`);
  console.log(`   Created:          ${sessionState.createdAt}`);
  console.log(`   Updated:          ${sessionState.updatedAt}\n`);

  // Report errors
  if (result.errors.size > 0) {
    console.log(`⚠️  Errors\n`);
    for (const [taskId, error] of result.errors) {
      console.log(`   ${taskId}: ${error}`);
    }
    console.log();
  }

  supervisor.dispose();

  return result;
}

// Demo workload
async function runMasterOrchestration() {
  const workloadConfig: WorkloadConfig = {
    workloadId: `master-${Date.now()}`,
    workloadName: 'Raycast Agent Orchestration Research',
    topics: [
      'git-worktree patterns and isolation',
      'zbst.tech subagent orchestration',
      'local inference routing and fallback',
      'Raycast extension integration',
      'worker agent durable state',
      'terminal automation safety',
      'manifest versioning and exports',
      'performance comparison matrix',
      'lessons learned and synthesis',
    ],
    parallelism: 3, // 3 tasks in parallel
    timeout: 30000,
  };

  try {
    const result = await orchestrateWorkload(workloadConfig);

    console.log(`✨ Workload orchestration complete!\n`);
    console.log(`📈 Final Metrics`);
    console.log(`   Workload ID:      ${result.workloadId}`);
    console.log(`   Total Throughput: ${(result.totalTasks / (result.duration / 1000)).toFixed(2)} tasks/sec`);
    console.log(`   Avg Latency:      ${(result.duration / result.totalTasks).toFixed(0)}ms/task`);
    console.log(`   Reliability:      ${((result.succeededTasks / result.totalTasks) * 100).toFixed(1)}%\n`);

    process.exit(result.failedTasks > 0 ? 1 : 0);
  } catch (err) {
    console.error(`❌ Orchestration failed:`, err);
    process.exit(1);
  }
}

runMasterOrchestration();
