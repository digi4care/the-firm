# The Firm Governance and Council Model v0

## Purpose

This document defines how authority, hierarchy, exception handling, and self-correction work inside The Firm.

The Firm is not a flat swarm. It is a governed software organization. That means it must make clear:

- who leads which office
- who may decide what
- when work is escalated
- when governance overrides local autonomy
- when a council is required
- how the firm corrects itself

## Governance principle

The Firm should feel coherent to the client and structured internally.

That requires:

- a small number of client-facing decision channels
- office-level ownership of discipline-specific decisions
- specialist execution within bounded autonomy
- explicit escalation for cross-domain conflict
- a governance layer for exceptions, unresolved risk, and doctrinal correction

## Hierarchy model

The Firm uses a four-layer hierarchy.

### Layer 1 — Client-facing layer

Roles:

- `client_partner`
- `intake_orchestrator`
- `engagement_manager`

Purpose:

- receive requests
- shape engagements
- maintain client alignment
- represent the firm coherently to the client

### Layer 2 — Office leadership layer

Roles:

- `product_lead`
- `architecture_lead`
- `engineering_lead`
- `qa_lead`
- `workflow_governor`

Purpose:

- own decisions inside each office domain
- supervise specialist execution
- accept or reject escalations from below
- coordinate with peer leads when work crosses offices

### Layer 3 — Specialist execution layer

Roles:

- all specialist agents inside Product, Architecture, Engineering, QA, and Workflow Operations

Purpose:

- perform scoped work
- produce artifacts
- escalate when crossing role boundaries or authority ceilings

### Layer 4 — Governance / executive layer

Roles:

- `firm_director`
- council structures when needed

Purpose:

- resolve cross-office conflicts
- decide on high-impact exceptions
- approve risk acceptance above office level
- revise doctrine or governance behavior when needed

## Office lead responsibilities

### `product_lead`

Owns:

- product framing quality
- scope integrity
- acceptance intent quality
- escalation from product specialists

### `architecture_lead`

Owns:

- technical design authority
- contract lock
- architecture escalations
- design-level risk framing
- design-package completeness verification (per risk tier)

### `engineering_lead`

Owns:

- delivery execution integrity
- engineering task slicing
- implementation escalations
- execution-level staffing changes

### `qa_lead`

Owns:

- proof sufficiency authority
- rejection escalation
- release readiness support
- verification drift control
- design testability review (before lock)

### `workflow_governor`

Owns:

- issue-state legality
- handoff discipline
- dependency and closure governance
- process truth over convenience

### `firm_director`

Owns:

- final governance authority when office-level ownership cannot legitimately resolve the issue
- doctrine exception approval at the highest layer
- cross-office arbitration when council does not reach a stable operational answer

## Decision rights

The Firm distinguishes local decisions, office-level decisions, and governance decisions.

### Local specialist decisions

A specialist agent may decide:

- how to execute its scoped work
- how to structure its local artifact
- when a local blocker exists
- when escalation is required

A specialist may not decide:

- product scope changes
- contract changes outside approved design
- verification downgrades
- closure legality
- doctrine exceptions

### Office-level decisions

An office lead may decide:

- work routing inside the office
- acceptance or rejection of escalated specialist issues
- discipline-specific standards within the doctrine
- office-level re-scope or replan inside approved engagement boundaries

An office lead may not decide alone:

- cross-office conflicts with no clear domain owner
- major doctrine exceptions
- critical unresolved risk acceptance outside the office mandate

### Governance-level decisions

Governance may decide:

- cross-office disputes
- repeated workflow failures indicating structural defect
- critical residual-risk acceptance
- doctrine exceptions
- whether a repeated issue is now a process-level rather than project-level problem

## Client interaction boundaries

The client should not directly manage the specialist swarm.

### Primary client-facing roles

- `client_partner`
- `engagement_manager`

### Secondary client-facing roles

Only when useful or explicitly requested:

- `product_lead`
- `architecture_lead`
- `qa_lead`

### Non-default direct client-facing roles

Specialist execution roles should not normally become the primary channel to the client.

Reason:
The Firm should present one coherent firm voice, not many partially aligned specialist voices.

## Council model

A council is not the default mode of decision-making. It is an escalation structure for specific classes of unresolved problems.

