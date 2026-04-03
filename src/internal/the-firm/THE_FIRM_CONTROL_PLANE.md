# The Firm Control Plane v0

## Purpose
This document defines the execution control plane that makes The Firm mechanically operable rather than dependent on chat continuity, agent memory, or prompt-only role selection.

The Firm is designed to simulate a real software organization: client entry, office ownership, internal workflows, cross-office handoffs, approval boundaries, and verification gates. That design only becomes reliable when the runtime can derive what happens next from repository state on disk.

This document introduces that mechanical layer.

## Why a control plane is required
The Firm already defines:
- offices and role boundaries
- phase flow and gates
- artifact families
- verification policy
- issue-first execution
- handoff contracts

Those documents describe what the firm believes.

A control plane is the missing layer that determines:
- where the current run is
- what the next executable unit is
- which office owns it
- which artifacts are required before movement is legal
- when escalation is required
- when a stopped session should resume rather than silently die

Without a control plane, the workflow remains vulnerable to:
- context loss between sessions
- premature stopping after tool output or partial reasoning
- agents choosing their own role instead of being assigned one by workflow state
- gate drift where movement occurs because the agent believes it is done rather than because state proves it

## Core design principle
The Firm should not rely on the agent to remember where it is in the organizational workflow.

The repository should hold enough state on disk for the runtime to derive:
1. the active engagement
2. the active phase
3. the current unit of work
4. the owning office
5. the required artifacts
6. the next valid step
7. the allowed transitions

The runtime then dispatches from that state.

## Relationship to Beads, Dolt, and OMP
The control plane does not replace the existing stack. It composes with it.

### OMP
OMP remains the execution runtime.
It runs the agent, tools, extensions, and interactive sessions.

### Beads
Beads remains the issue graph and readiness system.
It manages work items, dependencies, claiming, blockers, and closure semantics.

### Dolt
Dolt remains the versioned truth and audit layer.
It records decisions, handoffs, evidence references, and workflow history.

### The control plane
The control plane becomes the execution state layer.
It determines which unit should run now, which office owns it, and what transition is legal next.

In short:
- OMP executes
- Beads organizes work items
- Dolt records durable truth
- The control plane dispatches the next governed step

## Relationship to AGENTS.md
`AGENTS.md` is a runtime summary surface for this repository.
It is not the full design description of how The Firm functions.

The control plane belongs in the internal design stack because it defines the mechanical execution model of The Firm itself.

## Control plane scope
The control plane is responsible for:
- persisted run-state
- state derivation
- next-unit dispatch
- office assignment for the active phase
- gate and artifact validation before transitions
- recovery after aborted or stalled runs
- timeout and escalation triggers
- transport-ready task delegation payloads that compile current state into task-tool-compatible call envelopes

The control plane is not responsible for:
- replacing Beads as issue tracker
- replacing Dolt as audit history
- redefining product, architecture, engineering, or QA doctrine
- inventing policy separate from the existing design stack

## Persisted run-state
The Firm should persist current execution state on disk.

Recommended file:
- `.firm/run-state.yml`

Minimum fields:
- `engagement_id` — currently active engagement
- `phase` — current workflow phase
- `unit` — current executable unit inside the phase
- `owner_office` — office currently accountable for the unit
- `participating_roles` — roles active for the unit
- `next_step` — concrete next action to execute
- `required_artifacts` — artifacts needed before the unit can complete or transition
- `blockers` — explicit blockers preventing progress
- `history[]` — append-only transition log with timestamps, reasons, and prior/new values

Optional fields over time:
- `risk_tier`
- `lane`
- `attempt_count`
- `escalation_state`
- `last_successful_dispatch_at`
- `timeout_deadline`
- `handoff_required`
- `handoff_status`

## Canonical control-plane phases
The control plane should begin with a simplified execution lifecycle that is mechanically tractable.

Recommended first control-plane phases:
1. `intake`
2. `discovery`
3. `design`
4. `build`
5. `verify`
6. `close`

These phases intentionally collapse some narrative complexity from the broader doctrine into a smaller machine-operable sequence.

This is not a contradiction of the design stack.
It is a runtime normalization layer.

The more detailed workflow architecture can still express richer subphases, but the control plane should start from a smaller stable core that the runtime can enforce reliably.

## Units of work
A phase is not yet an actionable run.
The control plane therefore introduces the concept of a unit.

A unit is the smallest governed executable item that can be dispatched with:
- one owner office
- one clear objective
- required artifacts
- explicit completion condition
- explicit handoff or closure condition

