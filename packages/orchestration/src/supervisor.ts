/**
 * Supervisor Agent: The central coordinator for the 9-agent system
 * Manages task routing, session state, and result synthesis
 */

import { ProviderRouter, ProviderConfig } from './routing/provider-router.js';
import { SessionBridge } from './session/bridge.js';
import { TerminalAgent } from './agents/terminal-agent.js';
import { ResearcherAgent } from './agents/researcher-agent.js';
import type { AgentTask, AgentResult } from '../types/agent.js';

export interface SupervisorConfig {
  sessionId: string;
  chatId: string;
  providers: ProviderConfig[];
}

export class Supervisor {
  private router: ProviderRouter;
  private bridge: SessionBridge;
  private terminal: TerminalAgent;
  private researcher: ResearcherAgent;

  constructor(config: SupervisorConfig) {
    this.router = new ProviderRouter(config.providers);
    this.bridge = new SessionBridge(config.sessionId, config.chatId);
    this.terminal = new TerminalAgent();
    this.researcher = new ResearcherAgent();
  }

  /**
   * Main entry point for task orchestration
   */
  async orchestrate(task: AgentTask): Promise<AgentResult> {
    // 1. Log user request to session
    this.bridge.appendMessage('claude', 'user', task.description || '', { taskId: task.id });

    try {
      // 2. Route to appropriate agent or provider
      let result: AgentResult;

      if (task.agentType === 'terminal') {
        result = await this.terminal.execute(task);
      } else if (task.agentType === 'researcher') {
        result = await this.researcher.execute(task);
      } else {
        // Default: Route to LLM provider via Router
        const response = await this.router.route({
          task,
          urgency: (task.metadata as any)?.urgency || 'medium',
          requiresWeb: (task.metadata as any)?.requiresWeb || false,
          requiresCode: (task.metadata as any)?.requiresCode || false,
        });

        result = {
          taskId: task.id,
          agentType: 'supervisor',
          status: 'success',
          output: response.output,
          metadata: {
            provider: response.provider,
            latency: response.metadata.latency,
            model: response.metadata.model,
          },
        };
      }

      // 3. Log assistant response to session
      const provider = (result.metadata as any)?.provider || 'claude';
      this.bridge.appendMessage(provider, 'assistant', result.output as string, { taskId: task.id });

      return result;
    } catch (err) {
      return {
        taskId: task.id,
        agentType: 'supervisor',
        status: 'failed',
        error: {
          code: 'SUPERVISOR_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }
  }

  /**
   * Sync session state to a specific provider (e.g. for replay)
   */
  async syncSession(provider: string) {
    const transcript = this.bridge.getNormalizedTranscript();
    // Implementation for provider-specific sync (e.g. Claude context window)
    return transcript;
  }

  dispose() {
    this.bridge.close();
  }
}

export const createSupervisor = (config: SupervisorConfig) => new Supervisor(config);
