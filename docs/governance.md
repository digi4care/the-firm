# Governance

The Firm operates with explicit governance rather than implicit consensus. This document explains how decisions are made, conflicts are resolved, and exceptions are handled.

## Governance Model

The Firm organizes authority into offices, each with clear responsibilities and escalation paths.

```
                    ┌─────────────────┐
                    │  Firm Director  │
                    │  (Exception     │
                    │   Authority)    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│    Product    │    │  Architecture │    │   Engineering │
│     Lead      │    │     Lead      │    │     Lead      │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Product     │    │  Architecture │    │  Engineering  │
│   Office      │    │    Office     │    │    Office     │
└───────────────┘    └───────────────┘    └───────────────┘

┌───────────────┐    ┌───────────────┐
│   QA &        │    │   Workflow    │
│  Reliability  │    │  Operations   │
│     Lead      │    │     Lead      │
└───────┬───────┘    └───────┬───────┘
        │                    │
        ▼                    ▼
┌───────────────┐    ┌───────────────┐
│   QA &        │    │   Workflow    │
│  Reliability  │    │  Operations   │
│    Office     │    │    Office     │
└───────────────┘    └───────────────┘
```

## Office Responsibilities

### Product Office

**Owns**: Problem definition, scope, acceptance intent, feature framing

**Lead**: `product_lead`

**Key roles**:
- `product_strategist` — High-level product direction
- `product_manager` — Feature scoping and sequencing
- `acceptance_designer` — Acceptance criteria and edge cases

**Decisions**:
- What problem to solve
- What is in and out of scope
- What success looks like
- When acceptance criteria are satisfied

### Architecture Office

**Owns**: System design, contracts, verification requirements, technical discovery

**Lead**: `architecture_lead`

**Key roles**:
- `solution_architect` — Design lock and contracts
- `verification_planner` — Proof burden and risk tiering
- `context_scout` — Code surface mapping

**Decisions**:
- How to solve the problem
- Interface contracts and boundaries
- Verification requirements by risk tier
- When design is locked

### Engineering Office

**Owns**: Implementation within locked design

**Lead**: `engineering_lead`

**Key roles**:
- `frontend_engineer` — Client-side implementation
- `backend_engineer` — Service implementation
- `test_engineer` — Test implementation
- `integration_engineer` — Cross-system integration

**Decisions**:
- Implementation approach within design constraints
- Code organization and patterns
- Unit and integration test design
- When implementation is complete (not when work is verified)

### QA and Reliability Office

**Owns**: Proof, risk judgment, release gating

**Lead**: `qa_lead`

**Key roles**:
- `qa_verifier` — Verification execution
- `regression_reviewer` — Change risk analysis
- `release_reviewer` — Go/no-go decisions

**Decisions**:
- Whether evidence is sufficient
- Whether claims are valid
- Whether release criteria are met
- When to block closure

### Workflow Operations Office

**Owns**: Issue discipline, handoffs, state, auditability

**Lead**: `workflow_governor`

**Key roles**:
- `issue_orchestrator` — Work item structure
- `handoff_coordinator` — Cross-office transitions
- `state_recorder` — State history and evidence

**Decisions**:
- Whether state transitions are valid
- Whether handoffs are complete
- Whether artifacts meet format requirements
- When to escalate invalid transitions

## Escalation Paths

### Standard Escalation

When a role encounters something outside its boundary:

| From | To | When |
|------|-----|------|
| Engineering | Architecture | Locked contracts no longer fit reality |
| QA | Engineering | Evidence is missing or claims are false |
| QA | Product | Acceptance criteria are internally inconsistent |
| Architecture | Product | Technical path conflicts with scope |
| Workflow Ops | Any office | Transitions or handoffs are invalid |

### Lead Escalation

When an office cannot resolve internally:

| From | To | When |
|------|-----|------|
| Any office lead | Firm Director | Cross-office deadlock |
| Any office lead | Firm Director | Exception to doctrine required |
| Any office lead | Firm Director | Resource or staffing conflict |

### Client Escalation

When client needs override standard flow:

| From | To | When |
|------|-----|------|
| Any role | Client partner | Client requests scope change |
| Any role | Client partner | Client disputes acceptance |
| Any role | Engagement manager | Timeline or resource conflict |

## Gates and Approvals

### Gate 1 — Product Readiness

**Requirement**: Sharp problem statement, scope, non-goals, acceptance intent

**Approver**: `product_lead` or `acceptance_designer`

**Artifact**: `product-brief.md`, `acceptance.md`

### Gate 2 — Discovery Completeness

**Requirement**: Known code surfaces, impacted symbols, constraints

**Approver**: `architecture_lead` or `context_scout`

**Artifact**: `technical-discovery.md`

### Gate 3 — Design Lock

**Requirement**: Technical path, contract boundaries, verification plan

**Approver**: `solution_architect`

**Artifact**: `technical-design.md`

### Gate 4 — Delivery Readiness

