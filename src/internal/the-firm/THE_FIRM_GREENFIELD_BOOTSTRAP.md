# The Firm Greenfield Bootstrap v0

## Purpose
This document defines how a brand-new repository adopts The Firm from day zero.

Greenfield bootstrap is the cleanest installation mode. There is no legacy workflow to negotiate, so The Firm should become the default operating system immediately rather than an optional overlay.

## Greenfield objective
A greenfield repository should emerge with these properties from the start:
- issue-first work management
- The Firm doctrine as the canonical way of working
- OMP running under The Firm assumptions, not generic ones
- specialist agents available early
- verification discipline in place before the first serious feature lands
- Beads and Dolt established before workflow entropy appears

## Day-zero principle
Do not allow a greenfield project to begin life in ad hoc mode with the intent to add discipline later.

The first bootstrap goal is not to write code. It is to install the operating conditions that make later code trustworthy.

## Bootstrap outputs
A successful bootstrap produces:
- The Firm documents present in the repository
- issue tracker initialized
- control-plane foundations installed
- initial issue taxonomy and lifecycle agreed
- runtime doctrine visible to OMP
- specialist roles planned or installed
- verification defaults established
- the first initiative and first feature work items created

## Bootstrap sequence

### Step 1 — Establish repository doctrine
Install The Firm’s normative docs into the repo context so they become the default source of truth for agents and contributors.

Required document families:
- vision
- philosophy
- doctrine
- operating model
- workflow architecture
- issue tracker model
- verification policy
- OMP override model

At bootstrap time, these documents do not need to be perfect. They do need to be authoritative.

### Step 2 — Initialize issue graph and control-plane foundations
Initialize Beads immediately, but do not stop there.

Greenfield rule:
- no serious feature work starts before the issue tracker exists
- no serious multi-step workflow starts before persisted run-state and dispatch foundations exist

At minimum, the initialized workflow foundation should support:
- initiatives
- features
- delivery tasks
- verification tasks
- blockers
- handoffs
- a persisted run-state file for active execution
- a runtime dispatch mechanism that can derive the next governed step
### Step 3 — Establish canonical workflow states
Set the project expectation that work moves through The Firm lifecycle, not ad hoc status language.

Baseline states:
- proposed
- triaged
- ready
- claimed
- in_progress
- review_pending
- qa_pending
- blocked
- verified
- closed
- reopened

### Step 3.5 — Install persisted execution state
Before deeper delivery starts, install the minimal control-plane footprint:
- `.firm/run-state.yml`
- runtime state manager and dispatcher hooks
- initial phase model for active execution

This is the point where The Firm stops being only a documented workflow and becomes a mechanically resumable one.

### Step 4 — Install OMP override context
Make OMP consume The Firm rather than generic repository assumptions.

That means the repo should expose:
- doctrine and workflow expectations in project context
- issue-first execution expectations
- role-specialized behavior expectations
- QA and closure discipline
- guidance that work completion in chat is not workflow completion
- runtime control-plane behavior that can resume the next governed step from disk state

### Step 5 — Establish initial role map
Do not begin with every possible specialist fully implemented, but do define the offices and their expected ownership.

Minimum role map for bootstrap:
- Product owner role
- Architecture owner role
- Engineering owner role
- QA owner role
- Workflow operations owner role

Even if one person initially covers multiple roles, the role boundaries must exist conceptually from the start.

### Step 6 — Set verification defaults
Before the first serious feature is executed, define the baseline verification policy for the repo.

Minimum greenfield defaults:
- QA mandatory for non-trivial work
- risk tier required at design lock
- propagation checks required for state/boundary changes
- E2E required for flow/critical-path changes
- closure blocked without evidence or waiver rationale

### Step 7 — Create the first initiative and feature graph
Bootstrap must not end at configuration.
It must produce live work items.

At minimum, create:
- one initiative representing the first meaningful objective
- one or more features beneath it
- child discovery/design/delivery/verification items where applicable

The goal is to ensure the team practices the operating model immediately.

### Step 8 — Run the first feature as a pilot
Use the first meaningful workstream as the proving ground.

The pilot should exercise:
- issue decomposition
- role handoffs
- design lock
- implementation wave planning
- QA entry
- verification closure

The first feature is not just product work. It is a calibration run for The Firm itself.

## Recommended bootstrap ownership

### Product bootstrap owner
Frames the first initiative and first feature goals.

### Architecture bootstrap owner
Ensures the first design and verification planning are explicit.

### Engineering bootstrap owner
Ensures initial delivery follows issue and gate discipline.

### QA bootstrap owner
Prevents the first feature from closing on optimistic momentum.

### Workflow operations bootstrap owner
Ensures state discipline, issue transitions, blockers, and handoffs are visible from the start.

A repository should not be considered The Firm-enabled unless it has, at minimum:
- repository-level The Firm docs
- issue tracker initialized
- control-plane foundations installed
- a defined lifecycle
- a defined verification policy
- visible role ownership
- at least one active initiative using the model

## Bootstrap anti-patterns
The following are considered bootstrap failures:

### 1. "We'll add discipline after the MVP"
This creates legacy process debt before the first stable process exists.

### 2. "We'll just start with generic agents"
Without role boundaries, the repo learns bad habits immediately.

### 3. "We'll track tasks in chat for now"
That breaks issue-first execution before the workflow even exists.

### 4. "We'll add QA later"
That guarantees the initial feature set defines done too loosely.

### 5. "We'll wait to define verification until tests exist"
Verification expectations must shape how work is designed, not merely how it is checked afterward.

## Greenfield readiness checklist
A repo is greenfield-ready for The Firm when:
- The Firm docs are installed and authoritative
- Beads is initialized
- workflow states are known
- ownership boundaries are named
- verification defaults are named
- the first initiative exists
- the first feature graph exists
- the team is prepared to treat the first delivery as a workflow pilot

## Relationship to future implementation
This document describes what bootstrap must accomplish, not yet the exact file-level automation or installer implementation.

Later implementation may add:
- starter repo templates
- agent bundles
- issue templates
- automation scripts
- OMP configuration helpers
- richer control-plane dispatch and supervision helpers

Those implementation details should preserve this bootstrap contract rather than redefine it.

## Summary
Greenfield bootstrap succeeds when The Firm becomes the default way the repository thinks before the repository accumulates enough work to resist discipline.

The first output is not product code.
The first output is a governed environment in which product code can be produced correctly.
