import { test } from "node:test"
import assert from "node:assert/strict"
import { researchTopic, researchTopics } from "../src/researchers/researcher.ts"
import { HttpError, parsePlanInput } from "../src/validation.ts"
import { planBranches } from "../src/planners/planner.ts"

test("static Responses API guidance is not represented as verification", () => {
  const result = researchTopic("openai-responses-streaming")
  assert.equal(result.topic, "openai-responses-streaming")
  assert.equal(result.evidence.status, "unverified")
  assert.equal(result.evidence.testedCodeVersion, "not established")
  assert.match(result.evidence.compatibility, /not assessed/i)
  assert.ok(result.recommendations.some((item) => /real Responses\/Codex client/i.test(item)))
})

test("plan input rejects research missing required evidence or with an invalid status", () => {
  assert.throws(() => parsePlanInput({ scope: "test", research: [{ topic: "x" }] }), (error) => error instanceof HttpError && error.status === 400)
  assert.throws(() => parsePlanInput({ scope: "test", research: [{ topic: "x", evidence: { status: "compatible" } }] }), (error) => error instanceof HttpError && error.status === 400)
  const evidence = {
    status: "streaming-smoke-tested",
    sources: ["https://example.invalid/spec"],
    testedCodeVersion: "sha256:abc",
    commands: ["python3 test.py"],
    expectedEvents: ["response.completed"],
    observedEvents: ["response.completed"],
    compatibility: "Streaming smoke-tested only",
  }
  assert.equal(parsePlanInput({ scope: "test", research: [{ topic: "x", evidence }] }).research?.length, 1)
  assert.throws(() => parsePlanInput({ scope: "test", research: [{ topic: "x", evidence: { status: "verified" } }] }), (error) => error instanceof HttpError && error.status === 400)
})

test("planner carries supplied research into the plan response", () => {
  const research = [researchTopic("openai-responses-streaming")]
  const plan = planBranches("test-scope", research)
  assert.deepEqual(plan.research, research)
  assert.equal(plan.research?.[0]?.evidence.status, "unverified")
})

test("unknown research topics carry explicit unverified evidence", () => {
  const result = researchTopic("not-yet-researched")
  assert.equal(result.evidence.status, "unverified")
  assert.deepEqual(result.evidence.sources, ["No source link or test artifact captured"])
  assert.deepEqual(result.evidence.commands, ["No executed command retained"])
  assert.deepEqual(result.evidence.expectedEvents, ["Not specified for this static reference entry"])
  assert.deepEqual(result.evidence.observedEvents, ["No runtime observations captured"])
})

test("live researcher uses provider citations and limits claims to cited URLs", async () => {
  let requestedUrl = ""
  let requestHeaders: HeadersInit | undefined
  let requestBody: Record<string, unknown> | undefined
  const fakeFetch: typeof fetch = async (input, init) => {
    requestedUrl = String(input)
    requestHeaders = init?.headers
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ reports: [{
        topic: "git-worktree",
        bestPractices: ["Use isolated worktrees"],
        antiPatterns: ["Delete directories without git worktree remove"],
        recommendations: ["Run git worktree list before cleanup"],
        sources: ["https://git-scm.com/docs/git-worktree", "https://invented.invalid/source"],
      }] }) } }],
      citations: ["https://git-scm.com/docs/git-worktree"],
      search_results: [{ url: "http://insecure.invalid/ignored" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })
  }
  const [result] = await researchTopics(["git-worktree"], "fake-test-key", fakeFetch)
  assert.equal(requestedUrl, "https://api.perplexity.ai/router/v1/chat/completions")
  assert.equal(new Headers(requestHeaders).get("Authorization"), "Bearer fake-test-key")
  assert.equal((requestBody?.model), "sonar-pro")
  assert.equal(result?.evidence.status, "incomplete")
  assert.deepEqual(result?.evidence.sources, ["https://git-scm.com/docs/git-worktree"])
  assert.equal(result?.evidence.testedCodeVersion, "not established; web research is not a code test")
  assert.deepEqual(result?.evidence.commands, [])
  assert.deepEqual(result?.bestPractices, ["Use isolated worktrees"])
  assert.ok(!result?.evidence.sources.some((source) => source.includes("invented")))
})

test("live researcher fails closed when the provider fails or omits citations", async () => {
  const failedFetch: typeof fetch = async () => { throw new Error("network unavailable") }
  const failed = await researchTopics(["git-worktree"], "test-key", failedFetch)
  assert.equal(failed[0]?.evidence.status, "unverified")
  assert.deepEqual(failed[0]?.bestPractices, [])

  const noCitationFetch: typeof fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ reports: [{ topic: "git-worktree", bestPractices: ["Unsupported statement"] }] }) } }],
  }), { status: 200 })
  const noCitation = await researchTopics(["git-worktree"], "test-key", noCitationFetch)
  assert.equal(noCitation[0]?.evidence.status, "unverified")
  assert.deepEqual(noCitation[0]?.bestPractices, [])
})

test("live researcher without provider credentials preserves static unverified entries", async () => {
  const results = await researchTopics(["openai-responses-streaming"], undefined)
  assert.equal(results[0]?.evidence.status, "unverified")
  assert.deepEqual(results[0]?.evidence.sources, ["No source link or test artifact captured"])
})
