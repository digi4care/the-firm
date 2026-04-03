# The Firm Normalization Decisions v0

## Purpose

This document closes the highest-value ambiguities identified in `THE_FIRM_DESIGN_AUDIT.md` so The Firm can move toward implementation without carrying authority drift, lifecycle ambiguity, or governance collisions into runtime assets.

These decisions are not new philosophy. They are normalization choices that make the existing design executable.

## Decision 1 — Lead-role model

### Problem

The audit found ambiguity around office leads such as:

- `product_lead`
- `architecture_lead`
- `qa_lead`
- `workflow_governor`
- and to a lesser extent the dual-use nature of `engineering_lead`

### Decision

The Firm will treat office leads as **real runtime-capable roles with governance authority**, not as purely abstract oversight titles.

That means:

- they may appear in the agent catalog
- they may own work items and artifacts
- they may perform escalated review and decision work
- they are not the default execution roles for ordinary specialist tasks

### Clarification

#### `engineering_lead`

`engineering_lead` is intentionally dual-natured:

- runtime role for delivery planning and execution coordination
- office lead for Engineering decisions and escalations

This is acceptable because Engineering naturally requires an execution-facing lead. However, specialist implementation still belongs to specialist engineers by default.

#### Other leads

`product_lead`, `architecture_lead`, `qa_lead`, and `workflow_governor` should be added to the conceptual roster as first-class lead roles. They do not need to do day-to-day specialist work by default, but they are real actors, not only conceptual boxes.

## Decision 2 — `review_pending` ownership

### Problem

The audit found that `review_pending` lacked sufficiently explicit ownership semantics.

### Decision

When an item enters `review_pending`, **ownership remains with the producing office until the reviewing office explicitly accepts or rejects the handoff**.

### Meaning

- the producer remains accountable for the item while it is awaiting review
- the reviewer is responsible for issuing a review decision, not silently inheriting ownership
- once the handoff is accepted and the workflow transitions into the reviewer-owned phase, ownership formally changes

### Allowed transitions from `review_pending`

- `review_pending -> qa_pending` when review/handoff is accepted and QA takes over
- `review_pending -> in_progress` when the reviewer rejects the handoff and returns work to the producer
- `review_pending -> blocked` when review identifies a blocker that prevents legal progression

### Required artifact

A `handoff` artifact or equivalent review record must exist for any `review_pending` transition that crosses offices.

## Decision 3 — Risk-tier authority

### Problem

Risk-tier assignment drives verification, lane behavior, and escalation, but authority was not fully normalized.

### Decision

#### Initial assignment

The **`verification_planner`** proposes the initial risk tier during design lock.

#### Approval authority

The **`architecture_lead`** is the default approving authority for the initial risk tier.

#### Escalation authority

The **`qa_lead`** may escalate the risk tier upward if verification reality suggests the original tier was too low.

#### Downgrade rule

Risk tier may not be downgraded for convenience by implementation roles.
Any downgrade requires:

- explicit rationale
- agreement between `architecture_lead` and `qa_lead`

### Principle

Risk classification belongs primarily to design and verification leadership, not to implementers.

## Decision 4 — Lane assignment criteria

### Problem

Fast / standard / critical lanes existed, but routing criteria were not explicit enough.

### Decision

Lane assignment is based on a combination of:

- work criticality
- coupling and blast radius
- verification burden
- user/business impact
- residual-risk sensitivity

### Canonical rules

#### Fast lane

Use when work is:

- low-risk
- low-coupling
- locally bounded
- not materially user-flow critical

#### Standard lane

Use by default when work is:

- meaningful but not critical
- cross-functional in a normal way
- requiring normal role/gate discipline

#### Critical lane

Use when work is:

- security, auth, payments, orchestration, release-critical, or otherwise high-impact
- high-coupling or hard to falsify cheaply
- likely to require stronger governance and release scrutiny

### Assignment authority

Initial lane assignment is proposed by `engagement_manager` and `verification_planner`, then confirmed by the relevant lead(s):