**Requirement**: Execution waves, ownership, dependencies, artifacts

**Approver**: `engineering_lead` or `parallelization_planner`

**Artifact**: `delivery-plan.md`

### Gate 5 — QA Entry

**Requirement**: Implementation outputs plus explicit claims and evidence

**Approver**: `qa_lead`

**Artifact**: `verification-plan.md` (reference), implementation output

### Gate 6 — Verification Complete

**Requirement**: QA verdict plus propagation/E2E checks or waiver rationale

**Approver**: `qa_verifier` or `release_reviewer`

**Artifact**: `qa-verdict.md`

### Gate 7 — Final Closure

**Requirement**: Release confidence, closed blockers, complete artifact linkage

**Approver**: `release_reviewer`

**Artifact**: `release-readiness.md`

## Decision Records

Significant decisions are recorded in artifacts:

| Decision Type | Artifact | Owner |
|---------------|----------|-------|
| Scope change | `change-requests/` | `product_lead` |
| Design decision | `technical-design.md` | `solution_architect` |
| Staffing change | `engagement-plan.md` | `engagement_manager` |
| QA verdict | `qa-verdict.md` | `qa_verifier` |
| Release decision | `release-readiness.md` | `release_reviewer` |

## Exception Handling

### Doctrine Exceptions

When standard workflow cannot be followed:

1. **Document the exception**: Why standard flow cannot be used
2. **Propose alternative**: What will be done instead
3. **Identify risks**: What could go wrong with the alternative
4. **Get approval**: `firm_director` or relevant office lead
5. **Record decision**: Add to engagement artifacts

### Shortcut Rejection Rule

Any proposed shortcut that weakens the following is presumptively rejected:

- Issue-first execution
- Role specialization
- Gate-based progression
- Artifact-based handoffs
- QA independence
- Risk-tiered verification
- Traceability through Beads/Dolt

To override, escalate to `firm_director` with explicit risk acceptance.

### Emergency Protocol

When urgent action is required (production incident, security vulnerability):

1. **Create issue immediately**: Even minimal detail is better than none
2. **Document in real-time**: Update artifacts as understanding improves
3. **Retroactive approval**: Get proper gate approval after stabilization
4. **Post-incident review**: Review what was bypassed and whether it was necessary

## Governance Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Decisions in chat only | No audit trail, no shared understanding |
| Skipping gates for speed | Defects discovered later cost more |
| Office overriding another's decision | Destroys trust and accountability |
| Escalation avoidance | Problems fester, conflicts grow |
| Implicit consensus | No one owns the decision |
| Documenting after the fact | Memory is unreliable, details are lost |

## Governance in Practice

### Daily Operations

Most work proceeds without escalation:
- Roles stay within boundaries
- Gates are passed with standard artifacts
- Handoffs happen per protocol

### Weekly Reviews

- Engagement manager reviews active engagement state
- Office leads review blocked items
- Client partner reviews client-facing metrics

### Milestone Reviews

- Gates 1-3 reviewed by Product and Architecture together
- Gates 4-5 reviewed by Architecture and Engineering together
- Gates 6-7 reviewed by QA and Release together

### Exception Reviews

- Documented exceptions reviewed by `firm_director`
- Patterns in exceptions suggest process gaps
- Doctrine updates may follow from exception patterns

## See Also

- [runtime-agents.md](./runtime-agents.md) — Role definitions and boundaries
- [issue-workflow.md](./issue-workflow.md) — Issue state machine and handoffs
- [AGENTS.md](/AGENTS.md) — Runtime agent doctrine and escalation paths

---

**Rule**: Escalation is not failure. It is the correct mechanism for handling situations outside local authority.

**Rule**: When in doubt, escalate rather than improvise. Improvisation outside boundaries is the primary source of governance drift.

**Rule**: Every exception must be documented. Patterns of exceptions indicate process or doctrine problems.

---

## FAQ

**Q: What if two offices disagree on a decision?**

Escalate to the relevant leads. If leads cannot agree, escalate to `firm_director`. The system is designed to surface conflicts, not bury them.

**Q: Can a single person hold multiple roles?**

In small teams, yes, but maintain role boundaries mentally. Do not let Product concerns override QA concerns just because the same person holds both roles. Create explicit handoff artifacts even when handing off to yourself.

**Q: How do we prevent governance from slowing us down?**

Governance adds overhead, but it reduces rework and defects. The pilot phase in brownfield adoption proves the overhead is worth the value. If governance feels too heavy, escalate to review whether all gates are necessary for your risk profile.

**Q: What if the client demands a change that violates the design lock?**

Escalate to `client_partner`. The change may require:
- Revisiting Gate 3 (Design Lock)
- Accepting technical debt
- Extending timeline

The decision is documented and approved, not silently accepted.

**Q: How do we handle urgent fixes that cannot wait for full gates?**

Use emergency protocol. Create the issue, document in real-time, get retroactive approval, and conduct post-incident review. The Firm prefers visible process violation with documentation to invisible process violation without it.
