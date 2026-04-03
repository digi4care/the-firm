# The Firm Verification Policy v0

## Purpose
This document defines how The Firm decides what proof is required before work may advance or close.

The Firm treats verification as mandatory, but not uniform. Every meaningful work item requires QA involvement, yet not every change justifies the same testing cost.

This policy therefore governs:
- risk classification
- required verification depth
- propagation-check triggers
- E2E-check triggers
- acceptable skip conditions
- evidence requirements for closure

## Core verification doctrine
The Firm follows five verification laws:

1. QA is always mandatory for non-trivial work.
2. Verification depth must match risk, coupling, and user impact.
3. Expensive verification is justified by risk, not habit.
4. A skipped check must be explicitly justified.
5. Closure without sufficient proof is invalid.

## Verification layers
The Firm uses four main proof layers.

### 1. Local proof
Examples:
- targeted unit tests
- local component tests
- reproducible bugfix checks
- tightly scoped integration tests inside one module boundary

Purpose:
- prove local behavior
- catch direct regressions cheaply

### 2. Boundary proof
Examples:
- integration tests across interface boundaries
- contract checks between producers and consumers
- callsite or consumer validation after API/schema changes

Purpose:
- prove that a changed contract still behaves correctly across its immediate boundary

### 3. Propagation proof
Examples:
- state propagation tests
- event flow verification
- selector/store/subscription verification
- cache/persistence/UI synchronization proof

Purpose:
- prove that changes travel correctly across multiple components, layers, or synchronization paths

### 4. Flow proof
Examples:
- end-to-end tests
- critical-path user journey verification
- system-level happy/failure path validation

Purpose:
- prove behavior at the workflow or product-flow level where local tests are insufficient

## Risk tiers
The Firm uses five risk tiers.

### R0 — Trivial/local
Examples:
- documentation
- comments
- copy changes
- styling without behavior impact
- formatting or obvious non-behavioral cleanup

Required:
- light QA review
- no special propagation or E2E requirements

Closure expectation:
- enough evidence to show no meaningful behavioral change occurred

### R1 — Local behavior change
Examples:
- isolated bugfix in one module
- local business logic change without boundary impact
- small behavior correction with clear local scope

Required:
- QA review
- local proof
- explicit rationale if no automated proof exists

Usually not required:
- propagation proof
- E2E proof

### R2 — Boundary-affecting change
Examples:
- API contract change
- schema or payload change
- prop/signature change
- adapter or integration boundary update
- store contract or selector behavior change with consumers involved

Required:
- QA review
- boundary proof
- callsite/consumer impact analysis where relevant
- propagation assessment

Conditionally required:
- propagation proof if effects extend beyond one immediate boundary
- E2E proof if user-facing flow risk emerges

### R3 — Flow or cross-component change
Examples:
- multi-step workflow changes
- state synchronization across multiple layers
- auth/session flow changes
- persistence + UI + async interactions
- cross-package behavior shifts

Required:
- QA review
- boundary proof
- propagation proof
- regression review
- explicit E2E assessment

Usually required:
- at least one targeted flow-level proof

### R4 — Critical/high-coupling change
Examples:
- security/authz/authn
- payments/billing
- orchestration backbone
- shared workflow engine
- release-critical or historically unstable paths

Required:
- QA review
- boundary proof
- propagation proof
- E2E happy-path proof
- E2E failure-path proof where relevant
- explicit release-gate review

Closure expectation:
- no close without named residual risk and clear evidence set

## Risk classification inputs
Risk tier must be assigned using these questions:
- Does the change alter a user-visible flow?
- Does it change a contract or boundary?
- Does it affect shared state or propagation paths?
- Does it touch a critical or incident-prone area?
- Can the claim be falsified cheaply, or only at system level?
- What breaks if this is wrong?

Risk tier is not chosen by implementation convenience. It is chosen by consequence and observability.

## Mandatory QA policy
### QA is mandatory when:
- any non-trivial work item changes code, behavior, contracts, or workflow state
- a change claims to fix, improve, refactor, migrate, or stabilize behavior
- a work item is being closed based on technical output

### QA may be light only when:
- the change is truly R0
- no meaningful behavioral or structural risk exists
- no closure claim depends on hidden system behavior

## Propagation-check policy
Propagation proof is required when the change affects how information, state, or events travel across boundaries.

### Trigger conditions
Require a `propagation-check` when the change affects any of the following:
- shared state containers or stores
- selectors or derived state consumed elsewhere
- subscriptions, listeners, or event handlers
- event names or payload structures
- persistence-to-memory synchronization
- cache invalidation or refresh pathways
- parent-child or service-consumer synchronization
- multi-step async state transitions across components or modules

