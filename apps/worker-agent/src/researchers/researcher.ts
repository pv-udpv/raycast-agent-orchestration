// Researcher Agent: Generate research reports for given topics

export type ResearchEvidenceStatus = "verified" | "streaming-smoke-tested" | "incomplete" | "unverified"

export interface ResearchEvidence {
  status: ResearchEvidenceStatus
  sources: string[]
  testedCodeVersion: string
  commands: string[]
  expectedEvents: string[]
  observedEvents: string[]
  compatibility: string
}

export interface ResearchResult {
  topic: string
  evidence: ResearchEvidence
  bestPractices: string[]
  antiPatterns: string[]
  gotchas: Array<{ condition: string; mitigation: string }>
  risks: Array<{ risk: string; severity: "low" | "medium" | "high"; mitigation: string }>
  recommendations: string[]
}

type StaticResearchEntry = Omit<ResearchResult, "evidence">

const RESEARCH_DATABASE: Record<string, StaticResearchEntry> = {
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
  "openai-responses-streaming": {
    topic: "openai-responses-streaming",
    bestPractices: [
      "Treat Responses API events as a distinct protocol; do not conflate them with Chat Completions or Anthropic Messages SSE",
      "Validate the event sequence and reconstructed output with an actual Responses client before claiming compatibility",
      "Record the tested adapter/model revision, exact command, and captured event transcript",
    ],
    antiPatterns: [
      "Claiming full Responses or Codex compatibility from a hand-written text-stream smoke test",
      "Treating response.created or HTTP 200 alone as proof of a completed response",
    ],
    gotchas: [
      { condition: "SSE framing uses literal backslash-n instead of line terminators", mitigation: "Parse the actual wire stream and assert each event boundary" },
      { condition: "Tool-call streaming or stateful/multimodal inputs are not exercised", mitigation: "List each unsupported/unverified feature and keep compatibility claims bounded" },
    ],
    risks: [
      { risk: "Client rejects an incomplete or malformed Responses event sequence", severity: "high", mitigation: "Run a real Responses/Codex client integration test and retain its transcript" },
    ],
    recommendations: [
      "Report the existing text-only result as streaming-smoke-tested until real Responses/Codex client validation is retained",
      "Test text and function-call streaming separately; do not imply previous_response_id or multimodal support without tests",
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

const UNVERIFIED_EVIDENCE: ResearchEvidence = {
  status: "unverified",
  sources: ["No source link or test artifact captured"],
  testedCodeVersion: "not established",
  commands: ["No executed command retained"],
  expectedEvents: ["Not specified for this static reference entry"],
  observedEvents: ["No runtime observations captured"],
  compatibility: "Not assessed; static guidance is not verification.",
}

/** Static reference entries are guidance only until populated with traceable evidence. */
export function researchTopic(topic: string): ResearchResult {
  const entry = RESEARCH_DATABASE[topic]
  return entry
    ? { ...entry, evidence: { ...UNVERIFIED_EVIDENCE } }
    : {
        topic,
        evidence: { ...UNVERIFIED_EVIDENCE },
        bestPractices: [],
        antiPatterns: [],
        gotchas: [],
        risks: [],
        recommendations: ["Conduct research and attach source/test evidence before making claims"],
      }
}

const PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/router/v1/chat/completions"
const MAX_LIVE_ITEMS = 8
const MAX_LIVE_TEXT = 256
const LIVE_TIMEOUT_MS = 20_000

interface ProviderReport {
  topic?: unknown
  bestPractices?: unknown
  antiPatterns?: unknown
  gotchas?: unknown
  risks?: unknown
  recommendations?: unknown
  sources?: unknown
}

interface ProviderResponse {
  choices?: Array<{ message?: { content?: unknown; citations?: unknown } }>
  citations?: unknown
  search_results?: unknown
}

const TOPIC_PROMPTS: Record<string, string> = {
  "git-worktree": "Compare safe Git worktree isolation and lifecycle practices; distinguish Git guarantees from workflow recommendations.",
  "zbst-tech-subagents": "Research practical subagent orchestration and handoff patterns; distinguish documented SDK behavior from design advice.",
  "openai-responses-streaming": "Research OpenAI Responses API streaming and real Codex-client compatibility. Keep it distinct from Chat Completions and Anthropic Messages SSE; do not overclaim compatibility.",
  "local-inference": "Research local inference routing and provider behavior. Do not assert models, latency, prices, or compatibility without cited evidence.",
  "raycast-integration": "Research Raycast extension integration and current documented APIs; separate platform constraints from architectural suggestions.",
  "worker-agent": "Research Cloudflare Workers/Agents SDK constraints relevant to agent orchestration; cite current official documentation where possible.",
  "terminal-automation": "Research safe, auditable terminal automation and process orchestration for developer tooling.",
  "manifest-notes": "Research durable, machine-readable agent manifests and evidence/provenance practices.",
}

function urlsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.flatMap((item) => {
    const candidate = typeof item === "string" ? item :
      item && typeof item === "object" && "url" in item ? String((item as { url: unknown }).url) : ""
    try {
      const parsed = new URL(candidate)
      return parsed.protocol === "https:" ? [parsed.toString().slice(0, MAX_LIVE_TEXT)] : []
    } catch {
      return []
    }
  }))].slice(0, MAX_LIVE_ITEMS)
}

function boundedTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === "string" && !!item.trim())
    .slice(0, MAX_LIVE_ITEMS).map((item) => item.trim().slice(0, MAX_LIVE_TEXT))
}

function makeLiveReport(topic: string, report: ProviderReport | undefined, citedUrls: string[]): ResearchResult {
  const allowedSources = new Set(citedUrls)
  const sources = urlsFrom(report?.sources).filter((url) => allowedSources.has(url)).slice(0, MAX_LIVE_ITEMS)
  const hasCitations = sources.length > 0
  const result = researchTopic(topic)
  const status: ResearchEvidenceStatus = hasCitations ? "incomplete" : "unverified"
  const why = hasCitations
    ? "Live web research returned provider citations; findings are not independently verified and require review."
    : "Live research returned no attributable citations; findings are not presented as verified."
  return {
    ...result,
    bestPractices: hasCitations ? boundedTextList(report?.bestPractices) : [],
    antiPatterns: hasCitations ? boundedTextList(report?.antiPatterns) : [],
    gotchas: [],
    risks: [],
    recommendations: hasCitations ? boundedTextList(report?.recommendations) : ["Review cited sources and validate claims before acting"],
    evidence: {
      status,
      sources,
      testedCodeVersion: "not established; web research is not a code test",
      commands: [],
      expectedEvents: [],
      observedEvents: [],
      compatibility: why,
    },
  }
}

/** One bounded provider request researches all requested topics; without a key, retain explicitly unverified guidance. */
export async function researchTopics(
  topics: string[],
  apiKey: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<ResearchResult[]> {
  if (!apiKey?.trim()) return topics.map(researchTopic)
  const uniqueTopics = [...new Set(topics)].slice(0, MAX_LIVE_ITEMS)
  const signal = AbortSignal.timeout(LIVE_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetchImpl(PERPLEXITY_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        model: "sonar-pro",
        temperature: 0.1,
        messages: [
          { role: "system", content: "Research each topic using web search. Return only a JSON object with a reports array. Each report must have topic, bestPractices, antiPatterns, recommendations, and sources (URLs). Only cite URLs actually consulted; do not invent URLs. Keep claims concise, qualify uncertainty, and never claim code was tested." },
          { role: "user", content: JSON.stringify({ topics: uniqueTopics.map((topic) => ({ topic, research_question: TOPIC_PROMPTS[topic] ?? `Research ${topic} with reliable sources and state uncertainty.` })) }) },
        ],
      }),
    })
  } catch {
    return uniqueTopics.map((topic) => makeLiveReport(topic, undefined, []))
  }

  if (!response.ok) return uniqueTopics.map((topic) => makeLiveReport(topic, undefined, []))
  let payload: ProviderResponse
  try {
    payload = await response.json() as ProviderResponse
  } catch {
    return uniqueTopics.map((topic) => makeLiveReport(topic, undefined, []))
  }
  const rawContent = payload.choices?.[0]?.message?.content
  let parsedReports: ProviderReport[] = []
  if (typeof rawContent === "string") {
    try {
      const parsed: unknown = JSON.parse(rawContent)
      if (parsed && typeof parsed === "object" && "reports" in parsed && Array.isArray((parsed as { reports: unknown }).reports)) {
        parsedReports = (parsed as { reports: ProviderReport[] }).reports
      }
    } catch {
      // Ignore malformed generated JSON. Citation-backed output is required to populate findings.
    }
  }
  const messageCitations = payload.choices?.[0]?.message?.citations
  const citedUrls = urlsFrom([...(Array.isArray(payload.citations) ? payload.citations : []), ...(Array.isArray(payload.search_results) ? payload.search_results : []), ...(Array.isArray(messageCitations) ? messageCitations : [])])
  const byTopic = new Map(parsedReports.filter((r) => typeof r.topic === "string").map((r) => [r.topic as string, r]))
  return uniqueTopics.map((topic) => makeLiveReport(topic, byTopic.get(topic), citedUrls))
}
