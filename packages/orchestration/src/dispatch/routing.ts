import { AgentType, RoutingMatrix } from '../types/agent.js';

/**
 * Explicit routing matrix for supervisor dispatch
 */
export const routingMatrix: RoutingMatrix = {
  routes: new Map([
    // Supervisor orchestration
    ['orchestrate', ['planner']],
    
    // Planner fan-out: all specialists in parallel
    ['plan', [
      'researcher',
      'tree',
      'worktree',
      'raycast',
      'inference',
      'manifest',
      'terminal',
    ]],

    // Individual specialist routes
    ['research', ['researcher']],
    ['explore-tree', ['tree']],
    ['manage-worktree', ['worktree']],
    ['sync-raycast', ['raycast']],
    ['route-inference', ['inference']],
    ['update-manifest', ['manifest']],
    ['exec-terminal', ['terminal']],
  ]),

  dependencies: new Map([
    // Supervisor depends on Planner completing first
    ['supervisor', ['planner']],
    
    // Planner has no dependencies; all others are parallel
    ['planner', []],
    ['researcher', []],
    ['tree', []],
    ['worktree', []],
    ['raycast', []],
    ['inference', []],
    ['manifest', []],
    ['terminal', []],
  ]),

  parallelizable: new Set([
    'researcher',
    'tree',
    'worktree',
    'raycast',
    'inference',
    'manifest',
    'terminal',
  ]),
};

/**
 * Validate routing matrix at startup
 */
export function validateRoutingMatrix(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for cycles
  const visited = new Set<AgentType>();
  const rec = new Set<AgentType>();

  function hasCycle(agent: AgentType): boolean {
    if (rec.has(agent)) return true;
    if (visited.has(agent)) return false;

    visited.add(agent);
    rec.add(agent);

    const deps = routingMatrix.dependencies.get(agent) || [];
    for (const dep of deps) {
      if (hasCycle(dep)) return true;
    }

    rec.delete(agent);
    return false;
  }

  const allAgents: AgentType[] = [
    'supervisor',
    'researcher',
    'planner',
    'tree',
    'worktree',
    'raycast',
    'inference',
    'manifest',
    'terminal',
  ];

  for (const agent of allAgents) {
    if (hasCycle(agent)) {
      errors.push(`Circular dependency detected: ${agent}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get execution plan for a task
 */
export function getExecutionPlan(taskType: string): {
  sequence: AgentType[][];
  dependencies: Map<AgentType, AgentType[]>;
} {
  const routes = routingMatrix.routes.get(taskType) || [];
  const parallelizable = routingMatrix.parallelizable;

  // Group into execution stages
  const stages: AgentType[][] = [];
  const processed = new Set<AgentType>();

  for (const agent of routes) {
    if (processed.has(agent)) continue;

    if (parallelizable.has(agent)) {
      // Collect all parallelizable agents in this stage
      if (!stages[stages.length - 1]) {
        stages.push([]);
      }
      stages[stages.length - 1]!.push(agent);
      processed.add(agent);
    } else {
      // Non-parallelizable agents get their own stage
      stages.push([agent]);
      processed.add(agent);
    }
  }

  return {
    sequence: stages,
    dependencies: routingMatrix.dependencies,
  };
}
