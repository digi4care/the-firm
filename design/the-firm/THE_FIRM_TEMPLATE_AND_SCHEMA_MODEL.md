# The Firm Template and Schema Model v0

## Purpose

This document defines the canonical structured artifacts that make The Firm executable.

The design stack already defines philosophy, doctrine, workflow, governance, context, and constraints. This document turns those models into concrete artifact shapes that can later power:

- repo templates
- bootstrap scripts
- installers
- issue-linked runtime assets
- agent handoffs
- audits and verification

## Design principle

The Firm should prefer structured artifacts for recurring workflow objects.

That means:

- if an artifact recurs, give it a stable schema
- if an artifact crosses office boundaries, make its shape explicit
- if an artifact influences issue state or closure, make its fields auditable

The goal is not bureaucracy. The goal is repeatability, anti-drift, and machine-actionable governance.

## Canonical artifact families

The Firm should standardize the following artifacts first:

- `intake.yml`
- `intake-summary.md`
- `engagement.yml`
- `staffing-decision.md`
- `handoff.yml` or `handoff.md`
- `technical-design.md`
- `delivery-plan.md`
- `qa-verdict.md`
- `release-readiness.md`
- `council-decision.md`

Not every engagement will use every artifact immediately, but the schema family should remain stable across repos.

## 1. `intake.yml`

### Purpose

The canonical structured intake record for new client requests or internal engagements.

### Required fields

```yaml
intake:
  id: string
  status: new | clarifying | classified | staffing_pending | approved | in_delivery | paused | closed
  created_at: string
  updated_at: string

client:
  name: string
  primary_contact: string
  interaction_mode: collaborative | guided | delegated
  steering_preference: low | medium | high

request:
  title: string
  type: idea-shaping | plan-review | plan-optimization | greenfield-build | brownfield-adoption | scoped-delivery | rescue
  summary: string
  source_material: string[]

intent:
  objective: string
  desired_outcomes: string[]
  health_metrics: string[]
  constraints: string[]
  stop_rules: string[]

engagement:
  type: advisory | discovery | scoped-delivery | full-delivery | recovery
  mode: string
  risk_level: low | medium | high | critical
  lane: fast | standard | critical
  requires_council: boolean

assessment:
  greenfield: boolean
  brownfield: boolean
  plan_supplied_by_client: boolean
  repo_exists: boolean
  architecture_known: none | partial | strong
  testing_maturity: unknown | low | medium | high

staffing:
  recommended_team: string[]
  optional_roles: string[]
  excluded_roles: string[]

next_step:
  owner: string
  action: string

artifacts:
  required: string[]
  planned_outputs: string[]
```

### Ownership

Primary owner:

- `intake_orchestrator`

Contributors:

- `client_partner`
- `engagement_manager`

## 2. `intake-summary.md`

### Purpose

Human-readable explanation of what the intake concluded.

### Minimum sections

- Request summary
- Classified engagement type
- Client objective and desired outcomes
- Known constraints
- Proposed staffing mode
- First recommended next step
- Open questions

## 3. `engagement.yml`

### Purpose

The canonical state record for an approved engagement after intake.

### Required fields

```yaml
engagement:
  id: string
  intake_id: string
  name: string
  mode: greenfield | brownfield
  type: advisory | discovery | scoped-delivery | full-delivery | recovery
  status: approved | active | paused | completed | closed
  lane: fast | standard | critical
  client: string
  owner: string
  review_points: string[]
  current_phase: string
  active_work_items: string[]
  risk_level: low | medium | high | critical
  doctrine_exceptions: string[]
```

### Ownership

Primary owner:

- `engagement_manager`

Supporting owners:

- `client_partner`
- `workflow_governor`

## 4. `staffing-decision.md`

### Purpose

Explain why the firm selected a particular team shape and who is intentionally not staffed.

### Minimum sections

- Engagement classification
- Minimum sufficient team
- Optional roles held in reserve
- Excluded roles and why
- Lane/risk impact on staffing
- Trigger conditions for restaffing

## 5. `handoff.yml` / `handoff.md`

### Purpose

Explicitly transfer work from one office or role to another.

### Recommended structured fields

```yaml
handoff:
  id: string
  source_role: string
  target_role: string
  work_item_id: string
  status: draft | submitted | accepted | rejected | needs_revision
  summary: string
  required_inputs: string[]
  delivered_artifacts: string[]
  acceptance_conditions: string[]
  open_questions: string[]
  open_risks: string[]
  next_expected_action: string
```

### Ownership

Producer:

- source role

Acceptor:

- target role

### Rule

No cross-office transition should rely only on prose in chat when a handoff artifact is expected.

### Minimum sections

- **Problem framing**: what is being solved and why

- **Changed surfaces**: files, modules, APIs, databases affected

- **Design decisions**: ADR-style records of decisions made (status: proposed | accepted | deprecated | superseded)

- **Contracts and boundaries**: interfaces, data shapes, invariants, error contracts

- **Integration boundaries**: upstream/downstream dependencies, external system touchpoints, protocol contracts

