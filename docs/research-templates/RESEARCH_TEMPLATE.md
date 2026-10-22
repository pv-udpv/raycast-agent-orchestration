# Research Report: {TOPIC}

**Branch:** `NN-{topic}`  
**Date:** {DATE}  
**Researcher:** Researcher Agent  
**Status:** complete | in-progress | blocked
**Evidence status:** verified | streaming-smoke-tested | incomplete | unverified
**Compatibility claim:** {must not exceed the evidence status}

---

## Evidence Record (required)

- **Sources:** {URLs and/or repository artifact paths; include title/version where available}
- **Tested code version:** {commit, tag, or artifact SHA-256; explicitly say `not established` if unknown}
- **Exact commands run:** {copy/paste commands; distinguish commands actually run from proposed reproduction commands}
- **Expected events:** {protocol-level event names/results}
- **Observed events:** {only events captured in the run; include log/artifact references}
- **Evidence status:** {verified | streaming-smoke-tested | incomplete | unverified}
- **Compatibility status:** {bounded claim; never infer full compatibility from a smoke test}

A report may not be marked `verified` if any required evidence field is missing. If historical commands or artifacts are unavailable, say so and keep the result `incomplete` or `streaming-smoke-tested` as appropriate.

---

## Executive Summary

{One paragraph summary}

---

## Best Practices

### 1. {Practice}
- **Description:** 
- **Why it matters:** 
- **How we apply it:** 

---

## Anti-Patterns

### 1. {Anti-pattern}
- **Description:** 
- **Why to avoid:** 
- **Impact if ignored:** 

---

## Gotchas & Edge Cases

| Gotcha | Trigger | Mitigation |
|--------|---------|-----------|
| {gotcha} | when {condition} | {mitigation} |

---

## Risk Register

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|-----------|
| {risk} | high/med/low | high/med/low | {mitigation} |

---

## Recommendations

### Primary Recommendation
{Clear, actionable recommendation}

---

## References

* [Link 1: Title, version/date, relevant section]
* [Link 2: Title, version/date, relevant section]

## Reproduction Record

### Commands actually run

```sh
{exact commands, or an explicit statement that they were not retained}
```

### Expected events/results

* {event/result}

### Observed events/results

* {event/result plus log/artifact reference}

---

**Artifacts:** 
- `{topic}-decision-matrix.json`
- `{topic}-checklist.md`
