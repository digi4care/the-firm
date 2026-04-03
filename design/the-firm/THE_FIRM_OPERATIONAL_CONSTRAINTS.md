# The Firm Operational Constraints v0

## Purpose

This document defines the hard and soft limits that keep The Firm from drifting into endless loops, hidden cost explosions, false progress, or ungoverned autonomy.

If doctrine defines how The Firm should behave, operational constraints define when behavior must stop, escalate, re-scope, or restart.

This model covers:

- iteration caps
- escalation thresholds
- reopen policy
- waiver budgets
- autonomy ceilings
- stop, scrap, replan, and re-scope triggers
- lane-sensitive operating limits

## Why constraints are necessary

A disciplined organization does not merely define roles and workflows. It also defines what happens when work keeps failing, keeps changing, or keeps slipping through weak controls.

Without operational constraints, multi-agent systems tend to degrade into:

- repeated retries without learning
- review ping-pong
- silent scope expansion
- unbounded exception handling
- excessive verification spend without better truth
- authority drift between roles

The Firm treats those as organizational defects, not just execution defects.

## Constraint categories

The Firm uses six constraint families.

### 1. Iteration constraints

How many times a phase, handoff, or correction loop may repeat before higher review is required.

### 2. Escalation constraints

When an issue must move upward to a lead, governance owner, or council.

### 3. Reopen constraints

How many times a supposedly completed item may be reopened before structural failure is assumed.

### 4. Waiver constraints

How many skips, exceptions, or reduced-proof decisions are allowed before stronger approval is required.

### 5. Autonomy constraints

What each role may decide independently and where decision ceilings apply.

### 6. Lane constraints

How strict the above rules become based on work criticality or engagement mode.

## Iteration caps

The Firm does not permit infinite correction loops.

### Product framing

- maximum 2 major reframes before escalation to `client_partner` and `product_lead`

Reason:
if the problem cannot stabilize after two serious reframes, the work is not ready for downstream commitment.

### Technical discovery

- maximum 2 expansion rounds before escalation to `architecture_lead`

Reason:
discovery that keeps widening usually signals that the initiative is larger or less bounded than assumed.

### Design lock

#### Completeness gate

A design may not be locked until the `architecture_lead` confirms:

- Required artifacts for the risk tier are present per verification policy
- Contracts are defined to the level implementation needs
- Interfaces are specified sufficiently for consumer impact assessment

#### Reviewability gate

A design is not reviewable if:

- No `qa_lead` has confirmed the design supports verification planning
- For R3+ work: no propagation or flow analysis exists
- For R4 work: no risk-tier confirmation or ADR record exists

#### Lock iteration constraint

- maximum 2 substantial design revisions before `architecture_lead` must decide one of:
  - lock
  - split
  - re-scope
  - stop
  - escalate

Reason:
design should be iterative, but not indefinitely fluid.

### Delivery planning

- maximum 2 replans before `engineering_lead` and `workflow_governor` review the engagement shape

Reason:
if planning keeps collapsing, the problem is probably upstream of scheduling.

### Implementation attempt loop

- maximum 2 failed implementation attempts on the same scoped item before mandatory escalation

Reason:
a third try without redesign often hides architecture or scope failure.

### QA rejection loop

- maximum 2 QA rejection cycles per item before escalation to `qa_lead` plus the relevant office lead

Reason:
beyond two cycles, the problem is rarely just sloppy execution.

## Escalation thresholds

The following events trigger mandatory escalation.

### Threshold 1 — repeated same-phase failure

If the same phase fails twice, escalate to the owning office lead.

### Threshold 2 — repeated cross-office rejection

If two handoffs between the same offices are rejected on the same work item, escalate to both office leads.

### Threshold 3 — critical-path verification failure

If a critical-path verification check fails late in the workflow, escalate to release authority and, where relevant, council review.

### Threshold 4 — prolonged blocked state

If a work item remains blocked beyond the lane-appropriate threshold without meaningful progress, escalate to engagement review.

### Threshold 5 — repeated reopen

If a work item or feature is reopened more than once, escalate to governance review.

### Threshold 6 — design-package rejection

If `architecture_lead` or `qa_lead` rejects a design package for incompleteness twice, escalate to both leads plus `engineering_lead` to determine:

- whether the work is ready for design phase at all
- whether risk tier needs adjustment
- whether staffing or discovery is inadequate

## Reopen policy

Reopen is allowed because closure must tell the truth. But repeated reopen is a structural signal.

### Single reopen

One reopen is treated as an honest correction.

### Second reopen

A second reopen on the same item or feature requires:

- lead review
- re-evaluation of verification sufficiency
- re-evaluation of issue decomposition

### Third reopen

A third reopen is presumed to be a workflow or doctrine failure unless proven otherwise.
It requires governance-level intervention.

## Waiver budgets

The Firm permits exceptions, but only with bounded budgets.