- **C4 views** (where scope/risk warrants): context, container, and component diagrams showing system scope and internal structure

- **Flow views** (where state/sequence matters): key sequence diagrams or state-flow diagrams for critical paths

- **Non-goals**: explicitly out of scope

- **Risks**: technical and delivery risks with mitigation or acceptance

- **Rollout/migration notes**: deployment sequence, backward compatibility, data migration, rollback strategy

- **Verification requirements**: what must be proven, at what depth, by whom

- **Verification mapping**: which tests cover which contracts, propagation checks required, E2E obligations

- **Parallelization guidance**: safe execution waves and dependency boundaries

## 7. `delivery-plan.md`

### Purpose

Translate a locked design into executable work.

### Minimum sections

- Work breakdown
- Dependency order
- Parallel waves
- Owner roles
- Required artifacts
- Verification tasks
- Escalation points

## 8. `qa-verdict.md`

### Purpose

Record the verification judgment for a work item, feature, or release candidate.

### Recommended structure

```yaml
qa_verdict:
  work_item_id: string
  risk_tier: R0 | R1 | R2 | R3 | R4
  status: verified | blocked | needs_more_evidence
  claims_checked: string[]
  evidence_used: string[]
  checks_executed: string[]
  checks_skipped: string[]
  skip_rationale: string[]
  residual_risk: string[]
  next_action: string
```

### Human-readable sections

- Claims reviewed
- Evidence considered
- Missing evidence if any
- Residual risk
- Verdict and next action

## 9. `release-readiness.md`

### Purpose

Record whether a feature, milestone, or engagement is fit to close or release.

### Minimum sections

- Scope reviewed
- Verification summary
- Residual risks
- Required approvals
- Go / no-go decision
- Follow-up obligations

## 10. `council-decision.md`

### Purpose

Record a governance or council decision with durable rationale.

### Required sections

- Trigger for council review
- Participants
- Issue(s) under consideration
- Decision
- Rationale
- Alternatives rejected
- Required follow-up actions
- Risk accepted or deferred

## Artifact placement

The Firm should separate artifact types by function.

### Intake artifacts

Location:

- `.firm/intake/<engagement-id>/`

Examples:

- `intake.yml`
- `intake-summary.md`
- `staffing-decision.md`

### Engagement artifacts

Location:

- `.firm/engagements/<engagement-id>/`

Examples:

- `engagement.yml`
- `engagement-plan.md`
- `review-points.md`
- `change-log.md`

### Delivery and verification artifacts

Location:

- `.firm/artifacts/<engagement-id>/`

Examples:

- `technical-design.md`
- `delivery-plan.md`
- `handoff-*.yml`
- `qa-verdict.md`
- `release-readiness.md`
- `council-decision.md`

## Roadmap placement

The engagement roadmap for a client project should live in the project repo, not only in the The Firm dev repo.

### Preferred model

Use engagement-centered placement:

- `.firm/engagements/<engagement-id>/engagement.yml`
- `.firm/engagements/<engagement-id>/roadmap.md`

Rather than a rigid top-level `greenfield/` or `brownfield/` directory, The Firm should encode:

- engagement mode in `engagement.yml`
- roadmap location under the engagement directory

### Example

```yaml
engagement:
  id: eng-001
  mode: greenfield
  type: full-delivery
```

or

```yaml
engagement:
  id: eng-002
  mode: brownfield
  type: adoption
```

This is cleaner, more scalable, and better for multiple simultaneous engagements.

## Schema ownership

### Intake schemas

Owned by:

- Client-facing layer
- Workflow operations input

### Handoff and delivery schemas

Owned by:

- Architecture
- Engineering
- Workflow operations

### QA and release schemas

Owned by:

- QA & Reliability
- Governance where relevant

## Validation expectations

Eventually, these schemas should be machine-validatable.

That may later mean:

- YAML or JSON schema definitions
- template generators
- installer support
- issue-state synchronization checks

But even before automation, the schema contract should remain stable enough for humans and agents to follow consistently.

## Anti-patterns

### 1. Freeform artifacts for recurring workflows

If every handoff or QA verdict has a different shape, drift is guaranteed.

### 2. Schema without ownership

If no office owns the meaning of a structured artifact, the artifact will decay.

### 3. Treating templates as optional style suggestions

In The Firm, templates exist to preserve intent, quality, and auditability.

### 4. Encoding too much into top-level directory names

Greenfield vs brownfield should be engagement metadata, not the only organizing dimension.

## Relationship to future installer

This document is the bridge to a future installer.

An installer should eventually be able to:

- place the canonical directory structure
- generate starter intake and engagement artifacts
- install starter templates
- seed The Firm runtime assets

The installer should implement this schema model, not invent a different one.

## Summary

The Firm template and schema model defines the recurring artifacts that make the operating system executable.

It gives:

- intake a structure
- engagements a state shape
- handoffs a contract
- QA a durable verdict format
- governance a record of difficult decisions
- future installers a stable target to generate
