# The Firm Workflow Architecture v0

## Purpose
This document defines how work moves through The Firm from idea to closure, how Beads issues change state, how artifacts are produced and consumed, how parallel waves are formed, and how The Firm replaces OMP’s default workflow behavior.

The workflow architecture describes the operating model. The control plane described in `THE_FIRM_CONTROL_PLANE.md` is the mechanical layer that dispatches the next governed step from persisted repository state.

## Workflow characteristics
The workflow is:

- issue-driven
- phase-gated
- dependency-aware
- role-specialized
- artifact-based
- QA-enforced
- risk-tiered for verification
- Beads-first for issue readiness
- Dolt-auditable for history and evidence
- control-plane-dispatched for active execution

## Canonical phase flow
### Phase 0 — Intake
Owner: Product Office

Creates the initial `initiative` or `feature` issue and records the desired outcome.

### Phase 1 — Product Framing
Owner: Product Office

Artifacts:
- `vision.md`
- `product-brief.md`
- `acceptance.md`

Exit criteria:
- problem is sharp
- scope and non-goals are clear
- acceptance intent exists

### Phase 2 — Technical Discovery
Owner: Architecture Office

Artifacts:
- `technical-discovery.md`
- callsite impact notes
- state flow notes

Exit criteria:
- relevant code surfaces are known
- dependencies and constraints are visible
- state/data boundaries are clear enough to design against

### Phase 3 — Design Lock

Owner: Architecture Office



Purpose: Produce a professional design package that Engineering can implement with confidence. The design package must be sufficient for serious software delivery: clear contracts, visible boundaries, explicit decisions, and credible verification plan.



Artifacts:

- `technical-design.md` containing:

  - C4 views (context/container/component) where scope or risk warrants visual architecture

  - Sequence or state-flow diagrams where behavior is non-obvious

  - ADR-style decision records for significant choices

  - Integration boundary specifications

  - Rollout and migration considerations

  - Verification mapping linking contracts to proof obligations

- Explicit contracts and invariants

- Wave and dependency plan

- Verification requirements with risk-tier justification



Exit criteria:

- Architecture is expressed at appropriate depth (not more, not less)

- Contracts are locked and documented

- Implementation boundary is explicit

- Verification depth is decided and mapped

- Parallelization plan exists

- Rollback and migration paths are considered

### Phase 4 — Delivery Planning
Owner: Engineering Office

Artifacts:
- `delivery-plan.md`
- execution waves
- engineering handoff records

Exit criteria:
- work is sliced into executable issue units
- dependencies are explicit
- owners are assigned

### Phase 5 — Implementation Waves
Owner: Engineering Office

Artifacts:
- code
- tests
- implementation notes

Exit criteria:
- wave scope is implemented
- initial supporting evidence exists
- QA intake is possible

### Phase 6 — QA & Verification
Owner: QA & Reliability Office

Artifacts:
- `qa-verdict.md`
- propagation verdicts
- E2E requirement and result notes
- residual risk notes

Exit criteria:
- required evidence exists
- required checks are complete or explicitly skipped with rationale
- verification verdict is recorded

### Phase 7 — Release Readiness / Closure
Owner: QA / Release with Workflow Operations support

Artifacts:
- `release-readiness.md`
- closure records

Exit criteria:
- blockers are resolved or explicitly accepted
- release confidence is explicit
- closure is process-valid

### Phase 8 — Retrospective
Owner: Workflow Operations + Architecture + QA

Artifacts:
- `retro.md`

Exit criteria:
- learning is captured
- workflow improvements are proposed

## Beads issue movement
Core issue states:

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

### Meaning of `ready`
A work item is `ready` only when:
- dependencies are satisfied
- required upstream artifacts exist
- ownership is assignable
- the phase gate into that work has passed

## Dependency model
The Firm depends on explicit issue relationships for:
- readiness
- blockers
- handoff sequencing
- parallel execution safety

Minimum relationship set:
- parent-child
- blocks
- depends_on
- relates_to
- supersedes
- duplicates
- replies_to

## Parallelization model
Parallelization is designed during Architecture and Delivery Planning, not improvised during coding.

### Parallel work is allowed when:
- the contract is locked
- dependency graph allows it
- ownership does not collide
- outputs are independent or converge through explicit handoffs

### Safe examples
- parallel discovery streams
- multiple consumer updates after interface lock
- specialist QA reviews
- test development alongside non-conflicting implementation

