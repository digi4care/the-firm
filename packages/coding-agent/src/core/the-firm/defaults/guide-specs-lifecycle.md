---
status: active
description: "Lifecycle of a .firm/ spec: creation, implementation, completion, and archival."
owner: The Firm Architecture Team
created: 2026-04-09
review-cadence: quarterly
---

# Specs Lifecycle

## Purpose

Specs are first-class artifacts in `.firm/specs/`. They describe what needs to
be built before implementation begins. This guide defines the lifecycle stages
and transitions for every spec.

## States

```
draft → active → implementing → completed → archived
```

| State | Meaning | What happens |
|---|---|---|
| `draft` | Spec is being written | Content is in progress, not yet reviewed |
| `active` | Spec is approved and ready for implementation | Can be picked up by a workflow instance |
| `implementing` | Spec has an active workflow instance | Linked to `.firm/operations/workflows/instances/` |
| `completed` | Implementation done and verified | All acceptance criteria met, tests pass |
| `archived` | No longer active | Moved to `.firm/archive/specs/` if needed |

## Creation

1. A spec is created in `.firm/specs/` with filename `{title}-{date}.md`
2. Required frontmatter: `status`, `description`, `owner`, `created`
3. Required body sections: **What**, **Scope** (In scope / Out of scope), **Acceptance Criteria**
4. Architecture and phases are recommended but optional

## Activation

A spec moves from `draft` to `active` when:
- All required sections are present
- The description is under 120 characters
- Acceptance criteria are concrete and testable
- At least one stakeholder has reviewed it (in practice, the user approves)

## Implementation

When a spec is picked up for implementation:
1. Create a workflow instance via `kb-workflow create --template spec-implementation --spec {spec-path}`
2. The spec's `status` frontmatter changes to `implementing`
3. The workflow instance tracks phase progress, retrospective findings, and backlog

## Completion

A spec moves to `completed` when:
- All acceptance criteria are met
- The linked workflow instance is closed
- No regressions in existing tests

## Archival

Specs are archived when:
- They are no longer referenced by any active work
- The implementation has been stable for at least one review cycle
- The user explicitly requests archival

Archived specs move to `.firm/archive/specs/` with their original filename.

## Error Handling

- If a spec has `status: implementing` but no linked workflow instance, reset to `active`
- If acceptance criteria are ambiguous, block activation and request clarification
- If a completed spec is reopened, create a new spec referencing the original

## Traceability

Every spec SHOULD link to:
- The ADR that justified the approach (if any)
- The pattern that the implementation follows (if any)
- The workflow instance that tracks progress (when implementing)

This creates a navigable graph: `spec → ADR → pattern → implementation`.
