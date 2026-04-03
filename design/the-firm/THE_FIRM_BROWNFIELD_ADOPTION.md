# The Firm Brownfield Adoption v0

## Purpose

This document defines how an existing repository adopts The Firm.

Brownfield adoption is not a copy-paste of the greenfield bootstrap. Existing repositories already have:

- habits
- workflows
- architecture debt
- incomplete or uneven testing
- hidden ownership assumptions
- implicit release behavior

The purpose of brownfield adoption is therefore not instant purity. It is controlled takeover.

## Brownfield objective

A brownfield repository should move from ad hoc or legacy workflow behavior toward The Firm in deliberate stages until:

- issue-first execution is normal
- role boundaries are explicit
- handoffs are governed
- verification is policy-driven
- closure becomes evidence-based
- Pi operates under The Firm rather than generic assumptions

## Brownfield principle

Do not demand full doctrinal compliance from a repository before you understand what the repository actually is.

Brownfield adoption starts with truth-finding, not enforcement.

## Brownfield phases

### Phase A — Current-state assessment

Goal:

- understand the existing repo as it really behaves

Assess at minimum:

- codebase topology
- architectural boundaries
- dependency hot spots
- test landscape
- current release practices
- current issue tracking habits
- current review and QA habits
- areas of chronic instability or hidden risk

Outputs:

- current-state map
- architecture risk notes
- workflow mismatch notes
- testing maturity notes

### Phase B — Adoption mapping

Goal:

- map current reality to The Firm’s target model

Define:

- which existing practices can remain temporarily
- which practices conflict with The Firm doctrine
- which lifecycle states need immediate enforcement
- which role boundaries can be introduced now
- which role boundaries must be staged
- which workstreams are suitable as pilots

Outputs:

- adoption plan
- enforcement boundaries
- pilot workstream selection

### Phase C — Pilot workstream enforcement

Goal:

- run The Firm on one or a few selected streams before repo-wide adoption

Pilot candidates should be:

- meaningful enough to exercise the workflow
- bounded enough to control risk
- representative enough to reveal adoption friction

The pilot should exercise:

- issue decomposition
- role assignment
- design lock
- implementation waves
- QA entry and closure
- verification selection

Outputs:

- pilot findings
- required doctrine or workflow adjustments
- identified adoption blockers

### Phase D — Governance ratchet

Goal:

- expand The Firm from pilot scope to default operating model

This phase gradually tightens:

- issue discipline
- required handoffs
- verification enforcement
- closure requirements
- role specialization expectations

The ratchet should move in one direction: toward more truth and stronger governance, not back toward convenience-driven ambiguity.

### Phase E — Full override

Goal:

- make The Firm the default operating model for the repository

At this point:

- issue-first execution is expected
- serious work is phase-gated
- closure requires evidence
- Pi sessions assume The Firm doctrine by default
- parallel work follows issue dependencies rather than intuition

## Assessment checklist

Before The Firm can responsibly overlay a brownfield repo, the following must be understood:

### Architecture

- what are the real module and service boundaries?
- where is shared state concentrated?
- where are the high-coupling hotspots?
- what areas are brittle or incident-prone?

### Workflow

- how is work currently requested, tracked, and closed?
- what currently counts as "done"?
- where are handoffs implicit rather than explicit?
- where does ownership become ambiguous?

### Verification

- what tests actually exist?
- what tests are trusted?
- where are there blind spots?
- what areas would require propagation or E2E proof under The Firm but currently have none?

### Culture and control

- what shortcuts are normalized?
- where is optimism replacing evidence?
- where is process likely to resist change?

## Brownfield adoption strategy

### Rule 1 — Start by observing, not rewriting

Do not begin by forcing all existing work into a new shape without first understanding how the project actually moves.

### Rule 2 — Overlay before replacement

In a brownfield repo, The Firm initially behaves as a governance overlay:

- it introduces issue discipline
- it introduces role clarity
- it introduces verification expectations
- it does not require a full architecture rewrite just to begin

### Rule 3 — Enforce first on new work

The safest first enforcement boundary is:

- new features
- new refactors
- high-risk changes
- active unstable workstreams

This avoids fighting the entire legacy codebase at once.

### Rule 4 — Ratchet, don’t oscillate

Every adoption step should increase clarity, traceability, and verification discipline.
Do not temporarily tighten standards only to abandon them at the first convenience cost.

### Rule 5 — Make hidden debt visible

Brownfield adoption should expose reality:

- missing ownership
- missing contracts
- missing tests
- fake completeness
- fragile release assumptions

Visible debt is a success condition, not a failure.

## Minimum initial overlay

A repository can be considered under The Firm overlay when at least the following are true:

- The Firm docs are present and authoritative for the pilot scope
- issue tracker control exists for the selected workstream
- pilot work follows The Firm lifecycle states
- role ownership is explicit on the pilot
- QA is mandatory on the pilot
- closure on the pilot is evidence-based

## Staged enforcement model

The Firm should adopt these enforcement levels in brownfield repos.

### Level 0 — Observation

- assess
- map
- document mismatches
- do not yet enforce broadly

### Level 1 — Pilot discipline

- enforce The Firm only on selected workstreams
- require issue-first execution there
- require QA and closure discipline there

### Level 2 — Default on new work

- all new serious work enters under The Firm
- legacy untouched areas may remain under looser historical process temporarily

### Level 3 — Broad governance

- handoff, verification, and closure rules apply repo-wide for serious engineering work

### Level 4 — Full override

- The Firm is the default operating model for the repository
- generic Pi assumptions are no longer the operational norm

## Brownfield anti-patterns

### 1. Forced purity on day one

Trying to make the entire repo perfectly compliant immediately usually creates backlash, confusion, and paper compliance.

### 2. Endless observation with no enforcement

Assessment is necessary, but if adoption never reaches a pilot, The Firm remains theory.

### 3. Letting legacy closure rules coexist indefinitely

If old and new definitions of done coexist forever, the organization never actually adopts The Firm.

### 4. Treating missing tests as a reason to skip governance

Weak existing verification is exactly why governance is needed.

### 5. Using brownfield complexity as an excuse for generalist agents

Brownfield complexity increases the need for role separation, not the opposite.

## Brownfield readiness checklist

A repo is ready to move from assessment to pilot when:

- current-state mapping exists
- adoption scope is chosen
- pilot workstream is selected
- role map for the pilot is explicit
- issue control is available for the pilot
- verification expectations are defined for the pilot

A repo is ready to move from pilot to broader enforcement when:

- pilot handoffs worked
- pilot verification was actually enforced
- major workflow mismatches are understood
- leadership is willing to ratchet standards rather than relapse into convenience

## Relationship to greenfield bootstrap

Greenfield bootstrap starts with full doctrine installation and immediate default use.
Brownfield adoption starts with assessment, then pilot, then ratcheting enforcement.

Both aim at the same final state.
They differ only in how much existing reality must be negotiated on the way there.

## Relationship to Pi override

In brownfield mode, The Firm does not override Pi everywhere at once.
It first overrides Pi in the scoped adoption area.

That means:

- selected workstreams run under The Firm assumptions
- selected tasks use issue-first discipline
- selected roles and verification gates become mandatory
- the override footprint expands as confidence and compatibility grow

## Summary

Brownfield adoption succeeds when The Firm becomes increasingly true of how the repository actually works, not merely how its documentation claims to work.

The aim is not ceremonial compliance.
The aim is steady replacement of vague, optimistic, legacy workflow behavior with governed, issue-driven, evidence-based execution.
