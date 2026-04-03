# The Firm Client Engagement Model v0

## Purpose

This document defines how The Firm interacts with a client before and during delivery.

The Firm is not only an internal delivery machine. It is also a client-facing software organization. That means it needs a formal front door, a way to classify requests, a way to decide which team is required, and a way to keep the client involved without exposing the entire internal hierarchy.

This model defines:

- intake flow
- client-facing roles
- engagement classification
- staffing logic
- intake state
- the `intake.yml` artifact
- client steering during delivery
- change-request handling

## Entropy handling principle

The client is not responsible for pre-structuring work into perfect software-delivery form.

The Firm is responsible for absorbing messy, partial, shifting, or high-entropy client input and converting it into a governed engagement with:

- explicit classification
- staffing
- backlog shape
- run or wave structure
- review points
- closure conditions

The client may bring entropy. The Firm must respond with structure.

## Design-first commitment

XM:
TB:Before any build work begins, The Firm produces a **professional design package** that is reviewable, versioned, and verifiable.
YQ:
WK:This is not overhead. It is how client entropy becomes coherent architecture.
SZ:

## Core principle

The client should not need to understand the entire internal structure of The Firm.

Externally, The Firm should feel coherent, guided, and accountable.
Internally, it may coordinate across many offices and specialist agents.

The client therefore interacts primarily through a small number of front-facing roles, while internal orchestration remains structured and issue-driven.

## Client-facing roles

## `client_partner`

### Mission

Primary relationship holder for the client.

### Responsibilities

- understand the client’s true objective
- maintain alignment during the engagement
- surface risks, tradeoffs, and decisions to the client
- prevent the client from having to manage internal specialist routing directly

### Typical moments of interaction

- initial intake
- scope clarification
- plan review discussions
- tradeoff decisions
- change requests
- milestone reviews
- risk acceptance conversations

## `intake_orchestrator`

### Mission

Structure new requests into a formal engagement entry.

### Responsibilities

- gather initial context
- classify the request type
- open and maintain intake state
- determine the first valid next step
- propose the first staffing shape

### Typical moments of interaction

- first contact
- clarification loops
- request classification
- engagement handoff into product/discovery/delivery

## `engagement_manager`

### Mission

Convert a qualified request into a staffed and governable engagement.

### Responsibilities

- choose engagement mode
- confirm required offices
- define client review points
- maintain execution-level client coordination
- restaff or re-scope when necessary

### Typical moments of interaction

- after intake qualification
- before delivery start
- during major replans
- during milestone or phase transitions

## Engagement types

The Firm should classify incoming client requests before assigning a team.

### 1. Idea shaping

PW:The client has a rough concept and wants help turning it into a clearer initiative, roadmap, or **professional design package**.

### 2. Plan review

The client already has a plan and wants it reviewed for completeness, realism, risks, and blind spots.

### 3. Plan optimization

The client has a plan that is directionally right but wants it improved using The Firm’s expertise.

### 4. Greenfield build

A new project should be started under The Firm from day zero.

### 5. Brownfield adoption

An existing repository or team should adopt The Firm as an overlay and later as a default.

### 6. Scoped delivery

A bounded feature, refactor, audit, or technical initiative should be delivered under The Firm.

### 7. Rescue / recovery

The client has a failing plan, unstable workflow, or drifting implementation and wants stabilization or takeover.

## Intake state machine

The intake itself should be stateful.

### States

- `new`
- `clarifying`
- `classified`
- `staffing_pending`
- `approved`
- `in_delivery`
- `paused`
- `closed`

### State meanings

#### `new`

The request exists but has not yet been qualified.

#### `clarifying`

The Firm is actively gathering missing information, resolving ambiguity, or aligning on what the client actually wants.

#### `classified`

The request type is known and the likely engagement path is identified.

#### `staffing_pending`

The required team shape, lane, and initial work model are being decided.

#### `approved`

