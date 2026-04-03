# The Firm Issue Tracker Model v0

## Purpose

This document defines the issue-tracker model used by The Firm and explains how The Firm implements that model with Beads as its canonical issue graph and readiness layer.

The issue tracker is not treated as a passive ticket list. In The Firm, it is the canonical system for:

- work definition
- dependency structure
- ownership and claiming
- readiness
- blockers
- handoffs
- closure state

Dolt remains the versioned truth layer behind workflow history and evidence, while Beads is the concrete implementation of the visible graph through which work moves. The control plane dispatches active execution from repository state, but it does not replace the issue graph.

## Design principles

The Firm uses its issue tracker according to these principles:

- every meaningful work item exists as a Beads item
- dependencies are explicit, not implied in prose
- readiness is a workflow decision, not a feeling
- ownership is claimed, not assumed
- closure is gated by evidence, not coding completion alone
- issue structure must reflect organizational structure closely enough that role ownership is legible

## Canonical issue taxonomy

The Firm uses a layered issue taxonomy.

### Strategic layer

- `initiative`
- `epic`
- `feature`

### Product and design layer

- `requirement`
- `decision`
- `risk`
- `verification-plan`
- `discovery-task`
- `dependency-analysis`

### Delivery layer

- `implementation-task`
- `integration-task`
- `refactor-task`
- `test-task`

### QA and release layer

- `qa-check`
- `regression-review`
- `propagation-check`
- `e2e-check`
- `release-gate`

### Coordination layer

- `blocker`
- `handoff`
- `message`

## Hierarchy rules

The Firm assumes Beads hierarchy represents increasing execution detail.

Typical shape:

- `initiative` -> `feature`
- `feature` -> product/design/delivery child items
- implementation or verification work -> more granular child tasks where needed

Hierarchy should follow ownership and decomposition, not arbitrary nesting.

### Good hierarchy

Use parent-child when:

- the child is part of completing the parent
- the child has its own lifecycle and owner
- closure of the parent depends on closure of the child

### Avoid hierarchy when

- the relationship is informational only
- the item is related but not required for completion
- the item supersedes or duplicates another item

Those should use graph links instead.

## Lifecycle states

The Firm uses the following canonical lifecycle states across most issue types:

- `proposed`
- `triaged`
- `ready`
- `claimed`
- `in_progress`
- `review_pending`
- `qa_pending`
- `blocked`
- `verified`
- `closed`
- `reopened`

Not every issue type must visit every state, but the meaning of the shared states should remain stable.

## State definitions

### `proposed`

The item exists but is not yet shaped enough to enter execution.

### `triaged`

The item has known type, owner-role, and rough scope.

### `ready`

The organization judges the item executable.
Dependencies are satisfied, required upstream artifacts are present, and the next owner can legally start.

### `claimed`

A specific owner has taken responsibility for execution.

### `in_progress`

Execution is actively underway.

### `review_pending`

The producing office considers the output complete enough for structured review or handoff.

### `qa_pending`

The item has entered the verification path and now requires QA-side evidence review.

### `blocked`

The item cannot proceed because of a missing dependency, unresolved contradiction, failed gate, or required clarification.

### `verified`

Required proof exists or explicit, policy-compliant waivers have been recorded.

### `closed`

The item is fully complete within workflow policy.

### `reopened`

New evidence or failure invalidates prior closure.

## State transition policy

### Allowed high-level progression

- `proposed -> triaged`
- `triaged -> ready`
- `ready -> claimed`
- `claimed -> in_progress`
- `in_progress -> review_pending`
- `review_pending -> qa_pending`
- `qa_pending -> verified`
- `verified -> closed`
- `closed -> reopened`

### Alternative transitions

The Firm also allows:

- any active state -> `blocked`
- `blocked -> ready` when the blocker is resolved
- `review_pending -> in_progress` when review rejects the handoff
- `qa_pending -> in_progress` when QA sends work back

### Forbidden transitions by doctrine

The following should be treated as invalid unless a specific workflow explicitly allows them:

- `proposed -> in_progress`
- `ready -> closed`
- `in_progress -> closed`
- `review_pending -> closed`
- `qa_pending -> closed`
- `blocked -> closed` without explicit risk acceptance process

## Readiness rules

An item may be marked `ready` only if:

- required parent or upstream items are sufficiently complete
- blocking dependencies are resolved
- required artifacts for the next phase exist
- the next owner-role is known
- the relevant gate for that phase has been passed

Readiness is therefore a governed decision, not a convenience flag.

## Ownership and claiming

### Owner role vs owner agent

Each item should have at least an `owner_role` in the workflow model.
Where concrete execution occurs, an `owner_agent` or assignee may also be attached.

### Claiming rule

Work is not considered active until it is claimed.
Claiming means:

- one owner takes responsibility
- the issue becomes unavailable for competing execution unless explicitly parallelized
- downstream observers can trust who is currently accountable

### Claiming policy

Only items in `ready` state should be claimable.
Claiming should atomically:

- set assignee/owner-agent where appropriate
- transition state to `claimed` or `in_progress` according to execution mode

### Collision rule

