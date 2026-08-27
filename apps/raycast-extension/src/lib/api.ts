// Supervisor RPC client with retry + timeout

import type {
  TreeState,
  BranchPlan,
  ManifestExport,
  DriftReport,
  OrchestratedResult,
  ResearchResult,
} from "../types"
import { withRetry, withTimeout } from "./validation"

const SUPERVISOR_URL = process.env.SUPERVISOR_URL ?? "http://localhost:8787"
const DEFAULT_TIMEOUT_MS = 15000

async function rpc<T>(path: string, body?: unknown): Promise<T> {
  const response = await withTimeout(
    withRetry(() => fetch(`${SUPERVISOR_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })),
    DEFAULT_TIMEOUT_MS
  )

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`Supervisor RPC failed (${response.status}): ${text}`)
  }

  return response.json() as Promise<T>
}

export async function getTreeState(): Promise<TreeState> {
  return rpc<TreeState>("/state")
}

export async function plan(scope: string, research?: ResearchResult[]): Promise<BranchPlan> {
  return rpc<BranchPlan>("/plan", { scope, research })
}

export async function normalizeRoot(chatId: string, folderId: string, title: string): Promise<void> {
  await rpc<void>("/normalize-root", { chatId, folderId, title })
}

export async function createBranches(plan: BranchPlan): Promise<OrchestratedResult["branches"]> {
  return rpc<OrchestratedResult["branches"]>("/create-branches", { plan })
}

export async function exportManifest(): Promise<ManifestExport> {
  return rpc<ManifestExport>("/export-manifest")
}

export async function syncTree(currentChats: unknown[]): Promise<DriftReport> {
  return rpc<DriftReport>("/sync-tree", { currentChats })
}

export async function bootstrapAndSync(): Promise<OrchestratedResult> {
  return rpc<OrchestratedResult>("/bootstrap-and-sync")
}