### Council types

#### `architecture_council`

Use for:

- technical design disputes
- cross-boundary architecture tradeoffs
- design decisions with serious downstream implications
- repeated design-package rejection (incompleteness or unverifiability)

Typical participants:

- `architecture_lead`
- `engineering_lead`
- `qa_lead`
- additional technical specialists as needed

#### `quality_council`

Use for:

- unresolved proof sufficiency disputes
- repeated reopen or verification failures
- residual-risk decisions affecting release or closure

Typical participants:

- `qa_lead`
- `engineering_lead`
- `workflow_governor`
- `release_reviewer` when relevant

#### `engagement_council`

Use for:

- scope/tradeoff conflicts affecting the client engagement itself
- major change requests
- staffing model changes that alter the engagement shape materially

Typical participants:

- `client_partner`
- `engagement_manager`
- `product_lead`
- `architecture_lead`

#### `firm_council`

Use for:

- doctrine exceptions
- repeated cross-engagement workflow breakdowns
- high-risk governance decisions
- cases where no smaller council has clear authority

Typical participants:

- `firm_director`
- relevant office leads
- `workflow_governor`

### Council triggers

A council should be considered when any of the following occur:

- repeated reopen on high-risk work
- cross-office conflict with no legitimate single decider
- doctrine exception request
- release with unresolved material residual risk
- repeated threshold events suggesting a workflow-level defect
- engagement re-scope that materially changes delivery mode, staffing, or verification burden
- design-package rejected twice for incompleteness or failure to support verification planning

### Council outputs

A council is not just a discussion. It must produce:

- a decision
- a rationale
- the affected work items or workflows
- accepted and rejected alternatives
- follow-up actions
- any changed constraints or approvals

The output should be recorded as a formal artifact or issue-linked decision record.

## Self-correction model

The Firm corrects itself at four levels.

### 1. Task-level correction

Corrects:

- local execution mistakes
- weak artifacts
- bad handoffs
- missing evidence

Handled by:

- the owning office and immediate downstream office

### 2. Workflow-level correction

Corrects:

- repeated phase friction
- poor sequencing
- handoff instability
- staffing mismatch

Handled by:

- office leads
- `workflow_governor`
- councils where needed

### 3. Engagement-level correction

Corrects:

- wrong engagement mode
- mis-scoped work
- changed client objective
- invalid staffing assumptions

Handled by:

- `client_partner`
- `engagement_manager`
- relevant office leads

### 4. Governance-level correction

Corrects:

- doctrine gaps
- repeated structural failures
- bad default constraints
- unstable council patterns

Handled by:

- `firm_director`
- `firm_council`
- `workflow_governor`
- relevant leads

## Risk acceptance model

Not all unresolved risk may be accepted at the same level.

### Specialist level

May identify and document risk.
May not accept material residual risk on behalf of the firm.

### Office lead level

May accept bounded, office-local risk within engagement and doctrine rules.

### Council or governance level

Must be involved when:

- risk crosses office boundaries
- release quality is materially affected
- the proof burden was reduced through exception
- the issue is critical-lane or high-impact

### Client involvement

If accepted risk materially changes scope, quality, schedule, or user/business exposure, it must be surfaced through the client-facing layer.

## Reopen and exception authority

### Reopen

Any office that discovers false closure may trigger reopen according to workflow rules.
Repeated reopen escalates upward automatically.

### Exceptions

Local exceptions may be proposed but not silently applied outside local authority ceilings.
Repeated or significant exceptions require lead or council approval.

## Governance anti-patterns

### 1. Permanent council mode

If ordinary work needs council continuously, office ownership is broken.

### 2. Fake autonomy

If specialists appear autonomous but are constantly overruling doctrine implicitly, governance is weak.

### 3. Governance bottlenecking normal work

If every decision goes upward, the hierarchy is too centralized.

### 4. Client routed into specialist chaos

If the client has to manage internal routing directly, the front-facing model has failed.

### 5. Unowned residual risk

If no one can say who accepted the risk, governance has failed.

## Summary

The Firm governs through bounded autonomy.

Specialists do the work.
Office leads own their domains.
Councils resolve exceptional ambiguity and cross-domain conflict.
Governance steps in when truth, risk, or doctrine can no longer be managed locally.
