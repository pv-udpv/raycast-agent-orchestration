// Researcher Agent: Generate research reports for given topics

export interface ResearchResult {
  topic: string
  bestPractices: string[]
  antiPatterns: string[]
  gotchas: Array<{ condition: string; mitigation: string }>
  risks: Array<{ risk: string; severity: "low" | "medium" | "high"; mitigation: string }>
  recommendations: string[]
}

const RESEARCH_DATABASE: Record<string, ResearchResult> = {
  "git-worktree": {
    topic: "git-worktree",
    bestPractices: [
      "One worktree per major branch",
      "Use wt-NN-slug naming convention",
      "Keep worktrees in dedicated directory",
    ],
    antiPatterns: [
      "Renumbering worktrees mid-project",
      "Sharing uncommitted state between worktrees",
      "Forgetting to git worktree remove",
    ],
    gotchas: [
      {
        condition: "IDE indexes all worktrees simultaneously",
        mitigation: "Exclude worktree dirs from IDE indexing",
      },
    ],
    risks: [
      {
        risk: "Branch lock from stale worktree",
        severity: "high",
        mitigation: "Automate cleanup with git worktree prune",
      },
    ],
    recommendations: [
      "Use one worktree per major branch",
      "Automate cleanup with weekly cron",
    ],
  },
  "zbst-tech-subagents": {
    topic: "zbst-tech-subagents",
    bestPractices: [
      "Supervisor + specialist pattern",
      "Explicit routing matrix",
      "Fan-out/fan-in execution",
    ],
    antiPatterns: ["Implicit routing", "Sequential execution of independent tasks"],
    gotchas: [
      {
        condition: "Subagent timeout",
        mitigation: "Set explicit timeouts; allow override",
      },
    ],
    risks: [
      {
        risk: "Routing bug sends task to wrong subagent",
        severity: "high",
        mitigation: "Pre-validate routing matrix at startup",
      },
    ],
    recommendations: [
      "Use explicit routing matrix",
      "Implement fan-out/fan-in execution",
    ],
  },
  "local-inference": {
    topic: "local-inference",
    bestPractices: [
      "Tier-based routing policy",
      "Latency budget per task",
      "Model availability registry",
    ],
    antiPatterns: ["Hard-coded local-only", "No latency budget"],
    gotchas: [
      {
        condition: "Model quantization → different outputs",
        mitigation: "Document expected diff; accept tolerance",
      },
    ],
    risks: [
      {
        risk: "Local inference unavailable",
        severity: "high",
        mitigation: "Fallback to remote",
      },
    ],
    recommendations: [
      "Implement 4-tier fallback chain",
      "Set latency budgets per task",
    ],
  },
}

export function researchTopic(topic: string): ResearchResult {
  return (
    RESEARCH_DATABASE[topic] ?? {
      topic,
      bestPractices: [],
      antiPatterns: [],
      gotchas: [],
      risks: [],
      recommendations: ["Conduct research for this topic"],
    }
  )
}
