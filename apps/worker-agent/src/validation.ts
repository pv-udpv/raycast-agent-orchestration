// Request-body guards for the supervisor HTTP routes.
// Invalid input → HttpError(400); oversized input → HttpError(413). All caps come from BUDGET.

import type { BranchPlan, ResearchResult } from "../../raycast-extension/src/types"
import type { SubagentName } from "./subagent-dispatch.ts"
import { BUDGET, LIMIT_ERROR_PREFIX } from "./limits.ts"

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Json = Record<string, unknown>

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, key: string): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `'${key}' must be a non-empty string`)
  if (value.length > BUDGET.STRING_CHARS) {
    throw new HttpError(413, `${LIMIT_ERROR_PREFIX} '${key}' exceeds ${BUDGET.STRING_CHARS} characters`)
  }
  return value
}

function boundedArray(value: unknown, key: string, max: number): unknown[] {
  if (!Array.isArray(value)) throw new HttpError(400, `'${key}' must be an array`)
  if (value.length > max) throw new HttpError(413, `${LIMIT_ERROR_PREFIX} '${key}' exceeds ${max} items`)
  return value
}

/** Read the body with a hard byte cap so an oversized upload can never be fully buffered. */
async function readBodyText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get("content-length") ?? NaN)
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new HttpError(413, `${LIMIT_ERROR_PREFIX} request body exceeds ${maxBytes} bytes`)
  }
  if (!request.body) return ""

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new HttpError(413, `${LIMIT_ERROR_PREFIX} request body exceeds ${maxBytes} bytes`)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export async function readJsonObject(request: Request): Promise<Json> {
  const text = await readBodyText(request, BUDGET.REQUEST_BODY_BYTES)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    throw new HttpError(400, "Request body must be valid JSON")
  }
  if (!isObject(body)) throw new HttpError(400, "Request body must be a JSON object")
  return body
}

export function parsePlanInput(body: Json): { scope: string; research?: ResearchResult[] } {
  const scope = boundedString(body.scope, "scope")
  if (body.research === undefined) return { scope }
  const research = boundedArray(body.research, "research", BUDGET.RESEARCH_ITEMS)
  for (const [index, item] of research.entries()) {
    if (!isObject(item)) throw new HttpError(400, `'research[${index}]' must be an object`)
    if (!isObject(item.evidence)) throw new HttpError(400, `'research[${index}].evidence' is required`)
    const evidence = item.evidence
    if (!["verified", "streaming-smoke-tested", "incomplete", "unverified"].includes(String(evidence.status))) {
      throw new HttpError(400, `'research[${index}].evidence.status' is invalid`)
    }
    for (const field of ["sources", "commands", "expectedEvents", "observedEvents"]) {
      const values = boundedArray(evidence[field], `research[${index}].evidence.${field}`, BUDGET.RESEARCH_ITEMS)
      values.forEach((value, itemIndex) => boundedString(value, `research[${index}].evidence.${field}[${itemIndex}]`))
    }
    for (const field of ["testedCodeVersion", "compatibility"]) {
      boundedString(evidence[field], `research[${index}].evidence.${field}`)
    }
  }
  return { scope, research: research as unknown as ResearchResult[] }
}

export function parseNormalizeRootInput(body: Json): { chatId: string; folderId: string; title: string } {
  return {
    chatId: boundedString(body.chatId, "chatId"),
    folderId: boundedString(body.folderId, "folderId"),
    title: boundedString(body.title, "title"),
  }
}

export function parseCreateBranchesInput(body: Json): { plan: BranchPlan } {
  const plan = body.plan
  if (!isObject(plan)) throw new HttpError(400, "'plan' must be { root: string, branches: [] }")
  boundedString(plan.root, "plan.root")
  const branches = boundedArray(plan.branches, "plan.branches", BUDGET.PLAN_BRANCHES)
  branches.forEach((branch, i) => {
    if (!isObject(branch)) throw new HttpError(400, `'plan.branches[${i}]' must be an object`)
    boundedString(branch.prefix, `plan.branches[${i}].prefix`)
    boundedString(branch.title, `plan.branches[${i}].title`)
    if (branch.dependencies !== undefined) {
      boundedArray(branch.dependencies, `plan.branches[${i}].dependencies`, BUDGET.PLAN_BRANCHES)
    }
  })
  return { plan: plan as unknown as BranchPlan }
}

export function parseSyncTreeInput(body: Json): { currentChats: unknown[] } {
  return { currentChats: boundedArray(body.currentChats, "currentChats", BUDGET.CURRENT_CHATS) }
}

const SUBAGENT_NAMES: readonly SubagentName[] = [
  "researcher", "planner", "tree", "worktree", "raycast", "inference", "manifest", "terminal",
]
const SUBAGENT_NAME_SET: ReadonlySet<string> = new Set(SUBAGENT_NAMES)

export function parseDispatchInput(body: Json): { agent: SubagentName; input: Json; dispatchId?: string } {
  const agent = boundedString(body.agent, "agent")
  if (!SUBAGENT_NAME_SET.has(agent)) throw new HttpError(400, "'agent' must name a configured subagent")
  if (!isObject(body.input)) throw new HttpError(400, "'input' must be a JSON object")
  const dispatchId = body.dispatchId === undefined ? undefined : boundedString(body.dispatchId, "dispatchId")
  return { agent: agent as SubagentName, input: body.input, dispatchId }
}
