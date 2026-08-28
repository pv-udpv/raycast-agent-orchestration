/**
 * Supervisor: Central orchestration coordinator
 * Dispatches tasks to agents via explicit routing matrix
 */

import { AgentTask, AgentResult, AgentType } from './types/agent.js';
import {
  routingMatrix,
  validateRoutingMatrix,
  getExecutionPlan,
} from './dispatch/routing.js';
import { researcherAgent } from './agents/researcher-agent.js';

interface SupervisorConfig {
  enableLogging: boolean;
  timeoutMs: number;
  maxRetries: number;
}

export class Supervisor {
  private config: SupervisorConfig;
  private taskLog: Map<string, AgentResult[]> = new Map();

  constructor(config: Partial<SupervisorConfig> = {}) {
    this.config = {
      enableLogging: true,
      timeoutMs: 60000,
      maxRetries: 2,
      ...config,
    };

    // Validate routing matrix at initialization
    const validation = validateRoutingMatrix();
    if (!validation.valid) {
      throw new Error(
        `Invalid routing matrix: ${validation.errors.join(', ')}`
      );
    }

    if (this.config.enableLogging) {
      console.log('[Supervisor] Initialized with validated routing matrix');
    }
  }

  /**
   * Execute a high-level task by orchestrating subagents
   */
  async execute(taskType: string, input: Record<string, unknown>) {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    if (this.config.enableLogging) {
      console.log(`[Supervisor] Dispatching task: ${taskId} (type: ${taskType})`);
    }

    // Get execution plan
    const plan = getExecutionPlan(taskType);

    if (this.config.enableLogging) {
      console.log(
        `[Supervisor] Execution plan: ${plan.sequence.length} stages`
      );
      plan.sequence.forEach((stage, i) => {
        console.log(`  Stage ${i + 1}: ${stage.join(', ')}`);
      });
    }

    const allResults: AgentResult[] = [];

    // Execute each stage sequentially, but agents within stage run in parallel
    for (let stageIdx = 0; stageIdx < plan.sequence.length; stageIdx++) {
      const stage = plan.sequence[stageIdx]!;

      if (this.config.enableLogging) {
        console.log(`[Supervisor] Executing stage ${stageIdx + 1}...`);
      }

      const stageResults = await Promise.all(
        stage.map((agentType) =>
          this.dispatchAgent(
            agentType,
            {
              id: `${taskId}-${agentType}`,
              type: agentType,
              input,
              metadata: {
                createdAt: new Date().toISOString(),
                parentTaskId: taskId,
                priority: 'high',
              },
            } as AgentTask,
            0
          )
        )
      );

      allResults.push(...stageResults);

      // Check for failures
      const failures = stageResults.filter((r) => r.status === 'failed');
      if (failures.length > 0 && this.config.enableLogging) {
        console.warn(
          `[Supervisor] Stage ${stageIdx + 1} had ${failures.length} failures`
        );
      }
    }

    if (this.config.enableLogging) {
      console.log(
        `[Supervisor] Task ${taskId} complete. Results: ${allResults.length}`
      );
    }

    this.taskLog.set(taskId, allResults);

    return {
      taskId,
      results: allResults,
      summary: {
        total: allResults.length,
        succeeded: allResults.filter((r) => r.status === 'success').length,
        failed: allResults.filter((r) => r.status === 'failed').length,
      },
    };
  }

  /**
   * Dispatch a single agent with retry logic
   */
  private async dispatchAgent(
    agentType: AgentType,
    task: AgentTask,
    attempt: number
  ): Promise<AgentResult> {
    try {
      if (this.config.enableLogging) {
        console.log(`[Supervisor] Dispatching to ${agentType} (attempt ${attempt + 1})`);
      }

      // Route to appropriate agent
      let result: AgentResult;

      switch (agentType) {
        case 'researcher':
          result = await researcherAgent.execute(task);
          break;
        default:
          result = {
            taskId: task.id,
            agentType,
            status: 'failed',
            error: {
              code: 'AGENT_NOT_IMPLEMENTED',
              message: `Agent ${agentType} not yet implemented`,
            },
            metadata: {
              duration: 0,
              retries: attempt,
            },
          };
      }

      return result;
    } catch (err) {
      // Retry logic
      if (attempt < this.config.maxRetries) {
        if (this.config.enableLogging) {
          console.warn(`[Supervisor] Retrying ${agentType}...`);
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        return this.dispatchAgent(agentType, task, attempt + 1);
      }

      return {
        taskId: task.id,
        agentType,
        status: 'failed',
        error: {
          code: 'DISPATCH_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
        metadata: {
          duration: 0,
          retries: attempt,
        },
      };
    }
  }

  /**
   * Get task log for audit trail
   */
  getTaskLog(taskId: string): AgentResult[] | null {
    return this.taskLog.get(taskId) || null;
  }
}

export const supervisor = new Supervisor({ enableLogging: true });
