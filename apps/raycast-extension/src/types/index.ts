// Shared TypeScript types for Raycast extension + Supervisor

export interface TreeState {
  treeId: string
  name: string
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

export interface ResearchResult {
  topic: string
  bestPractices: string[]
  antiPatterns: string[]
  gotchas: Array<{ condition: string; mitigation: string }>
  risks: Array<{ risk: string; severity: string; mitigation: string }>
  recommendations: string[]
}
