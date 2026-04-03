# The Firm Source of Truth and Ownership Model v0

## Purpose
This document defines where different kinds of truth live inside The Firm and which roles are responsible for maintaining them.

The Firm uses multiple systems on purpose:
- Git
- Beads
- Dolt-backed workflow state
- `.firm/` artifacts

Without an explicit source-of-truth model, those systems will drift into duplication, ambiguity, or accidental contradiction.

This document normalizes:
- canonical homes
- default owners
- mutation rights
- anti-duplication rules

## Principle
The Firm follows one core discipline:

**One concern, one canonical home.**

A concern may appear in multiple places for usability, but only one place is authoritative.

## System roles
### Git
Git is the canonical home for:
- source code
- runtime assets
- public repository docs
- versioned artifact files stored in the repo
- file-level history

Git is not the canonical home for:
- live issue state
- readiness
- claim status
- blocker semantics
- closure legality

### Beads
Beads is the canonical home for:
- work items
- dependency graph
- readiness
- claiming
- blockers
- issue lifecycle state
- closure state

Beads is not the canonical home for:
- long-form design docs
- detailed QA prose
- file-level implementation history

### Dolt-backed workflow state
Dolt-backed state is the canonical home for:
- structured historical workflow truth behind Beads operations
- durable history of issue-state changes
- structured auditability for control-plane mutations

Dolt-backed state is not the canonical home for:
- user-facing long-form project artifacts
- implementation diffs
- freeform explanatory narratives

### `.firm/` artifacts
`.firm/` is the canonical home for:
- intake artifacts
- engagement artifacts
- handoff artifacts
- design and delivery artifacts when stored as project files
- QA verdicts
- release readiness and council decision records

`.firm/` is not the canonical home for:
- issue lifecycle state
- work readiness or claim legality
- raw structured backend history

## Canonical ownership matrix
| Concern | Canonical Home | Default Owner | Secondary Mirrors |
| --- | --- | --- | --- |
| Source code changes | Git | Engineering | Beads issue references |
| Runtime agent definitions | Git | Architecture / Workflow Ops | None |
| Public docs | Git | Product / Governance | None |
| Work item state | Beads | Workflow Operations | Dolt-backed history |
| Dependencies / blockers | Beads | Workflow Operations | Artifact references where useful |
| Structured workflow history | Dolt-backed state | Workflow Operations | Beads views |
| Intake record | `.firm/` | Client-facing layer | Beads-linked engagement issue |
| Engagement state artifact | `.firm/` | Engagement Manager | Beads work graph |
| Technical design artifact | `.firm/` | Architecture | Beads issue links |
| Delivery plan | `.firm/` | Engineering Lead | Beads issue links |
| Handoff artifact | `.firm/` | Source role, accepted by target role | Beads handoff/work item references |
| QA verdict | `.firm/` | QA | Beads status or verification flags |
| Release decision | `.firm/` | QA / Release / Governance | Beads closure state |
| Council decision | `.firm/` | Governance | Beads-linked decision state |

## Mutation rights
The Firm should be explicit about who may mutate which kinds of truth.

### Git-side mutations
May be performed by:
- Engineering roles for code
- Architecture / Workflow roles for runtime assets
- Product / Governance for doctrine and public documentation
- QA for QA artifacts and verdict documents

Rule:
Git changes must still align with issue state and workflow legality.

### Beads-side mutations
May be performed by:
- Workflow Operations as the primary controller of state legality
- Office leads within their authority domain
- specialists only for the subset of issue actions allowed by workflow policy

Rule:
No role should casually mutate lifecycle state outside its authority ceiling.

### Dolt-backed control-plane mutations
Operationally flow through workflow operations and the runtime control plane, while remaining traceable to issue state and artifact truth.

Rule:
Specialists should not need to treat Dolt as a general-purpose personal state store. The control plane owns that layer.

### `.firm/` artifact mutations
May be performed by the office that owns the artifact class.

Examples:
- intake files: client-facing layer
- design files: architecture
- delivery files: engineering
- QA verdicts: QA
- council decisions: governance

Rule:
Accepted artifacts should not be overwritten silently. New accepted states should be recorded as explicit new versions or new decision artifacts when needed.

## Anti-duplication rules
### Rule 1 — Do not duplicate canonical state in prose
If issue readiness or closure is important, it belongs canonically in Beads state, not only in a markdown note.

### Rule 2 — Do not use Git commits as workflow state
A commit may support a work item, but it does not itself declare the work item ready, verified, blocked, or closed.

### Rule 3 — Do not use `.firm/` artifacts as the issue tracker
Artifacts support the workflow but do not replace issue state.

### Rule 4 — Do not use memory as a source of truth
Agent memory may help recall context, but canonical workflow truth must live in the systems above.

### Rule 5 — Mirror minimally and intentionally
If a concern appears in a secondary system, that mirror should be:
- compact
- reference-oriented
- clearly subordinate to the canonical home

## Canonical examples
### Example 1 — QA verdict and issue closure
- Detailed reasoning and skip rationale live in `qa-verdict.md`
- Verification or closure flags live in Beads issue state
- Dolt-backed state preserves the structured history of that Beads transition

### Example 2 — Design lock
- Full design reasoning lives in `technical-design.md`
- The issue graph records that design lock has been reached and which work items are now ready
- Git preserves the file history of the design document

### Example 3 — Intake
- The full structured intake lives in `.firm/intake/<engagement-id>/intake.yml`
- The engagement’s existence and work graph live in Beads
- Git preserves the file version history for the intake artifact

## What specialists should assume
### Engineering should assume
- code and delivery artifacts live in Git / `.firm/`
- issue state does not become true because code exists

### QA should assume
- verdict reasoning lives in `.firm/`
- closure legality lives in issue state and governance

### Workflow Operations should assume
- Beads is the operational issue graph and readiness layer
- the control plane owns active execution dispatch
- `.firm/` artifacts must be linked and reflected, not replaced

### Client-facing roles should assume
- intake and engagement artifacts are their primary structured surface
- engagement truth must still be reflected into the issue graph

## Conflict resolution rule
If two sources disagree:
1. identify the canonical home for that concern
2. trust the canonical home
3. update or invalidate the secondary mirror
4. record the correction if the mismatch affected workflow truth

## Relationship to runtime policy
This model should govern how agents are instructed.

Agents should be told not only what to produce, but also:
- where that output belongs
- whether it is canonical or mirrored
- who must accept it
- what system actually controls downstream state

## Summary
The Firm uses Git, Beads, Dolt-backed control-plane state, and `.firm/` artifacts together — but not interchangeably.

That only works if every participant understands:
- what each system is for
- what each system is not for
- who owns each truth surface
- and which system wins when ambiguity appears


## Governed record creation rule
When The Firm creates issues, backlog records, handoff records, or PR-linked workflow objects, the mutation must be attributable to an authorized office, role, or runtime surface.

That means every creation flow should make clear:
- which canonical system is being mutated
- which office owns the right to create that class of record
- which role or authorized subagent exercised that right
- which triggering request, issue, or artifact justified the mutation

Creation authority is therefore part of ownership truth, not an implementation detail.