### Usually not required when:
- behavior is strictly local and non-propagating
- the change is presentation-only
- the changed logic has no downstream consumer effect

### Skip rule
If propagation proof is skipped, the workflow must record why the change does not alter propagation semantics.

## E2E-check policy
Flow-level proof is required when local or boundary proof cannot establish correctness of the actual user or system journey.

### Trigger conditions
Require an `e2e-check` when the change affects any of the following:
- primary user journeys
- critical business workflows
- multi-boundary behavior chains
- auth/session or access-control paths
- sequences where regression appears only at flow level
- high-risk orchestration or system coordination

### Usually not required when:
- the change is fully local
- user-visible flow semantics are unchanged
- lower-cost proof fully captures the risk

### Skip rule
If E2E proof is skipped for work above R1, the workflow must record why lower-cost proof is sufficient.

## Design-package requirements

Before a design may be considered for lock, it must be reviewable and verifiable. The following artifacts are mandatory for the stated risk tiers:

### R2+ (Boundary-affecting and above)
Required:
- Interface contracts (inputs, outputs, error shapes)
- Consumer impact summary (what calls this, what this calls)
- State change inventory (what data is created, modified, or destroyed)

### R3+ (Flow or cross-component)
Required:
- All R2 requirements
- Sequence or flow diagram covering the changed behavior
- Propagation analysis (how changes travel across boundaries)
- Rollback/revert considerations

### R4 (Critical/high-coupling)
Required:
- All R3 requirements
- ADR-style decision record for significant tradeoffs
- Explicit release-gate mapping (what must be true to ship)
- Residual risk statement (what remains unproven even after implementation)

### Design review gate
No design may proceed to lock status without:
- `architecture_lead` or delegate signoff that the package is complete enough to support implementation
- `qa_lead` acknowledgment that the design permits verification planning (testability review)
- For R4 work: explicit risk-tier confirmation (not assumed)



## Verification planning policy
Verification is decided in design, not invented at closure time.

### During design lock, the workflow must define:
- risk tier
- required proof layers
- whether propagation proof is required
- whether E2E proof is required
- acceptable skip conditions, if any
- release-gate implications

### During delivery planning, the workflow must create:
- corresponding verification work items
- ownership for those work items
- dependencies between implementation and verification tasks

### During QA, the workflow must record:
- which checks were executed
- which checks were skipped
- why they were skipped
- what evidence exists
- what residual risk remains

## Evidence requirements
A work item is not verification-complete unless the evidence can answer:
- what claim was being tested
- what check was run
- what the result was
- why that result is sufficient for the risk tier
- what remains unproven

### Acceptable evidence forms include:
- targeted automated test results
- integration test results
- reproducible scenario steps with observed outcome
- propagation-verification outputs
- E2E outputs
- review findings with explicit reasoning

### Weak evidence forms
The following are not sufficient on their own for non-trivial work:
- "it looks fine"
- "it compiles"
- "the code seems correct"
- "the change is small"
- unexamined green CI when the specific risk was never targeted

## Skip policy
The Firm allows skipping an otherwise possible check only when:
- the risk tier does not require that proof layer
- a lower-cost proof fully covers the relevant claim
- the system state makes the higher-cost proof irrelevant to the actual change
- the skip is explicitly recorded with rationale

### Forbidden skip behavior
The following are invalid:
- skipping because the check is inconvenient
- skipping because the owner believes the code is obvious
- skipping because earlier phases forgot to plan verification
- skipping without recording what remains unproven

## Closure policy
A work item may not move to `verified` or `closed` unless its verification obligations are satisfied.

### For implementation tasks
Require:
- required proof layers complete
- QA verdict recorded
- residual risk recorded if non-zero

### For feature-level closure
Require:
- child verification obligations resolved
- feature-level propagation or E2E obligations resolved
- no hidden blocker remains in unresolved verification state

### For critical-path work
Require:
- release-gate visibility
- named signoff or explicit no-go

## Relationship to issue tracker model
The issue tracker controls whether verification work exists, when it becomes ready, who owns it, and whether closure is legal.

This policy controls what that verification work must prove.

## Relationship to doctrine
The philosophy explains why proof matters.
The doctrine states that closure without sufficient proof is invalid.
This document specifies what "sufficient proof" means for different classes of work.

## Summary
The Firm does not enforce one test intensity for all changes.
It enforces one standard of honesty:
- every meaningful change must be reviewed
- every risky change must be proven at the right depth
- every skipped check must be justified
- no work may close on plausible confidence alone
