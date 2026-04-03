---
name: review
description: Pre-landing code review for changed work. Finds structural, security, and maintainability issues that tests often miss, and keeps findings tied to Beads work when review belongs to tracked delivery.
allowed-tools: Read Grep Find Edit Bash LSP
version: "2.1.0"
---

# Review

Pre-landing review catches the problems that compile, pass tests, and still ship defects.

Use this skill for review work, not implementation. If you discover bugs you can safely fix during review, make the smallest truthful fix and keep the review trail explicit.

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "review this" | Review the current diff before merge |
| "code review" | Run CRITICAL then INFORMATIONAL passes |
| "review my changes" | Inspect scope, risks, and gaps |
| "security review" | Bias toward trust boundaries and failure modes |
| "pre-landing review" | Produce merge-readiness findings |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "fix this bug" | `systematic-debugging` |
| "write tests" | `test-driven-development` |
| "update docs" | `release-notes` or direct docs work |
| "design the feature" | `brainstorm` or product/design workflow |

## Workflow

### 1. Establish truthful scope

1. Identify the review base branch and changed files.
2. Read the issue/PR description if present.
3. If the change belongs to a Beads item, start with `bd show <id>` so the review checks the real acceptance intent, not a guessed one.

### 2. Check scope integrity before code quality

Look for drift before line-by-line review:
- unrelated files included in the diff
- acceptance criteria not addressed
- extra features slipped in without decision trace
- risky governance-sensitive edits without ownership clarity

### 3. Run the CRITICAL pass

Block on issues that can ship incidents:
- trust-boundary validation failures
- injection or unsafe command/query construction
- race conditions and shared-state hazards
- broken invariants, partial enum handling, silent defaults
- missing failure-path handling for high-risk changes

### 4. Run the INFORMATIONAL pass

Then review for quality and maintenance cost:
- hidden side effects or surprising control flow
- dead code and compatibility debris
- magic constants or repeated logic
- naming that hides intent
- missing tests for important error paths or regressions
- frontend gaps such as accessibility or responsive regressions

### 5. Produce findings with action

Classify each finding explicitly:
- **must-fix** — merge blocker
- **should-fix** — strong recommendation before merge
- **note** — non-blocking observation
- **auto-fix** — safe local correction performed during review

## Tracking in Beads

When review belongs to a Beads work item:
1. Read the item first with `bd show <id>`.
2. Add concise findings or verdict notes back to the item.
3. Do not mark the item done from review alone; implementation and verification still own closure.

Use `todo_write`, not Beads, for a one-off single-session review with no persistence value.

## Error Handling

| Situation | Response |
|-----------|----------|
| Diff is too large to review truthfully | Require split or staged review |
| Generated or vendored files dominate the diff | Exclude them explicitly and review authored code |
| Base branch is unclear | Stop and identify the correct comparison target first |
| Acceptance intent is missing | Review for risk, but call out the missing acceptance source |
| You find yourself implementing instead of reviewing | Stop and separate review findings from delivery work |

## Quick Tests

**Should trigger:**
- "review this PR"
- "code review my changes"
- "do a pre-landing review"
- "security review this diff"

**Should not trigger:**
- "fix this error"
- "write regression tests"
- "update the changelog"
- "help design this feature"

## References

- `references/review-checklist.mdx` — Review checklist and examples
- `references/review-template.mdx` — Reporting format for findings
- [Google Engineering Practices: Code Review](https://google.github.io/eng-practices/review/) — Review heuristics

## Decision Gate

**After presenting findings, ALWAYS offer these options:**

```
─────────────────────────────────────────
REVIEW COMPLETE

What would you like to do?

1. **Fix issues** — Address findings starting with must-fix
2. **Save review** — Export findings to a markdown file
3. **Review again** — Re-review with different scope or focus
4. **Discuss a finding** — Ask questions about a specific issue
5. **Other** — Tell me what you need
─────────────────────────────────────────
```

**Wait for user response before taking any action.**

This gate is MANDATORY. Never skip it. Never auto-implement fixes based on your own findings.

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **systematic-debugging** | Root-cause analysis | When review finds an actual bug to trace |
| **verification-before-completion** | Evidence before claims | Before declaring the change merge-ready |
| **beads** | Persistent work tracking | When findings belong to tracked delivery |