The engagement shape is accepted and ready to move into execution setup.

#### `in_delivery`

The engagement is active and now governed by the downstream workflow.

#### `paused`

The engagement is temporarily halted due to client decision, blocker, rescoping, or dependency.

#### `closed`

The engagement is finished or formally ended.

## Intake artifact

The primary front-door artifact is `intake.yml`.

Its purpose is to make the engagement legible, stateful, and machine-actionable from the very beginning.

## Example `intake.yml`

```yaml
intake:
  id: firm-intake-001
  status: new

client:
  name: example-client
  primary_contact: user
  interaction_mode: collaborative
  steering_preference: high

request:
  title: Example engagement
  type: plan-review
  summary: >
    Review and optimize an existing plan for a brownfield repository.
  source_material:
    - user plan
    - repository context

intent:
  objective: >
    Determine whether the plan is realistic, complete, and aligned with The Firm.
  desired_outcomes:
    - validated plan
    - optimized workflow
    - visible risks and gaps
  health_metrics:
    - no hidden scope inflation
    - no weak closure criteria
    - no missing verification strategy
  constraints:
    - Beads as issue tracker
    - Dolt as versioned truth
    - Pi as runtime
  stop_rules:
    - pause if objective remains ambiguous
    - escalate if the supplied plan conflicts with repository reality

engagement:
  type: advisory
  mode: collaborative-review
  risk_level: medium
  lane: standard
  requires_council: false

assessment:
  greenfield: false
  brownfield: true
  plan_supplied_by_client: true
  repo_exists: true
  architecture_known: partial
  testing_maturity: unknown

staffing:
  recommended_team:
    - client_partner
    - intake_orchestrator
    - product_strategist
    - solution_architect
  optional_roles:
    - verification_planner
    - workflow_governor
  excluded_roles:
    - full delivery engineering team

next_step:
  owner: intake_orchestrator
  action: classify_and_review_client_plan

artifacts:
  required:
    - intake.yml
    - intake-summary.md
  planned_outputs:
    - engagement-plan.md
    - staffing-decision.md
```

## Intake outputs

A valid intake should produce more than one file.

### Required outputs

- `intake.yml`
- `intake-summary.md`

### Often useful outputs

- `engagement-plan.md`
- `staffing-decision.md`
- `client-review-notes.md`

## Intake questions

The intake process must answer at least these questions:

### 1. What kind of request is this?

For example:

- idea shaping
- plan review
- greenfield build
- brownfield adoption
- scoped delivery
- rescue

### 2. What does the client actually want?

Not just what was asked, but:

- the objective
- desired outcomes
- constraints
- urgency
- quality bar
- expected involvement

### 3. How much of The Firm is required?

The default answer should be the minimum sufficient team, not full-force deployment.

### 4. What is the first valid next step?

Examples:

- product framing
- brownfield assessment
- plan review
- immediate design work
- council review
- stop and clarify

## Staffing logic

The Firm should not deploy all offices by default. Intake should choose a staffing mode.

## Staffing modes

### Mode A — Advisory

Use for:

- idea shaping
- plan review
- plan optimization

Typical team:

- `client_partner`
- `intake_orchestrator`
- `product_strategist`
- `solution_architect`
- optionally `qa_verifier` or `verification_planner`

### Mode B — Discovery

Use for:

- brownfield assessment
- feasibility checks
- impact analysis
- de-risking work before commitment

Typical team:

- `client_partner`
- `intake_orchestrator`
- `context_scout`
- `callsite_auditor`
- `state_flow_mapper`
- `solution_architect`

### Mode C — Scoped delivery

Use for:

- clear bounded features
- contained refactors
- medium-risk implementation work

Typical team:

- `engagement_manager`
- `solution_architect`
- `engineering_lead`
- selected engineers
- `qa_verifier`

### Mode D — Full delivery

Use for:

- large multi-phase work
- full greenfield builds
- broad brownfield transformation

