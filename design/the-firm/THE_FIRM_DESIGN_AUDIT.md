# The Firm Design Audit v0

## Purpose

This document records the first structured QA pass over the current The Firm design stack.

The goal of this audit is not to reject the overall model. The goal is to identify the highest-value contradictions, ambiguities, collisions, and missing decisions before implementation begins.

## Audit scope

Reviewed document families:

- vision, philosophy, doctrine
- operating model and governance
- workflow, issue tracker, verification, context, constraints
- client engagement, bootstrap, brownfield adoption, runtime override, agent catalog, install layout, schema model

## Overall verdict

The Firm v0 is directionally strong and architecturally serious.

It already has:

- a coherent philosophy/doctrine split
- a strong issue-first model
- a sophisticated verification model
- a realistic client-facing intake layer
- a credible governance and council model
- a plausible path to greenfield and brownfield use

However, the current design is **not yet implementation-clean**. Several important ambiguities would produce friction, conflicting authority, or weak operationalization if left unresolved.

## Confirmed strengths

### 1. Strong foundational stack

The separation between philosophy, doctrine, operating model, workflow architecture, and runtime override is a real strength. The model does not collapse everything into prompts or generic agent behavior.

### 2. Client-facing layer is now credible

The addition of intake, engagement classification, staffing modes, and client-facing roles corrected a major earlier gap. The Firm now feels like a firm rather than only an internal execution machine.

### 3. Verification model is one of the strongest parts

Risk-tiered proof, explicit propagation/E2E triggers, and the rule that closure without sufficient proof is invalid are all strong and aligned with the stated anti-drift philosophy.

### 4. Context is treated as a system

The context model is appropriately role-scoped, packetized, and handoff-driven. That reduces a major source of LLM workflow drift.

### 5. Brownfield support is serious rather than decorative

The brownfield model does not pretend existing repos can instantly become clean. The staged adoption logic is realistic.

## Critical contradictions and collisions

### 1. Lead-role ambiguity between operating model, governance, and agent catalog

Affected docs:

- `THE_FIRM_OPERATING_MODEL.md`
- `THE_FIRM_GOVERNANCE_AND_COUNCIL_MODEL.md`
- `THE_FIRM_AGENT_CATALOG.md`

Problem:
The Governance model introduces office leads such as `product_lead`, `architecture_lead`, `qa_lead`, and `workflow_governor`, but those leads are not fully integrated into the earlier operating model and agent catalog with the same level of concrete detail as other roles.

Why it matters:
This creates ambiguity about whether leads are:

- real runtime agents
- conceptual authorities only
- aliases of other roles
- or future layers not yet catalogued

Required decision:
Make office leads explicit first-class runtime roles or explicitly declare them governance-only roles with no direct runtime agent implementation.

### 2. `engineering_lead` is overloaded across layers

Affected docs:

- `THE_FIRM_OPERATING_MODEL.md`
- `THE_FIRM_GOVERNANCE_AND_COUNCIL_MODEL.md`
- `THE_FIRM_AGENT_CATALOG.md`

Problem:
`engineering_lead` appears as both an office-level authority and a concrete execution-facing agent, which may be acceptable, but the design does not clearly state whether this dual role is intended or whether different execution/governance forms should exist.

Why it matters:
This can create authority collisions during escalation and review.

Required decision:
Clarify whether some roles have dual implementation/governance identity or whether they should be split into separate runtime and governance variants.

### 3. Workflow Operations terminology drift

Affected docs:

- `THE_FIRM_OPERATING_MODEL.md`
- `THE_FIRM_GOVERNANCE_AND_COUNCIL_MODEL.md`
- `THE_FIRM_AGENT_CATALOG.md`

Problem:
The layer is sometimes described as Workflow Operations, sometimes governed by `workflow_governor`, and sometimes represented only through operational roles like `issue_orchestrator`, `handoff_coordinator`, and `state_recorder`.

Why it matters:
This weakens governance clarity exactly in the office responsible for process truth.

Required decision:
Normalize whether `workflow_governor` is the office lead for Workflow Operations and whether that role is a runtime agent, governance role, or both.

## Major ambiguities

### 4. `review_pending` state lacks clean ownership

Affected docs:

- `THE_FIRM_WORKFLOW_ARCHITECTURE.md`
- `THE_FIRM_ISSUE_TRACKER_MODEL.md`

Problem:
The state exists, but the model does not fully specify:

- who owns items while they are in `review_pending`
- whether ownership stays with the producing office or transitions to the reviewing office
- what the required decision outputs are before moving forward or back

Why it matters:
This state sits at a critical point between implementation and QA/review and is likely to become a source of ambiguity.

Required decision:
Define ownership, expected review artifact, and legal outgoing transitions from `review_pending` in one place.

### 5. Risk-tier assignment authority is not fully normalized

Affected docs:

- `THE_FIRM_VERIFICATION_POLICY.md`
- `THE_FIRM_WORKFLOW_ARCHITECTURE.md`
- `THE_FIRM_AGENT_CATALOG.md`