Examples:
- classify intake for engagement X
- map impacted code surfaces for feature Y
- produce technical design for change Z
- implement delivery wave A
- perform QA verification for wave B
- record release readiness and close engagement C

## Dispatch model
The runtime should derive the next unit mechanically from persisted state and repository evidence.

The dispatch flow is:
1. read run-state from disk
2. inspect required artifacts and issue state
3. determine whether the current unit is blocked, complete, invalid, or still actionable
4. if actionable, dispatch the current unit
5. if complete, derive the next legal transition and next unit
6. if blocked, inject the blocker and escalation path
7. if stalled, resume rather than ending silently

The runtime should prefer mechanical dispatch over agent self-selection.

## Gate validation
A phase transition is legal only when the control plane can prove its exit conditions.

Examples of machine-checkable conditions:
- required artifact file exists
- required artifact is non-empty
- required handoff artifact exists
- required issue state is compatible with transition
- required verdict is recorded and not pending

The design principle is simple:
movement should be justified by state, not by confidence.

## Office ownership and role assignment
The Firm models a real software company with multiple offices.
The control plane should therefore assign the owning office from state rather than asking the agent to choose.

Initial mapping:
- `intake` → Product or Workflow Operations, depending on entry design
- `discovery` → Architecture Office
- `design` → Architecture Office
- `build` → Engineering Office
- `verify` → QA & Reliability Office
- `close` → QA / Release with Workflow Operations support

Over time, the control plane may assign a narrower active role within the office, but ownership begins at the office level.

## Handoffs as control-plane events
A handoff is not just a document. It is a state transition event.

The control plane should require that a cross-office transition records:
- source office
- target office
- work item reference
- delivered artifacts
- open risks
- acceptance criteria for the receiver
- handoff status

A transition that requires a handoff is incomplete until the receiving side accepts it or explicitly rejects it.

## Recovery and supervision
The control plane should assume runs can fail, time out, or stop mid-work.

Required recovery behavior:
- if a run ends on tool output or empty assistant output, treat it as unfinished
- if the active unit is still actionable, resume it
- if the run exceeds timeout constraints, mark escalation state
- if a blocker persists across repeated attempts, surface explicit escalation rather than silent looping

The continuation guard is therefore one component of the control plane, not the whole control plane.

## Bootstrapping order
The control plane should be introduced in layers.

### Layer 1 — Run-state and dispatcher
- persisted run-state file
- state manager module
- derive-next-step logic
- session-start or turn-start dispatcher
- state update tool

### Layer 2 — Machine-checkable gate criteria
- required artifacts per phase
- transition validation
- blocker reporting

### Layer 3 — Office and role assignment
- office ownership mapping
- role injection by phase or unit
- handoff requirements between offices

### Layer 4 — Client entry and intake routing
- intake classification connected to run-state initialization
- engagement creation and lane/risk initialization
- intake-to-discovery dispatch

### Layer 5 — Escalation, supervision, and approvals
- timeout supervision
- repeated-blocker escalation
- approval chains
- governance thresholds

### Layer 6 — Transport-ready delegation envelopes
- task-tool-compatible call inputs
- shared context packets for delegated work
- explicit dependency and wave hints for multi-agent execution
- isolation hints for safe parallel delegation without inventing new policy
## Relationship to workflow architecture
The workflow architecture describes the full phase model and artifact flow of The Firm.
The control plane is the runtime implementation layer that turns that architecture into executable state transitions.

Said differently:
- workflow architecture describes the operating model
- the control plane makes the operating model mechanically enforceable

## Relationship to greenfield bootstrap
A greenfield The Firm installation should introduce control-plane foundations early, not as a later optimization.

Without persisted state and dispatch, a repository may have The Firm doctrine but still behave like a generic chat-first coding environment.

## Non-goal: replacing everything with one giant state machine
The control plane should not attempt to encode every nuance of human judgment into one brittle monolith.

It should start with:
- a small number of phases
- clear required artifacts
- explicit ownership
- legal transition checks
- recovery behavior

Additional richness should only be added when the smaller machine has proven stable.

## Summary
The Firm is intended to behave like a real software company, not a pile of role prompts.

That requires a mechanical control plane.

The control plane persists workflow state on disk, derives the next legal unit from repository evidence, assigns ownership by office, validates gates before movement, and recovers from stalled runs.

This is the layer that turns The Firm from doctrine into an executable operating system.