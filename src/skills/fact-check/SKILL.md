---
name: fact-check
description: Verify technical accuracy of JavaScript concept pages by checking code examples, documentation, specification compliance, external resources, and project tests before publication.
allowed-tools: Read Grep Find Edit Write Bash
version: 1.0.0
---

# JavaScript Fact Check

Use this skill when the task is to verify the factual accuracy of JavaScript educational content before publishing or approving it.

## Audit Summary

This skill had strong verification content but weak OMP skill structure:
- the main file was a long procedure document instead of a concise routing skill
- required sections such as `When NOT to Use`, `Error Handling`, `Quick Tests`, and `Related Skills` were missing
- the methodology, source lists, and report template were embedded in one large file instead of progressive-discovery references
- there was no `references/registry.json` to index deep verification material

## When to Use

Use this skill for:
- reviewing JavaScript concept pages before publication
- checking whether code examples actually produce the stated output
- validating claims against MDN, ECMAScript, Can I Use, Node.js docs, or other primary sources
- auditing external resource links for accessibility, relevance, and technical accuracy
- reviewing community or editorial changes for misinformation or outdated guidance
- producing a structured fact-check report with issues, severity, and recommended fixes

## When NOT to Use

Do not use this skill for:
- implementing new JavaScript features or fixing runtime bugs in application code
- generic code review with no documentation or educational-content scope
- non-JavaScript documentation domains
- opinion-based writing review where factual verification is not the main task
- framework-specific architecture decisions unless the task is specifically about factual correctness of the explanation

## The Iron Law

```
DO NOT APPROVE TEACHING CONTENT UNTIL THE CODE, CLAIMS, LINKS, AND TEST COVERAGE ALL AGREE
```

A page that reads well but teaches wrong behavior is not good documentation. Correctness outranks style.

## Workflow

1. Identify the target concept page, the claims it makes, and the code examples it relies on.
2. Verify every code example first. Confirm comments, outputs, control flow, async ordering, and edge-case behavior.
3. Run or inspect project tests for the concept when available, and note any documentation examples that lack test coverage.
4. Check API and behavior claims against primary sources such as MDN and, for nuanced behavior, the ECMAScript specification.
5. Audit external resources for accessibility, topic relevance, recency, and whether the linked content actually supports the page.
6. Review all absolute claims such as "always", "never", or performance comparisons for nuance, exceptions, and sourcing.
7. Produce a structured fact-check result with severity, exact locations, and concrete corrections.

## Error Handling

| Situation | Response |
|-----------|----------|
| Code example has no test coverage | Flag it and verify manually rather than assuming it is correct |
| Claim conflicts with MDN or the ECMAScript spec | Treat the page claim as incorrect until corrected or better sourced |
| External link is broken or misleading | Flag it and recommend replacement or removal |
| Performance claim lacks evidence | Mark it as needing revision or caveating rather than presenting it as fact |
| Browser behavior differs by engine or version | Require explicit scoping instead of universal language |
| A misconception is common but still wrong | Correct it directly; popularity is not evidence |

## Quick Tests

Should trigger:
- "Fact-check this JavaScript concept page before publishing"
- "Verify these JS code examples and claims"
- "Audit this documentation page for JavaScript accuracy"
- "Check these external resources and MDN links for this JS article"

Should not trigger:
- "Build this JavaScript feature"
- "Refactor this React component"
- "Write a blog post about Node.js"
- "Debug this failing API route"

Functional checks:
- verifies code examples before prose claims
- treats broken links and outdated external resources as documentation issues
- cross-checks nuanced behavior against MDN and spec sources
- flags missing test coverage instead of pretending verification is complete

## References

- `references/verification-methodology.md` — the five-phase fact-check process and what to verify in each phase
- `references/primary-sources-and-tests.md` — source hierarchy, project test expectations, and resource verification guidance
- `references/report-template.md` — structured fact-check reporting format
- `references/registry.json` — reference index for progressive discovery

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `systematic-debugging` | Root-cause investigation workflow | When a code example appears wrong and the actual runtime behavior must be traced carefully |
| `review` | General pre-landing review | When the work is broader than factual correctness of documentation |
| `verification-before-completion` | Evidence before completion claims | When the final recommendation needs explicit proof and not just editorial confidence |