### Verification waiver budget

For normal work:

- at most 1 non-critical verification waiver per feature before lead approval is required for any further waivers

For critical work:

- no waiver without explicit higher approval

### Lifecycle shortcut budget

- at most 1 shortcut or exceptional bypass per feature before workflow governance review is required

### Ownership exception budget

- at most 1 temporary ownership exception per feature without lead approval

Reason:
one exception may reflect reality; repeated exceptions indicate the workflow shape is wrong.

## Autonomy ceilings

The Firm defines ceilings on what roles may do without escalation.

### Specialist execution roles may

- implement scoped changes
- add or update local proof where appropriate
- request clarification
- propose issue splits
- report blockers

### Specialist execution roles may not

- widen product scope
- alter locked contracts unilaterally
- reduce required verification depth
- close issues as verified on their own authority
- approve their own cross-office handoffs unilaterally

### QA roles may

- reject work
- demand more evidence
- block closure
- escalate contradictory acceptance or missing proof

### QA roles may not

- secretly fix implementation and treat that as review
- rewrite product scope
- reduce risk classification unilaterally for convenience

### Workflow operations roles may

- enforce state validity
- refuse invalid transitions
- demand handoff completeness
- surface dependency incoherence

### Workflow operations roles may not

- make product, design, or implementation decisions on behalf of other offices

### Client-facing roles may

- clarify objective
- alter priorities
- request scope reconsideration
- trigger engagement replanning

### Client-facing roles may not

- override verification legality directly
- silently bypass office or governance gates

## Stop, scrap, replan, and re-scope rules

The Firm needs explicit outcomes when limits are reached.

### Stop

Use when:

- the objective is still unclear
- contradictory instructions remain unresolved
- no truthful next action exists

### Scrap and restart

Use when:

- the run produced low-trust output
- correction would cost more than rerunning correctly
- the issue was executed under the wrong assumptions from the start

### Replan

Use when:

- task sequencing is wrong
- staffing is mismatched
- the execution path is valid but badly organized

### Re-scope

Use when:

- the issue is too broad
- hidden subproblems emerge
- a feature or task must be split into smaller truthfully ownable units

### Escalate

Use when:

- the problem is no longer local to one role or phase
- a decision exceeds current authority
- risk acceptance or doctrine exception is required

## Lane-sensitive constraints

The Firm should not apply identical strictness to every lane.

### Fast lane

Intended for low-risk, low-coupling work.

Characteristics:

- fewer reviews
- lower verification burden
- shorter blocked-state tolerance
- fewer required stakeholders

But still:

- no silent scope drift
- no invalid closure
- QA remains mandatory when work is non-trivial

### Standard lane

Default operating lane.

Characteristics:

- all normal iteration caps apply
- verification follows risk tier
- office leads intervene at repeated failure thresholds

### Critical lane

Used for critical-path, high-coupling, or high-risk work.

Characteristics:

- tighter waiver budgets
- faster escalation
- more explicit release authority
- lower tolerance for repeated retries
- council review triggered earlier

## Suggested blocked-state thresholds

Exact time units may later be parameterized by implementation, but policy-wise:

### Fast lane

Blocked state should trigger quick review because the work should be simple.

### Standard lane

Blocked state should trigger office-level review after a moderate delay or repeated non-progress cycles.

### Critical lane

Blocked state should trigger prompt escalation because cost of hidden drift is high.

## Council triggers

The following situations are strong candidates for council-style review:

- cross-office conflict with no single legitimate decider
- repeated reopen on high-risk work
- release decision with unresolved residual risk
- doctrine exception requests
- repeated failure pattern across multiple similar engagements

## Constraint recording

Whenever a constraint threshold is hit, the workflow should record:

- which threshold was triggered
- what work item it affected
- what corrective action was chosen
- who approved that action
- whether the event indicates local failure or systemic failure

This keeps constraints from becoming invisible tribal knowledge.

## Relationship to verification policy

The verification policy defines what proof is required.
This document defines how many retries, waivers, or correction loops are tolerated before the burden of proof becomes a governance problem rather than a local execution problem.

## Relationship to client engagement

Client steering may alter objectives, priorities, or scope, but it does not erase operational constraints.

If a client request would exceed constraint policy, The Firm should:

- explain the consequence
- re-scope or reclassify the engagement
- escalate to the proper decision layer

## Summary

The Firm does not just define how work should flow.
It defines how long the organization will tolerate drift, retries, exceptions, and ambiguity before stronger intervention occurs.

These constraints are what turn a good-looking workflow into a governable operating system.

## Entropy constraint

If client or operator input accumulates faster than the firm can classify and route it, The Firm should stop adding ad hoc execution and first restore order by:

- creating or updating backlog items
- reclassifying the active run
- splitting workstreams
- or escalating to engagement review

Conversational entropy is not a reason to skip structure. It is a reason to strengthen it.
