# The Firm Context Model v0

## Purpose
This document defines how The Firm handles context for agents, workflows, and handoffs.

The Firm does not treat context as "whatever seems useful to paste into the prompt." Context is a governed system. It must be deliberately selected, role-scoped, phase-scoped, compact enough to stay truthful, and rich enough to support correct decisions.

This model is informed by strong context-engineering patterns seen in other agent systems, but the version here is The Firm’s own: issue-first, role-specialized, engagement-aware, and verification-aware.

## Context principles
The Firm uses context according to these principles:
- context quality matters more than context volume
- context must be selected deliberately
- context must be scoped to role and phase
- context must be tied to work items and artifacts
- handoffs should replace historical sprawl
- context loading should be explicit, not assumed
- old context should be compacted or retired when it stops helping truth

## Why context needs a model
Without a context model, AI workflows drift because agents receive too much, too little, or the wrong kind of information.

Typical failures include:
- optimizing for the wrong outcome because intent was missing
- broad context windows that blur role boundaries
- downstream agents inheriting messy upstream history instead of clean handoffs
- stale context surviving after design, staffing, or verification decisions changed
- excessive token spend without better decisions

The Firm treats these as systems failures, not as inevitable model behavior.

## Context layers
The Firm uses six context layers.

### 1. Doctrine context
Stable, low-churn context that tells the agent how The Firm works.

Examples:
- philosophy
- doctrine
- core operating assumptions
- high-level role rules

Purpose:
- shape mentality and decision boundaries

### 2. Engagement context
Client and engagement truth captured at the front door.

Examples:
- `intake.yml`
- engagement type
- client steering preference
- review points
- constraints and desired outcomes

Purpose:
- preserve client intent and prevent local optimization from overriding the engagement objective

### 3. Project context
Repository or system truth that defines the operating environment.

Examples:
- architecture boundaries
- repo topology
- standards
- test landscape
- brownfield assessment findings

Purpose:
- anchor work in the actual system, not an abstract one

### 4. Work-item context
The immediate truth needed to execute one scoped piece of work.

Examples:
- issue id
- phase
- dependencies
- acceptance
- owner role
- required artifacts
- verification obligations

Purpose:
- make the next legal action clear

### 5. Handoff context
The compact, downstream-facing output of one phase or role.

Examples:
- summary of completed work
- artifact refs
- open risks
- unresolved questions
- next expected action

Purpose:
- replace unbounded historical conversation with a clean transfer packet

### 6. Verification context
The truth about what must be proven and how that proof should be judged.

Examples:
- risk tier
- required proof layers
- propagation/E2E obligations
- accepted waivers
- residual risk framing

Purpose:
- prevent implementation from redefining its own burden of proof

## Context packets
The Firm should package context into named, composable packets.

### Canonical packet types
- `firm_doctrine_packet`
- `engagement_packet`
- `project_packet`
- `work_item_packet`
- `handoff_packet`
- `verification_packet`

These do not have to be separate files in every implementation, but they should exist as separable conceptual units.

## Example packet structure
```yaml
work_item_packet:
  issue_id: bd-a3f8.2
  phase: implementation
  owner_role: backend_engineer
  objective: Implement the locked API contract change
  desired_outcomes:
    - endpoint returns the new response shape
    - existing approved consumers remain compatible
  constraints:
    - do not widen scope
    - do not alter auth semantics
  required_inputs:
    - technical-design.md
    - acceptance.md
    - callsite-impact.md
  required_outputs:
    - code changes
    - test evidence
    - implementation notes
  verification:
    risk_tier: R2
    requires_boundary_proof: true
    requires_propagation_check: false
    requires_e2e: false
  stop_rules:
    - stop on contract ambiguity
    - stop if hidden consumers emerge
```

## Role-scoped context loading
Different roles require different slices of truth.

### Client-facing roles need
- doctrine context
- engagement context
- selected project context when necessary

### Product roles need
- doctrine context
- engagement context
- selected project context
- work-item context for planning artifacts

### Architecture roles need
- doctrine context
- engagement context where relevant
- project context
- work-item context
- prior handoff context

