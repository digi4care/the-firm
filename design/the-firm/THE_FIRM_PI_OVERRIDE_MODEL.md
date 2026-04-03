# The Firm Pi Override Model v0

## Purpose

This document defines how The Firm overrides Pi's default workflow behavior.

The Firm does not treat Pi as a complete operating model. It treats Pi as the runtime in which a stricter, issue-driven, role-specialized system operates.
This document therefore defines how The Firm replaces Pi's default assumptions across:

- context
- agents
- workflow progression
- verification
- issue control
- orchestration

## The override principle

Pi remains the execution substrate.
The Firm becomes the governing layer.

That means:

- Pi tools still execute work
- Pi sessions still host agent reasoning
- Pi subagents still perform specialized tasks
- but work is no longer governed by generic agent autonomy alone

Instead, work is governed by The Firm’s:

- philosophy
- doctrine
- issue tracker model
- verification policy
- operating model
- workflow architecture

## What is being overridden

The Firm overrides Pi at six layers.

### 1. Context override

Default Pi behavior assumes a general coding-assistant context model.

The Firm replaces that with:

- issue-first assignments
- role-specific context slices
- explicit phase context
- artifact-driven handoffs
- intent-aware framing
- stop and escalation rules

The goal is to prevent broad, ambiguous, over-empowered context windows.

### 2. Agent override

Default Pi behavior can operate with broad, generalist agent patterns.

The Firm replaces that with a catalog of specialist roles such as:

- Product roles
- Architecture roles
- Engineering roles
- QA roles
- Workflow Operations roles

Agents are expected to act within narrow responsibility boundaries and to escalate rather than improvise outside their lane.

### 3. Workflow override

Default Pi behavior allows useful work to happen with relatively flexible sequencing.

The Firm replaces that with:

- explicit phases
- issue-state gates
- handoff requirements
- dependency-driven readiness
- closure discipline

In The Firm, chat completion is not workflow completion.

### 4. Verification override

Default Pi behavior may stop at implementation plus ad hoc checking.

The Firm replaces that with:

- mandatory QA for non-trivial work
- risk-tiered verification depth
- explicit propagation-check policy
- explicit E2E-check policy
- invalid closure without proof

### 5. Control-plane override

Default Pi behavior can operate primarily out of session context, file context, and ad hoc task decomposition.

The Firm replaces that with:

- Beads as the visible work graph
- Dolt-backed workflow state and evidence records
- issue-defined readiness and claiming
- issue-defined blockers and closure

### 6. Orchestration override

Default Pi behavior permits direct task delegation whenever useful.

The Firm replaces that with:

- orchestrated role handoffs
- dependency-aware waves
- designed parallelization
- issue-governed subagent execution
- explicit distinction between task-tool usage and higher-order pipeline orchestration

## Runtime role of Pi

Within The Firm, Pi is responsible for:

- hosting agent sessions
- providing tools for reading, editing, searching, verification, and execution
- running specialist agents and subagents
- enabling local orchestration and delegation
- supporting project-level customization through context and agent definitions

Pi is not the source of governance truth.
Governance truth lives in The Firm doctrine plus the issue tracker and versioned workflow state.

## Override mechanisms

The Firm overrides Pi through a combination of mechanisms.

### A. Project doctrine files

The Firm provides project-local guidance that reshapes runtime expectations, such as:

- AGENTS-style project doctrine
- workflow doctrine docs
- role expectations
- issue-control expectations

### B. Custom agent catalog

The Firm defines its own specialist agents that Pi discovers and runs.

These agents inherit The Firm doctrine rather than generic assistant assumptions.

### C. Workflow contracts

The Firm requires every serious agent task to be tied to:

- a work item
- a phase
- a role boundary
- an expected artifact
- a downstream consumer
- a gate or closure condition

### D. Verification policy integration

The Firm injects verification obligations into execution.

Agents do not decide casually whether proof is necessary; they work against predeclared verification expectations.

### E. Issue-driven orchestration

The Firm uses the issue graph to decide:

- when work is ready
- who can claim it
- what can run in parallel
- what is blocked
- what may close

## Behavioral differences from default Pi

### Default Pi tendency

- a competent coding agent can often move directly from request to execution
- tasking can be flexible and ad hoc
- completion can be inferred from code changes and local checks
- agent autonomy is relatively broad

### The Firm behavior

- no serious work starts without issue framing
- no serious work moves phases without gates
- no broad autonomy outside role boundaries
- no handoff without artifacts
- no closure without proof and QA
- no parallelization without dependency design
- no tranche-end pause while parent scope remains unfinished; the next governed work item must be opened and execution must continue unless a real blocker exists

## Agent categories under The Firm

Pi agents in The Firm are grouped into offices rather than a flat utility list.

### Product Office

Examples:

- `product_strategist`
- `product_manager`
- `acceptance_designer`

### Architecture Office

Examples:

- `context_scout`
- `callsite_auditor`
- `state_flow_mapper`
- `solution_architect`
- `verification_planner`
- `parallelization_planner`

### Engineering Office

Examples:

- `engineering_lead`
- `frontend_engineer`
- `backend_engineer`
- `integration_engineer`
- `state_management_engineer`
- `refactor_engineer`
- `test_engineer`

### QA & Reliability Office

Examples:

- `qa_verifier`
- `regression_reviewer`
- `state_propagation_auditor`
- `e2e_strategist`
- `release_reviewer`

### Workflow Operations Office

Examples:

- `issue_orchestrator`
- `handoff_coordinator`
- `state_recorder`

## Pi task tool under The Firm

The task tool is still useful, but its usage is narrowed.

### Under The Firm, the task tool should be used for

- executing specialist work items
- parallel waves already legitimized by design
- scoped investigation inside explicit role boundaries
- review and verification subtasks tied to issue state

### Under The Firm, the task tool should not be treated as

- a substitute for issue decomposition
- a substitute for design lock
- a substitute for QA governance
- a freeform swarm of autonomous agents without issue-state control

## Swarm and higher-order orchestration

The Firm distinguishes between:

- local task-tool delegation
- repeatable, multi-wave orchestration

### Task tool is preferred when

- the work is contained within one immediate workflow phase
- the number of subagents is modest
- orchestration state can remain local to the current work item

### Higher-order orchestration is preferred when

- the process is repeatable across repos or teams
- multiple waves or long-running coordination are required
- specialized roles must repeatedly interact under a stable pattern
- pipeline status needs explicit persistence and inspection

In practice, this is where swarm-style orchestration may become part of The Firm implementation.

## Mandatory runtime expectations

Any Pi runtime operating under The Firm must preserve the following truths:

- issue state outranks chat momentum
- role boundaries outrank convenience
- artifact handoffs outrank implicit memory
- QA verdict outranks implementer confidence
- verification policy outranks ad hoc optimism
- closure state outranks local completion feeling
- local stop rules must not be misused as tranche-end parking brakes when the parent plan is still unfinished

## Greenfield override mode

In greenfield repos, The Firm should override Pi from the start.

That means:

- issue tracker initialized immediately
- The Firm docs installed as canonical workflow doctrine
- specialist agents available from day one
- no fallback to generic workflow assumptions

## Brownfield override mode

In brownfield repos, The Firm acts as an overlay until the project can tolerate stricter enforcement.

That means:

- adoption begins with assessment
- issue-driven control starts on selected workstreams
- existing repo realities are mapped into The Firm phases
- enforcement increases over time

The goal is still full override, but through staged adoption instead of abrupt replacement.

## Implementation implications

To implement The Firm inside Pi, the project will eventually need:

- project-local docs that encode doctrine and workflow rules
- a The Firm-specific agent catalog
- issue-driven execution conventions
- verification-aware handoff patterns
- clear distinction between task execution and workflow governance

Those implementation details belong in later bootstrap and adoption documents.

## Summary

The Firm does not replace Pi as software.
It replaces Pi's default operating assumptions.

Pi remains the runtime engine.
The Firm supplies the professional operating system that governs how that engine is used.