No two owners should claim the same non-parallel work item at once.
If multiple agents must contribute, create child items or a wave structure instead of shared ambiguous ownership.

## Dependency semantics

The Firm depends on explicit graph relationships.

### Minimum relationship types

- parent-child
- blocks
- depends_on
- relates_to
- supersedes
- duplicates
- replies_to

### Meaning

#### parent-child

The child is part of completing the parent.

#### blocks

The source item prevents the target from progressing.

#### depends_on

The target requires the source to complete first.

#### relates_to

Relevant but non-blocking association.

#### supersedes

A newer item replaces an older plan or execution path.

#### duplicates

Two items represent the same underlying work.

#### replies_to

Used for message-oriented coordination.

## Blocker model

The Firm treats blockers as first-class workflow objects.

A blocker may be represented as:

- a state (`blocked`)
- a relationship (`blocks`)
- or a dedicated `blocker` issue when the blocking problem needs active management

### Use a dedicated blocker issue when

- the blocker itself requires investigation or execution
- multiple items are blocked by the same problem
- the blocker must have its own owner and lifecycle

## Handoff representation

The Firm requires explicit handoffs between offices.

In Beads, a handoff may be represented by:

- a dedicated `handoff` item
- linked artifacts
- state transition of the source item
- relationship to the receiving work item or office-specific child item

### Minimum handoff contents

A valid handoff must point to:

- source work item
- target work item or target role
- summary of what is being handed off
- artifact references
- acceptance conditions
- open questions
- open risks

### Handoff statuses

The handoff object or handoff state should support:

- `draft`
- `submitted`
- `accepted`
- `rejected`
- `needs_revision`

### Handoff doctrine

No office should begin serious downstream work on the assumption that a handoff is implicitly valid.
Acceptance must be explicit.

## Closure policy

Closure in The Firm is governed, not casual.

### A work item may close only when

- its role-specific objective has been met
- required child items or dependencies are complete or explicitly resolved
- required artifacts exist
- required verification has completed or has a policy-compliant waiver
- residual risk is recorded where relevant
- no invalid blockers remain

### Engineering closure rule

Implementation work is not closed merely because code exists.
It must also satisfy QA entry and verification requirements.

### Feature closure rule

A feature does not close until:

- its required child work is closed
- its verification obligations are satisfied
- release-level concerns are either resolved or explicitly accepted

## Reopen policy

Any item may be reopened if:

- new evidence falsifies the earlier completion claim
- dependent verification fails
- a hidden blocker is discovered
- the delivered artifact proves incomplete for its declared scope

Reopening is not failure of the system. It is evidence that the system is telling the truth.

## Issue design guidelines

### Keep items narrow enough to own

If no single role can clearly own a work item, it is probably too broad.

### Prefer graph clarity over descriptive prose

If a dependency matters, model it as a relationship. Do not bury it in a paragraph.

### Prefer child items over shared ambiguous ownership

If multiple specialists must contribute, split execution into explicit issue units.

### Prefer status truth over optimistic progress

If an item is blocked, mark it blocked. Do not leave it in progress to preserve appearances.

## Greenfield usage

In greenfield repos, The Firm expects Beads to be initialized from the start and used as the canonical issue model.
That means:

- issue taxonomy can be native immediately
- lifecycle discipline can be enforced from day one
- no compatibility wrapper is needed

## Brownfield usage

In brownfield repos, The Firm uses Beads as an overlay issue graph and readiness layer while the broader control-plane model is phased in incrementally.
That means:

- existing repo realities are first assessed
- issue taxonomy may need a translation phase
- initial enforcement may start on selected workstreams only
- closure discipline should tighten over time, not all at once

## Relationship to Pi

Pi does not replace Beads in The Firm.
Pi consumes and acts on work defined by Beads.

That means:

- agents should work from issue-driven assignments
- artifacts and handoffs should map back to Beads items
- completion in chat is not completion in the workflow

## Summary

The Firm uses Beads as the visible, structured graph of work.

If the operating model defines who owns work, and the workflow architecture defines how work moves, then the Beads model defines how that movement is represented, constrained, and audited in practice.

## Creation authority

Governed work creation must follow explicit organizational authority.

### Intake and engagement-entry records

- created by client-facing product roles or authorized intake-routing surfaces
- must reference the triggering client request or engagement context

### Backlog and orchestration records

- created by workflow operations or orchestration-authorized roles
- must reference the parent engagement, current active work, or captured side-request that caused creation

### Delivery records

- created by issue orchestration, engineering leads, or explicitly authorized runtime capture surfaces
- must not appear without a parent feature/initiative or equivalent governed context unless doctrine explicitly allows bootstrap creation

### Verification and release records

- created by QA-owned or QA-authorized paths
- must reference the delivery item or release decision they govern

### PR-linked workflow records

- must be linked to already-existing governed issues
- PR creation without linked issue context is invalid workflow behavior

## Required creation metadata

Every created issue or governed record should preserve at least:

- creator_office
- creator_role
- creator_agent or runtime surface when applicable
- created_from_request or created_from_issue
- created_at
- rationale
- parent linkage and related linkage where applicable

The tracker model is incomplete if these answers cannot be reconstructed later.