Typical team:

- all required office leads
- selected specialists
- full QA and workflow operations support

### Mode E — Recovery / rescue

Use for:

- failed plans
- unstable delivery
- quality drift
- takeover or stabilization work

Typical team:

- `client_partner`
- `engagement_manager`
- `solution_architect`
- `qa_verifier`
- `workflow_governor`
- selected recovery specialists

## Client steering model

The client should be able to steer the project without becoming the project manager of every agent.

### Steering channels

The client may influence:

- objective
- priority
- scope
- acceptance preferences
- tradeoff preferences
- milestone approval
- change requests

### Steering should flow through

- `client_partner`
- `engagement_manager`

Those roles translate client steering into issue updates, scope changes, staffing changes, or replanning.

## Review points

An engagement may define review points such as:

- after intake qualification
- after plan review
- after design lock
- before delivery start
- before release or closure

Not every engagement needs every checkpoint. Intake should decide the minimum appropriate set.

## Change-request handling

Change requests are normal and must be governed.

### A change request may affect

- scope
- priority
- acceptance
- risk tier
- staffing mode
- review cadence
- timeline expectations

### Change-request flow

1. Capture the request explicitly.
2. Determine whether it is clarification, scope change, or new work.
3. Assess impact on current engagement.
4. Decide whether to absorb, split, pause, or re-scope.
5. Document the decision and communicate it back to the client.

### Important rule

A client message is not automatically a valid internal work instruction.
It becomes one only after intake or engagement handling translates it into governed work.

## Documentation expectations

All intake and engagement changes should be documented.

At minimum, the following should remain visible:

- current intake state
- request classification
- engagement type
- staffing decision
- current client steering preference
- current review points
- significant scope or objective changes

## Anti-patterns

### 1. Immediate full-force staffing

This wastes effort, increases noise, and reduces accountability.

### 2. Treating every client request as delivery-ready

Some requests need clarification, discovery, or plan review first.

### 3. Letting the client talk directly to every internal specialist

This breaks the coherence of the firm and creates routing chaos.

### 4. Keeping intake only in chat

That destroys traceability and weakens staffing and scoping quality.

### 5. Starting execution before engagement type is classified

This is how wrong teams get staffed and wrong work gets optimized.

## Relationship to other The Firm documents

- Philosophy explains why client intent must be formalized.
- Doctrine explains why role boundaries and stop rules matter.
- Operating model defines the offices the intake may involve.
- Workflow architecture governs what happens after intake enters delivery.
- The issue tracker model governs how the engagement becomes issue-driven work.

## Summary

The intake is the front door of The Firm.

It is where a client request becomes a governable engagement, where staffing is decided, where the first constraints are established, and where The Firm proves that it will respond like a disciplined software company rather than a swarm of eager generalists.

## Run-based execution expectation

NX:
MH:Once client intent is sufficiently clear, The Firm stops operating as a loose conversational thread and switches into an explicit run-based execution model.
HP:
TN:That means the engagement produces, at minimum, a **professional design package** containing:
RV:- problem framing and scope boundaries
WB:- C4-style architecture views
HV:- critical-path flow diagrams
XJ:- ADR-style decision records
ZX:- integration boundary contracts
MQ:- verification strategy with risk-tiered test plan
HM:- rollout and rollback planning
WY:
XJ:This design package is reviewed with the client *before* build work begins.
VN:
WY:If the client raises multiple workstreams, The Firm does not keep them implicit in chat. It either:
XK:- places them into an explicit backlog
VX:- or decomposes them into parallel or sequential sub-workstreams when safe to do so
JX:
XY:The client experiences one coherent engagement; internally, The Firm decomposes it into governed runs with clear design-to-build handoffs.

## Logging rule

Once a client request is sufficiently clear to classify, The Firm must log it into Beads as governed work or attach it to an existing Beads work item.

The client should not have to ask for logging. Logging is part of acting like a professional firm.