Problem:
The design strongly states that risk tiers matter, but does not cleanly pin final authority for assigning or revising them in all cases.

Why it matters:
Verification burden, lane behavior, and escalation all depend on this.

Required decision:
Define one canonical owner for initial risk-tier assignment and one canonical escalation path for disputes.

### 6. Lane model is underdefined

Affected docs:

- `THE_FIRM_CLIENT_ENGAGEMENT_MODEL.md`
- `THE_FIRM_VERIFICATION_POLICY.md`
- `THE_FIRM_OPERATIONAL_CONSTRAINTS.md`

Problem:
Fast / standard / critical lanes are referenced, but criteria for assigning a lane remain under-specified.

Why it matters:
Lane influences staffing, constraints, and verification strictness. Without explicit routing criteria, it becomes arbitrary.

Required decision:
Define lane selection criteria and authority in one canonical document.

### 7. Brownfield adoption levels need exit criteria

Affected docs:

- `THE_FIRM_BROWNFIELD_ADOPTION.md`

Problem:
The staged brownfield model is strong, but the transitions between levels are not yet sharp enough to be operational.

Why it matters:
Without exit criteria, brownfield adoption can stall in “pilot forever” mode.

Required decision:
Define success conditions and promotion criteria between brownfield adoption levels.

## Missing operational pieces

### 8. Verification obligations are not tightly mapped to issue taxonomy

Affected docs:

- `THE_FIRM_ISSUE_TRACKER_MODEL.md`
- `THE_FIRM_VERIFICATION_POLICY.md`

Problem:
The issue tracker model and verification policy are individually strong, but the exact mapping between work item type and verification work item creation is still implicit.

Why it matters:
Implementation will need deterministic rules for when to spawn `qa-check`, `propagation-check`, `e2e-check`, or `release-gate` items.

Required decision:
Create a canonical mapping table between work item type, risk tier, and verification issue creation.

### 9. Skip rationale and waiver recording need more explicit artifact linkage

Affected docs:

- `THE_FIRM_VERIFICATION_POLICY.md`
- `THE_FIRM_TEMPLATE_AND_SCHEMA_MODEL.md`

Problem:
The policy requires explicit rationale for skips and waivers, but the exact canonical place where that rationale lives is not fully normalized.

Why it matters:
Waivers can easily become prose drift if not anchored to a consistent artifact or issue field.

Required decision:
Declare whether skip/waiver rationale always lives in `qa-verdict.md`, a dedicated waiver record, or both.

### 10. Council decisions need stronger link into issue and artifact flow

Affected docs:

- `THE_FIRM_GOVERNANCE_AND_COUNCIL_MODEL.md`
- `THE_FIRM_TEMPLATE_AND_SCHEMA_MODEL.md`

Problem:
`council-decision.md` exists conceptually, but the workflow does not yet state clearly how a council decision mutates:

- issue state
- verification obligations
- staffing or lane
- constraints

Why it matters:
Without that, council becomes advisory instead of operational.

Required decision:
Define which downstream objects a council decision is allowed to change and how those mutations are recorded.

## Anti-drift observations

### Strong anti-drift elements already present

- issue-first execution
- artifact-based handoffs
- role-scoped context packets
- closure discipline
- QA independence
- explicit constraints and escalation

### Remaining anti-drift risks

- unclear lead-role implementation could cause authority drift
- underdefined lane assignment could cause verification drift
- unclear `review_pending` semantics could cause handoff drift
- skip/waiver placement ambiguity could cause audit drift

## Normalization opportunities

### 1. Add a single authority matrix appendix

The model would benefit from one canonical authority matrix covering:

- lead roles
- specialist roles
- risk-tier authority
- lane authority
- verification waiver authority
- reopen authority

### 2. Add a lifecycle-to-artifact mapping table

A table that says:

- phase/state
- owner
- required artifact
- allowed outgoing transitions
would reduce ambiguity significantly.

### 3. Add work-item-type to verification mapping

This would turn the current strong principles into more executable governance.

## Recommended next implementation-safe clarifications

Before heavy runtime implementation, clarify these first:

1. Are office leads real runtime agents, governance roles, or both?
2. Who owns and decides `review_pending` transitions?
3. Who has final authority for initial and revised risk-tier assignment?
4. How are lanes assigned, by whom, and with what criteria?
5. What artifact or issue field canonically stores skip/waiver rationale?
6. What exact objects can a council decision mutate?
7. What are the promotion criteria between brownfield adoption levels?

## Final assessment

The Firm v0 is strong enough to justify continuing toward implementation.

However, it should not yet be treated as fully normalized. The design still needs one tightening pass around:

- authority normalization
- review-state ownership
- lane routing
- verification-to-issue mapping
- waiver recording
- council operational effects

Those are tractable gaps, not foundational failures.

The design is not drifting away from its original intent. But it is now large enough that a normalization pass is required before implementation to preserve that intent cleanly.