### Engineering roles need
- doctrine context in compact form
- locked design and acceptance
- project context relevant to the scoped work
- work-item context
- verification expectations

### QA roles need
- acceptance
- locked design
- implementation outputs
- verification context
- handoff context from engineering

### Workflow operations roles need
- issue graph truth
- handoff state
- artifact references
- current workflow status

## Core rule
No role should receive the entire available context by default.
Each role receives the minimum truthful set required to act correctly.

## Explicit loading policy
The Firm does not rely on agents implicitly "remembering" the right things.

### Required behavior
Before meaningful execution, the workflow should explicitly assemble the required context packets for the target role and phase.

### Implication
A serious task should not begin with only:
- the client’s raw request
- loose chat history
- assumed repository memory

It should begin with:
- role-appropriate doctrine
- current work-item packet
- necessary project or engagement packets
- required handoff or verification packets

## Context discovery
The Firm treats context discovery as a dedicated responsibility, not as an incidental side effect of execution.

### Primary context discovery role
`context_scout`

### Supporting roles
- `callsite_auditor`
- `state_flow_mapper`
- `intake_orchestrator` for engagement context

### Discovery output
The goal of discovery is not to hand every file downstream. The goal is to produce a smaller, more truthful context surface for the next role.

## Handoff-based compaction
The Firm avoids forcing downstream agents to digest the entire upstream history.

### Rule
At office boundaries, old execution history should be compacted into handoff artifacts and packets.

### Example
Instead of giving QA the entire implementation conversation, provide:
- implementation notes
- changed surface summary
- evidence produced
- open risks
- unresolved questions
- relevant artifacts

That keeps QA focused on verification rather than archaeological reconstruction.

## Context lifecycle
Context is not permanent by default.

### Persistent context
- doctrine context
- core engagement context
- stable project context

### Phase-bounded context
- work-item packet
- active verification packet
- active handoff packet

### Expiring context
- exploratory notes that have been superseded
- stale design options after design lock
- outdated risk classifications after reclassification
- old handoff packets after a new accepted handoff replaces them

## Lifecycle rule
When context is superseded, the workflow should preserve traceability in state/history but stop feeding obsolete material into execution prompts by default.

## Anti-drift rules
The Firm should enforce these anti-drift rules.

### 1. No full-history inheritance
Do not pass entire conversations across offices if a handoff artifact can replace them.

### 2. No unbounded context loading
Do not load every related document just because it exists.

### 3. No role-blind context packs
Do not give engineering product governance material or QA raw discovery noise unless it is directly needed.

### 4. No stale decision context after lock
Once design lock is established, old alternative options should not continue to influence execution by default.

### 5. No context without issue anchor
If context cannot be tied to an engagement, project, work item, handoff, or verification obligation, it is suspect.

### 6. No context flooding to compensate for unclear intent
If the request is unclear, clarify it. Do not dump more documents into the window and hope the ambiguity disappears.

## Context budgets
The Firm should eventually define practical context budgets.

Possible budget dimensions:
- maximum number of primary artifacts loaded per phase
- maximum number of context packets loaded by default
- threshold for mandatory compaction at office boundaries
- threshold for requiring a context discovery pass before execution

The exact numbers belong in operational constraints, but the principle belongs here: context must be curated.

## Relationship to issue tracker and state
The issue tracker model answers:
- what work exists
- what depends on what
- who owns what
- what can move next

The context model answers:
- what truth should each role receive in order to act on that work correctly

Dolt-backed state ensures that context history remains auditable even after active context is compacted.

## Relationship to verification
Verification obligations must travel with the work.

That means:
- risk tier belongs in context
- required proof layers belong in context
- accepted waivers belong in context
- residual risk belongs in context

Without that, implementation and QA will drift apart.

## Relationship to client engagement
The intake and engagement model is the upstream source of client intent.

The context model ensures that this intent survives long enough to influence product, architecture, engineering, and QA decisions without forcing every downstream role to reload the entire intake history.

## Summary
The Firm treats context as a designed system of packets, not prompt clutter.

The purpose of the context model is to ensure that:
- each role gets the truth it needs
- no role drowns in irrelevant history
- intent survives handoffs
- stale information stops steering live execution
- workflow quality does not collapse under context drift
