// Shared TypeScript types for Raycast extension + Supervisor

// Type-only re-export: single source of truth, erased at build time.
import type { ExecutionTarget } from "../../../../packages/backend/src/execution-target"
export type {
  Boundary,
  ExecutionTarget,
  ExecutionTargetSpec,
  Runtime,
  Substrate,
  Supervisor,
  VirtualizationProvider,
} from "../../../../packages/backend/src/execution-target"

export interface TreeState {
  treeId: string
  name: string
  executionTarget: ExecutionTarget
  rootId?: string
  folderId?: string
  nodes: Record<string, TreeNode>
  createdAt: string
  updatedAt: string
}

export interface TreeNode {
  id: string
  title: string
  prefix: string
  type: "folder" | "root" | "branch" | "note"
  parentId: string | null
  children: string[]
  chatId?: string
  folderId?: string
  done: boolean
}

export interface BranchPlan {
  root: string
  /** Research evidence used to produce this plan; older stored plans may omit it. */
  research?: ResearchResult[]
  branches: Array<{
    prefix: string
    title: string
    owner?: string
    dependencies: string[]
  }>
}

export interface Chat {
  chatId: string
  title: string
  folderId?: string
  parentChatId?: string
  createdAt: string
  updatedAt: string
}

export interface Folder {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface ChatTree {
  root?: Chat
  branches: Chat[]
  folder?: Folder
}

export interface BranchCreationResult {
  created: number
  skipped: number
  failed: number
  details: Array<{
    title: string
    status: "created" | "skipped" | "failed"
    reason?: string
  }>
}

export interface ManifestExport {
  tree_json: object
  tree_md: string
  checklist_md: string
}

export interface DriftReport {
  matches: string[]
  mismatches: Array<{
    title: string
    expected: string
    actual: string
    action: string
  }>
  missing: Array<{
    title: string
    action: string
  }>
  extra: string[]
}

export interface OrchestratedResult {
  success: boolean
  plan?: BranchPlan
  tree?: TreeState
  branches?: BranchCreationResult
  manifest?: ManifestExport
  drift?: DriftReport
  errors: string[]
}

export type ResearchEvidenceStatus = "verified" | "streaming-smoke-tested" | "incomplete" | "unverified"

export interface ResearchEvidence {
  status: ResearchEvidenceStatus
  /** Exact source URLs or artifact references supporting the report. */
  sources: string[]
  /** Repository revision or artifact digest actually inspected/tested; state explicitly when unknown. */
  testedCodeVersion: string
  /** Exact commands actually run. Use an explicit unavailable note rather than inventing commands. */
  commands: string[]
  expectedEvents: string[]
  observedEvents: string[]
  /** Compatibility claims must not exceed the evidence status. */
  compatibility: string
}

export interface ResearchResult {
  topic: string
  evidence: ResearchEvidence
  bestPractices: string[]
  antiPatterns: string[]
  gotchas: Array<{ condition: string; mitigation: string }>
  risks: Array<{ risk: string; severity: string; mitigation: string }>
  recommendations: string[]
}
