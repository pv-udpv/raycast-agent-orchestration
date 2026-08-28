// Planner Agent: Generate branch plan from scope + research

import type { BranchPlan } from "../../../raycast-extension/src/types"

export function planBranches(scope: string): BranchPlan {
  return {
    root: "00-root",
    branches: [
      {
        prefix: "10-",
        title: "git-worktree",
        owner: "infrastructure",
        dependencies: [],
      },
      {
        prefix: "20-",
        title: "zbst-tech-subagents",
        owner: "orchestration",
        dependencies: [],
      },
      {
        prefix: "30-",
        title: "local-inference",
        owner: "routing",
        dependencies: [],
      },
      {
        prefix: "40-",
        title: "raycast-integration",
        owner: "ui",
        dependencies: [],
      },
      {
        prefix: "50-",
        title: "worker-agent",
        owner: "backend",
        dependencies: [],
      },
      {
        prefix: "60-",
        title: "terminal-automation",
        owner: "ops",
        dependencies: [],
      },
      {
        prefix: "70-",
        title: "manifest-notes",
        owner: "state",
        dependencies: [],
      },
      {
        prefix: "80-",
        title: "comparison-matrix",
        owner: "decisions",
        dependencies: [],
      },
      {
        prefix: "90-",
        title: "notes-and-findings",
        owner: "scratch",
        dependencies: [],
      },
    ],
  }
}
