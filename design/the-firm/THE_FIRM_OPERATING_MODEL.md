# The Firm Operating Model v0

## Purpose

This document defines how work flows through The Firm as an organization: which offices exist, what they own, where decision rights sit, how handoffs work, and which gates control movement from idea to release.

## Offices

The Firm has five functional offices:

1. Product Office
2. Architecture Office
3. Engineering Office
4. QA & Reliability Office
5. Workflow Operations Office

This split exists to prevent role blur, reduce context bloat, make handoffs explicit, and keep QA independent from implementation.

## Product Office

### Mission

Define what should be built, why it matters, and what product-level success means.

### Roles

- `product_strategist`
- `product_manager`
- `acceptance_designer`

### Responsibilities

- problem definition
- target user and value framing
- scope and non-goals
- product acceptance intent
- feature decomposition at product level

### Decides

- what problem is being solved
- what is in or out of scope
- what product success looks like

### Does not decide

- technical contracts
- implementation details
- QA sufficiency
- release confidence override

## Architecture Office

### Mission

WQ:Translate product goals into a **professional design package**—technically coherent, implementable, verifiable, and client-reviewable—before build work is authorized.

### Roles

- `context_scout`
- `callsite_auditor`
- `state_flow_mapper`
- `solution_architect`
- `verification_planner`
- `parallelization_planner`

### Responsibilities

- technical discovery
- impact analysis
- architecture decisions
- interface and contract design
- verification planning
- parallelization design

### Decides

- design boundaries
- contract changes
- impact radius
- verification requirements
- which work can run in parallel

### Does not decide

- business priority
- final QA verdict
- arbitrary scope expansion during delivery

## Engineering Office

### Mission

Implement the approved design coherently, maintainably, and with enough evidence to enter QA.

### Roles

- `engineering_lead`
- `frontend_engineer`
- `backend_engineer`
- `integration_engineer`
- `state_management_engineer`
- `refactor_engineer`
- `test_engineer`

### Responsibilities

- implementation
- refactors and full cutovers
- integration work
- targeted tests
- cleanup of obsolete paths

### Decides

- execution details within the locked design
- implementation sequencing within a wave
- local test design and supporting cleanup

### Does not decide

- product scope changes
- architectural contract changes without escalation
- issue closure without QA and verification

## QA & Reliability Office

### Mission

Independently determine whether implementation claims are supported by evidence and whether remaining risk is acceptable.

### Roles

- `qa_verifier`
- `regression_reviewer`
- `state_propagation_auditor`
- `e2e_strategist`
- `release_reviewer`

### Responsibilities

- evidence review
- regression analysis
- state propagation verification
- flow-level confidence
- release gating

### Decides

- whether evidence is sufficient
- whether more checks are required
- whether work is blocked on verification grounds
- whether release confidence is acceptable

### Does not decide

- productscope
- technical design direction
- delivery ownership

## Workflow Operations Office

### Mission

Keep the workflow itself disciplined, auditable, and dependency-aware.

### Roles

- `issue_orchestrator`
- `handoff_coordinator`
- `state_recorder`

### Responsibilities

- issue lifecycle discipline
- dependency and blocker hygiene
- handoff completeness
- state consistency
- artifact traceability

### Decides

- whether state transitions are process-valid
- whether handoff requirements are met
- whether dependencies and ownership are structurally coherent

### Does not decide

- product, architecture, engineering, or QA substance on behalf of those owners

## Ownership model

Each phase of work has one owning office at a time. Supporting roles may contribute, but they do not take phase ownership unless explicitly reassigned.

## Issue-first hard rule

If a request, task, change, review, or decision can be classified into a known workflow category, it must be represented in Beads.

No serious work should proceed as an ad hoc side thread once it is classifiable as:

- intake
- feature work
- design work
- delivery work
- QA work
- release work
- blocker work
- governance work

A professional firm logs and governs work. It does not let classified work float outside the tracker.

## Decision rights matrix

| Decision | Owner |
| --- | --- |
| Problem, scope, non-goals | Product |
| Acceptance intent | Product |
| Technical boundary and contract | Architecture |
| Parallelization design | Architecture |
| Verification depth requirement | Architecture with QA policy |
| Delivery slicing and wave structure | Engineering |
| Implementation details | Engineering |
| Evidence sufficiency | QA |
| Release confidence | QA / Release |
| State and handoff discipline | Workflow Operations |

## Handoff contract

Every cross-office handoff requires:

- source role
- target role
- work item reference
- required input artifacts
- delivered artifacts
- summary
- acceptance criteria
- open questions
- open risks
- handoff status

### Handoff statuses

- `draft`
- `submitted`
- `accepted`
- `rejected`
- `needs_revision`

## Gates

### Gate 1 — Product Readiness

Requires a sharp problem statement, clear scope, non-goals, and acceptance intent.

### Gate 2 — Discovery Completeness

Requires relevant code surfaces, impacted symbols, dependencies, and constraints to be known.

### Gate 3 — Design Lock

HW:Requires a complete design package: technical path, contract boundaries, C4 views, flow diagrams, ADRs, verification requirements, and parallelization plan.

### Gate 4 — Delivery Readiness

Requires execution waves, ownership, dependencies, and required artifacts to be explicit.

### Gate 5 — QA Entry

Requires implementation outputs plus explicit engineering claims and initial evidence.

### Gate 6 — Verification Complete

Requires QA verdict plus required propagation/E2E checks or explicit rationale for skipping them.

### Gate 7 — Final Closure

Requires release confidence, closed or accepted blockers, and complete artifact/history linkage.

## Escalation paths

- Engineering escalates to Architecture when a locked contract no longer fits reality.
- QA escalates to Engineering when evidence is missing or claims are false.
- QA escalates to Product when acceptance is internally inconsistent or unprovable.
- Workflow Operations escalates to any office when transitions, handoffs, or dependencies are invalid.

## Definition of done by office

### Product done

The work is sharply framed enough for design.

### Architecture done

NX:The design package is complete, contracts are locked, and verification expectations are precise enough for delivery.

### Engineering done

The implementation is coherent and has enough initial proof to enter QA.

### QA done

Claims are proven or explicitly left unproven with residual risk documented.

### Workflow Operations done

State, handoffs, dependencies, and artifact links are complete and auditable.
