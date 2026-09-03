/**
 * Integration Index: Map agent types to implementations
 * Provides a single source of truth for agent dispatch
 */

import { TerminalAgent } from '../agents/terminal-agent.js';
import { ResearcherAgent } from '../agents/researcher-agent.js';
import type { AgentType, AgentTask, AgentResult } from '../types/agent.js';

// Import remaining stubs (they'll be created as minimal implementations)
// import { PlannerAgent } from './planner-agent.js';
// import { InferenceAgent } from './inference-agent.js';
// import { TreeAgent } from './tree-agent.js';
// import { WorktreeAgent } from './worktree-agent.js';
// import { RaycastAgent } from './raycast-agent.js';
// import { ManifestAgent } from './manifest-agent.js';
// import { SubagentsAgent } from './subagents-agent.js';

export class AgentDispatcher {
  private agents: Map<AgentType, { execute: (task: AgentTask) => Promise<AgentResult> }> =
    new Map();

  constructor() {
    // Register active agents
    this.agents.set('terminal', new TerminalAgent());
    this.agents.set('researcher', new ResearcherAgent());

    // Register stub agents (no-op for now)
    // this.agents.set('planner', new PlannerAgent());
    // this.agents.set('inference', new InferenceAgent());
    // this.agents.set('tree', new TreeAgent());
    // this.agents.set('worktree', new WorktreeAgent());
    // this.agents.set('raycast', new RaycastAgent());
    // this.agents.set('manifest', new ManifestAgent());
    // this.agents.set('subagents', new SubagentsAgent());
  }

  async dispatch(task: AgentTask): Promise<AgentResult> {
    const agent = this.agents.get(task.agentType);

    if (!agent) {
      return {
        taskId: task.id,
        agentType: task.agentType,
        status: 'failed',
        error: {
          code: 'AGENT_NOT_FOUND',
          message: `No agent registered for type: ${task.agentType}`,
        },
      };
    }

    return agent.execute(task);
  }

  registerAgent(
    type: AgentType,
    agent: { execute: (task: AgentTask) => Promise<AgentResult> }
  ): void {
    this.agents.set(type, agent);
  }

  listAgents() {
    return Array.from(this.agents.keys());
  }
}

export const dispatcher = new AgentDispatcher();
