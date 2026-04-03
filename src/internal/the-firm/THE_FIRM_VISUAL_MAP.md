# The Firm Visual Map

This document indexes the visual artifacts that explain how The Firm is structured and how work moves through it.

Use it as the entry point when the prose docs are correct but too dense to reassemble mentally.

## How to use this file

- Start with the diagram that matches your question.
- Use the listed source docs as the normative authority.
- Treat each diagram as a compressed view of the source docs, not as a replacement for them.

---

## 1. Organization and agent hierarchy

**Diagram**
- `THE_FIRM_ORG_HIERARCHY.puml`
- `THE_FIRM_ORG_HIERARCHY.svg`

**Purpose**
Shows the four runtime layers of The Firm:
- client-facing roles
- office leadership
- specialist execution
- governance / executive layer

It also shows which specialist roles sit under which office lead, and where councils sit relative to the runtime organization.

**Use when**
- you want to understand the hierarchy of offices, leads, specialists, and councils
- you want to explain who owns what at a glance
- you want to orient a new contributor before discussing workflow details

**Normative source docs**
- `THE_FIRM_GOVERNANCE_AND_COUNCIL_MODEL.md`
- `THE_FIRM_OPERATING_MODEL.md`
- `THE_FIRM_AGENT_CATALOG.md`
- `THE_FIRM_NORMALIZATION_DECISIONS.md`

---

## 2. Workflow phases, gates, and artifact flow

**Diagram**
- `THE_FIRM_WORKFLOW_GATES.puml`
- `THE_FIRM_WORKFLOW_GATES.svg`

**Purpose**
Shows the canonical phase flow from Intake through Retrospective, including the gate checkpoints and the main artifact families produced along the way.

**Use when**
- you want to understand the governed lifecycle end-to-end
- you want to know which gate sits between two phases
- you want to see which artifacts are expected before work can legally move forward

**Normative source docs**
- `THE_FIRM_WORKFLOW_ARCHITECTURE.md`
- `THE_FIRM_OPERATING_MODEL.md`

---

## 3. Councils, escalation paths, and self-correction

**Diagram**
- `THE_FIRM_COUNCILS_AND_ESCALATION.puml`
- `THE_FIRM_COUNCILS_AND_ESCALATION.svg`

**Purpose**
Shows the correction and escalation model:
- task-level correction
- workflow-level correction
- engagement-level correction
- governance-level correction

It also shows which office leads and client-facing roles feed into each council structure.

**Use when**
- you want to know when escalation is required instead of local continuation
- you want to explain the difference between normal office ownership and exceptional council handling
- you want to reason about doctrine exceptions, repeated reopen loops, or residual-risk decisions

**Normative source docs**
- `THE_FIRM_GOVERNANCE_AND_COUNCIL_MODEL.md`
- `THE_FIRM_NORMALIZATION_DECISIONS.md`

---

## 4. Control-plane runtime dispatch

**Diagram**
- `THE_FIRM_CONTROL_PLANE_RUNTIME.puml`
- `THE_FIRM_CONTROL_PLANE_RUNTIME.svg`

**Purpose**
Shows how the control plane derives the next governed step from persisted state and repository evidence.

It connects:
- `.firm/run-state.yml`
- Beads issue state
- repository artifacts
- Dolt audit history
- dispatcher / validator / office mapping / transition logic
- OMP runtime execution

**Use when**
- you want to understand how The Firm becomes mechanically operable rather than chat-driven
- you want to explain dispatch, gate validation, or office assignment
- you are designing or implementing the control-plane layer itself

**Normative source docs**
- `THE_FIRM_CONTROL_PLANE.md`
- `THE_FIRM_WORKFLOW_ARCHITECTURE.md`

---

## 5. End-to-end delivery sequence

**Diagram**
- `THE_FIRM_END_TO_END_DELIVERY_SEQUENCE.puml`
- `THE_FIRM_END_TO_END_DELIVERY_SEQUENCE.svg`

**Purpose**
Shows one end-to-end runtime sequence from client request through intake, framing, discovery, design, build, verify, and closure.

Unlike the phase map, this is a sequence view. It emphasizes handoff timing, control-plane dispatch, and artifact writes across the offices.

**Use when**
- you want to explain the order of interactions between roles and systems
- you want a runtime story instead of a static hierarchy or phase map
- you want to show where Beads, artifacts, workflow operations, and the control plane participate in a delivery run

**Normative source docs**
- `THE_FIRM_CLIENT_ENGAGEMENT_MODEL.md`
- `THE_FIRM_WORKFLOW_ARCHITECTURE.md`
- `THE_FIRM_OPERATING_MODEL.md`
- `THE_FIRM_CONTROL_PLANE.md`

---

## Recommended reading order

For someone new to The Firm:
1. `THE_FIRM_ORG_HIERARCHY.svg`
2. `THE_FIRM_WORKFLOW_GATES.svg`
3. `THE_FIRM_END_TO_END_DELIVERY_SEQUENCE.svg`
4. `THE_FIRM_COUNCILS_AND_ESCALATION.svg`
5. `THE_FIRM_CONTROL_PLANE_RUNTIME.svg`

Reason:
- first understand the structure
- then the lifecycle
- then a concrete runtime walkthrough
- then escalation/governance
- then the mechanical dispatch layer

## Rule of thumb

- If the question is **who owns this?** → start with the hierarchy diagram.
- If the question is **what phase are we in?** → start with the workflow/gates diagram.
- If the question is **who escalates this?** → start with the councils/escalation diagram.
- If the question is **how does the runtime know what to do next?** → start with the control-plane runtime diagram.
- If the question is **what actually happens in order?** → start with the end-to-end sequence diagram.