- for engagement-level lane: `engagement_manager` + `client_partner` when client impact matters
- for technical execution lane: `architecture_lead` + `qa_lead`

### Upgrade rule

Any office may request a lane upgrade.
Lane downgrade requires lead-level agreement and rationale.

## Decision 5 — Waiver and skip canonical location

### Problem

Skip rationale and verification waivers needed a canonical home.

### Decision

The primary canonical location for verification skip rationale and waiver explanation is:

- `qa-verdict.md`

And the corresponding issue/workflow state should store:

- a short structured reference or flag that a waiver/skip exists
- a link or pointer to the canonical verdict artifact

### Why

This keeps:

- explanation centralized in the QA truth artifact
- issue state compact and machine-visible
- auditability intact

### Rule

No waiver is considered valid unless it appears in the QA verdict and is reflected in issue/workflow state.

## Decision 6 — Council mutation powers

### Problem

Councils existed, but their operational powers were underspecified.

### Decision

A council may mutate only the following classes of objects:

- issue state when ordinary office authority is insufficient
- staffing decisions
- lane assignment
- verification obligations
- exception approvals
- engagement scope at the level appropriate to the council type

### Councils may not directly do

- specialist implementation work as a substitute for offices
- routine ownership of ordinary delivery items
- silent doctrine rewrites without recorded governance decision

### Required output

Every council decision must produce:

- decision artifact
- rationale
- explicit record of which objects were changed
- follow-up owners

### Council-specific scope

- `architecture_council` may change technical design decisions, design-level issue routing, and architecture-sensitive verification obligations
- `quality_council` may change verification obligations, release posture, reopen decisions, and risk acceptance recommendations
- `engagement_council` may change staffing shape, scope contours, client review cadence, and engagement mode
- `firm_council` may approve doctrine exceptions, override office-level deadlocks, and make governance-level changes

## Decision 7 — Brownfield promotion criteria

### Problem

The brownfield adoption levels were directionally strong but lacked sharp enough advancement criteria.

### Decision

Brownfield stages promote only when explicit criteria are satisfied.

### Level 0 -> Level 1 (Observation -> Pilot discipline)

Require:

- current-state assessment completed
- pilot workstream selected
- pilot role map defined
- issue control available for pilot work
- verification expectations defined for pilot

### Level 1 -> Level 2 (Pilot discipline -> Default on new work)

Require:

- at least one pilot completed with real handoffs
- QA enforced on pilot
- major friction points documented
- no unresolved ambiguity about whether The Firm can control new work in this repo

### Level 2 -> Level 3 (Default on new work -> Broad governance)

Require:

- multiple new work items run under The Firm successfully
- handoff and closure discipline stable enough across more than one stream
- leads willing to enforce governance beyond pilot contexts

### Level 3 -> Level 4 (Broad governance -> Full override)

Require:

- issue-first execution is the default expectation for serious work
- verification and closure standards are enforced repo-wide where relevant
- old and new definitions of done no longer coexist materially
- client/team communication uses The Firm structure by default

### Principle

A brownfield repo is not promoted because the intention feels right. It is promoted because the observed operating behavior has changed.

## Consolidated effect of these decisions

These normalization decisions establish that:

- leads are real actors with governance authority
- `review_pending` is a producer-owned waiting state, not an ownership void
- risk-tier authority is shared between architecture and QA leadership, not implementers
- lanes are assigned by explicit criteria and leadership approval
- waivers live canonically in QA verdicts and are mirrored in issue state
- councils can change defined governance objects but are not substitute execution teams
- brownfield adoption advances only on observed proof, not aspiration

## Implementation implication

Before heavy runtime asset generation, these decisions should be reflected into:

- the agent catalog
- the governance model
- the issue tracker model
- the verification policy
- the brownfield adoption model
- future templates and installer logic

## Summary

The Firm now has explicit answers to the most important unresolved design questions from the first audit.

These decisions do not end future evolution, but they do establish an implementation-stable baseline that is far less likely to drift under runtime pressure.
