/**
 * Agent execution contract
 */

export interface AgentTask {
  id: string;
  type: AgentType;
  input: Record<string, unknown>;
  metadata: {
    createdAt: string;
    parentTaskId?: string;
    priority: 'low' | 'medium' | 'high';
  };
}

export type AgentType = 
  | 'supervisor'
  | 'researcher'
  | 'planner'
  | 'tree'
  | 'worktree'
  | 'raycast'
  | 'inference'
  | 'manifest'
  | 'terminal';

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  status: 'success' | 'failed' | 'timeout';
  output?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    duration: number; // ms
    tokens?: number;
    retries: number;
  };
}

export interface RoutingMatrix {
  routes: Map<string, AgentType[]>;
  dependencies: Map<AgentType, AgentType[]>;
  parallelizable: Set<AgentType>;
}

export const AGENT_LATENCY_BUDGET: Record<AgentType, number> = {
  supervisor: 5000,
  researcher: 30000,
  planner: 10000,
  tree: 2000,
  worktree: 5000,
  raycast: 3000,
  inference: 20000,
  manifest: 3000,
  terminal: 15000,
};
