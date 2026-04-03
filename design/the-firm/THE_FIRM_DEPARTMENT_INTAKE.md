# The Firm Intake Department Design v0

## Purpose

This document defines the Intake department: why it exists, how it works, what expertise it needs, what persistent state it maintains, and what it produces.

Designed using the Department Blueprint Methodology (see `THE_FIRM_DEPARTMENT_BLUEPRINT.md`).

---

## 1. Why does this department exist?

Intake exists because client input is entropy -- messy, incomplete, mixed, ambiguous. Someone must convert that entropy into structured engagement information before the rest of The Firm can work with it.

Without Intake, work arrives as unstructured conversation and gets routed incorrectly, scoped poorly, or started without sufficient clarity.

Intake is the entropy-to-structure conversion layer. No other department performs this function.

## 2. Who does this department serve?

**Primary: The Firm itself.**

Intake works for the organization, not for the client. Its job is to produce clean, classified, well-documented engagement input that downstream departments can act on without guessing.

**Secondary: The client.**

The client experiences Intake as a helpful, structured conversation. But that helpfulness is a means to an end -- the end is clean internal routing and documentation.

## 3. Expertise areas

Intake requires three distinct kinds of thinking. Each is a separate agent because the mindset is fundamentally different.

### Intake Lead

- **What it does:** Conducts the conversation with the client. Asks questions, listens, probes, maintains the relationship during intake. Knows when enough information has been gathered.
- **Why separate:** Conversation is a distinct skill -- tone, pacing, knowing when to push and when to hold back, making the client feel heard while steering toward structure. This is not analysis and not documentation.
- **Role within department:** Lead. Directs the other two agents. Decides when intake is complete.

### Request Analyst

- **What it does:** Classifies the request (engagement type), determines the routing (which departments are needed), assesses completeness, identifies gaps.
- **Why separate:** Analytical, structural thinking. A different mindset than conversation. The analyst looks at what was said and maps it to engagement categories, staffing modes, and risk levels. This is pattern recognition and classification, not talking or writing.
- **Role within department:** Works under Intake Lead direction. Can push back: "I need more information on X before I can classify this."

### Brief Writer

- **What it does:** Produces the client brief -- the structured document that downstream departments use as their primary input.
- **Why separate:** Writing clear, complete, usable documentation for downstream consumers is a distinct discipline. It requires knowing what the next department needs, not just summarizing what was said. A good brief is not a transcript -- it is a structured handoff document.
- **Role within department:** Works under Intake Lead direction. Can push back: "The classification is clear but I'm missing context on X to write a complete brief."

## 4. Persistent information

Intake maintains three persistent records that live beyond individual engagements:

### Client dossier

A living document per client containing:

- who they are (background, context, technical level)
- communication preferences and style
- previous engagement history
- patterns in their requests
- known constraints or preferences

This is not an engagement artifact. It is a CRM record that grows over time.

### Engagement register

A log of all engagements:

- engagement ID
- type (idea shaping, plan review, greenfield, brownfield, scoped delivery, rescue)
- status (new, clarifying, classified, staffing, approved, in delivery, paused, closed)
- outcome (when closed)
- linked artifacts

This provides institutional memory and pattern recognition for future intakes.

### Pattern library

Accumulated patterns from repeated intakes:

- common request types and their typical routing
- frequently missing information and how to ask for it
- engagement types that tend to go wrong and why
- classification heuristics that proved reliable

This is the knowledge base that makes intake faster and more accurate over time.

## 5. Internal flow

```
Client contacts The Firm
  │
  ▼
Intake Lead ──── opens client dossier (or creates new)
  │
  │  conducts conversation, gathers input
  │  signals: "I have enough to proceed"
  │
  ▼
Request Analyst ──── classifies request
  │                  determines engagement type
  │                  determines routing
  │                  assesses completeness
  │
  │  if incomplete ──→ back to Intake Lead for more conversation
  │
  ▼
Brief Writer ──── produces client brief
  │               produces intake summary
  │
  ▼
Intake Lead ──── reviews brief against conversation
  │              confirms completeness
  │
  ▼
OUTPUT ──→ client brief → next department
       ──→ engagement classification → Workflow Operations
       ──→ client dossier update → persistent
       ──→ intake summary → client (transparency)
```

### Iteration points

- Analyst → Lead: "Need more info on X" triggers another conversation round
- Lead → Brief Writer: "This doesn't match what the client said" triggers revision
- No iteration skips a step -- every engagement goes through Lead → Analyst → Brief Writer in that order

### Gate

The brief is not final until:
1. Intake Lead confirms it matches the conversation
2. Request Analyst confirms the classification is sound
3. Client confirms it reflects their intent (transparency checkpoint)

## 6. Output

| Output | Consumer | Purpose |
|---|---|---|
| Client brief | Next department (Product / Architecture / Engineering) | Structured input for downstream work |
| Engagement classification | Workflow Operations | Routing and staffing decisions |
| Client dossier (update) | The Firm (persistent) | Institutional memory across engagements |
| Intake summary | Client | Transparency -- shows the client what was understood |
| Engagement register entry | The Firm (persistent) | Audit trail and pattern analysis |

## Relationship to existing roles

The Intake Lead is NOT the same as the `client_partner` defined in the Client Engagement Model. They are separate concerns:

- **Intake Lead:** Owns the intake conversation. Hands off after intake is complete.
- **Client Partner:** Owns the ongoing client relationship throughout the engagement. Exists outside the Intake department.

This mirrors how real tech bedrijven work: the person who takes the initial call is not the same person who manages the account long-term.

## Relationship to existing design docs

- **Client Engagement Model:** Intake is Phase 0 of the engagement model. The intake state machine (`new → clarifying → classified → staffing_pending → approved`) lives here.
- **Agent Catalog:** The three Intake agents supplement (and may partially replace) the existing `intake_orchestrator` role, which was too broad for a single agent.
- **Workflow Architecture:** Intake feeds into Phase 1 (Product Framing) or other downstream phases depending on engagement type.

## Version history

- v0 -- initial design, co-designed during brainstorm session, based on tech bedrijf intake patronen