### Unsafe examples
- changing core contracts while dependents are edited in parallel without lock
- changing shared state backbone and dependents simultaneously
- overlapping edits without an isolation boundary


## Control-plane execution model
The Firm should not rely on the active chat session to remember where work is in the organizational workflow.

Instead, active execution should be derived from persisted run-state and repository evidence.

The control plane is responsible for:
- reading the active run-state from disk
- determining the current phase and executable unit
- assigning the owning office for that unit
- validating required artifacts before movement
- dispatching the next legal step
- resuming actionable work when a run stops prematurely

This means the workflow architecture remains the normative description of phases, artifacts, and gates, while the control plane becomes the runtime mechanism that enforces them.

## Run and backlog model

The Firm should execute meaningful work through explicit runs or waves, not through indefinite conversational continuation.

### Backlog rule
Once intent is sufficiently clear, the engagement should expose a backlog of work items rather than holding future work implicitly in chat history.

### Run rule
Each run should define:
- the objective of the run
- the work items included
- the owner office and participating roles
- the required artifacts
- the required proof burden
- the explicit closure or handoff condition

### Self-correction rule
If a run fails, drifts, or exceeds operational constraints, The Firm should not simply continue by inertia. It should:
- correct locally when the defect is local
- escalate when the defect crosses roles or offices
- re-scope, replan, or reopen the relevant work items when needed

### Delegation rule
If the backlog contains multiple independent work items, delegation to subagents or parallel workstreams is desirable only after issue structure, design boundaries, and verification expectations are explicit.

### Backlog-first rule for multiple client asks
If the client introduces multiple requests, ideas, concerns, or side-paths during an active engagement, The Firm should not continue as if they are all part of one undifferentiated conversation.

Instead, it should:
- distill them into explicit backlog items or workstreams
- prioritize them by prerequisite value and dependency
- route them into the correct runs or waves
- delegate them to subagents only when the structure is explicit enough to do so safely

This is how the firm converts conversational entropy into governed execution.
## Artifact flow
Artifacts are the formal outputs of each phase and the inputs of the next.

Required artifact families:
- vision
- product brief
- acceptance spec
- technical discovery
- technical design
- delivery plan
- implementation notes
- QA verdict
- release readiness
- retrospective

No required artifact may exist only in chat output.

## Verification architecture
Verification is decided early and executed later.

### In Phase 3
Architecture decides the required verification level.

### In Phase 4
Engineering planning creates the corresponding verification work items.

### In Phase 6
QA executes or evaluates the required checks.

## Propagation checks
Propagation checks are required when work changes:
- shared state
- event names or payloads
- store, selector, or subscription behavior
- async synchronization across boundaries
- mappings between producers and consumers
- cache/persistence/UI consistency

## E2E checks
E2E checks are required when work changes:
- primary user flows
- critical business flows
- multi-boundary behavior
- paths where regression is only visible at flow level
- high-risk or incident-prone areas

Skipped propagation or E2E checks must be recorded with rationale.

## Greenfield mode
Greenfield projects start directly with The Firm as native operating model:
- Beads initialized immediately
- issue taxonomy native to The Firm
- doctrine enforced from the start
- no compatibility wrapper required

## Brownfield mode
Brownfield projects add two preliminary phases:

### Brownfield A — Existing System Assessment
Maps architecture, existing workflow, test landscape, and constraints.

### Brownfield B — Adoption Mapping
Defines how The Firm overlays the existing project, where enforcement begins, and which workstream becomes the pilot.

After those two phases, the canonical workflow applies.

## How The Firm overrides OMP
The Firm replaces OMP’s default workflow assumptions on four layers.

### 1. Behavioral override
OMP’s generic coding flow is replaced by issue-first, phase-gated execution.

### 2. Agent override
The Firm supplies specialist agents with narrower responsibilities and stricter handoff/output contracts.

### 3. Workflow override
The Firm governs when work starts, how it moves, when parallelization is legal, and when closure is allowed.

### 4. Control-plane override
The Firm adds a mechanical control plane that derives the active phase, current unit, owning office, and next legal step from persisted repository state.

## Runtime mapping
- OMP executes work through agents and tools.
- Beads manages work items, dependencies, readiness, claiming, and closure.
- Dolt records versioned state, decisions, handoffs, verification requirements, and evidence.
- The control plane dispatches the active governed unit from run-state and repository evidence.

In short: OMP executes, Beads organizes the work graph, Dolt preserves durable truth, and the control plane decides what governed step runs now.
