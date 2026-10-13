import { test } from "node:test"
import assert from "node:assert/strict"
import { researchTopic, researchTopics } from "../src/researchers/researcher.ts"

test("static Responses guidance stays explicitly unverified", () => {
  const result = researchTopic("openai-responses-streaming")
  assert.equal(result.evidence.status, "unverified")
  assert.equal(result.evidence.testedCodeVersion, "not established")
  assert.match(result.evidence.compatibility, /not assessed/i)
  assert.ok(result.recommendations.some((item) => /real Responses\/Codex client/i.test(item)))
})

test("live results include only HTTPS URLs supplied as provider citations", async () => {
  let requestUrl = ""
  const fakeFetch: typeof fetch = async (input) => {
    requestUrl = String(input)
    return new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ reports: [{ topic: "git-worktree", bestPractices: ["Use isolated worktrees"], sources: ["https://git-scm.com/docs/git-worktree", "https://invented.invalid/ignored"] }] }) } }],
      citations: ["https://git-scm.com/docs/git-worktree"],
      search_results: [{ url: "http://insecure.invalid/ignored" }],
    }), { status: 200, headers: { "Content-Type": "application/json" } })
  }
  const [result] = await researchTopics(["git-worktree"], "test-key", fakeFetch)
  assert.equal(requestUrl, "https://api.perplexity.ai/router/v1/chat/completions")
  assert.equal(result?.evidence.status, "incomplete")
  assert.deepEqual(result?.evidence.sources, ["https://git-scm.com/docs/git-worktree"])
  assert.deepEqual(result?.bestPractices, ["Use isolated worktrees"])
})

test("provider failure and citation-free responses fail closed", async () => {
  const failed = await researchTopics(["git-worktree"], "test-key", async () => { throw new Error("offline") })
  assert.equal(failed[0]?.evidence.status, "unverified")
  assert.deepEqual(failed[0]?.bestPractices, [])
  const noCitations = await researchTopics(["git-worktree"], "test-key", async () => new Response(JSON.stringify({
    choices: [{ message: { content: JSON.stringify({ reports: [{ topic: "git-worktree", bestPractices: ["unsupported"] }] }) } }],
  }), { status: 200 }))
  assert.equal(noCitations[0]?.evidence.status, "unverified")
  assert.deepEqual(noCitations[0]?.bestPractices, [])
})

test("missing credentials preserve explicitly unverified guidance", async () => {
  const results = await researchTopics(["openai-responses-streaming"], undefined)
  assert.equal(results[0]?.evidence.status, "unverified")
  assert.deepEqual(results[0]?.evidence.commands, ["No executed command retained"])
})
