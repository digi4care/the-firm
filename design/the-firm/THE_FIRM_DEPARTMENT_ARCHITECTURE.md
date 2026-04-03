# The Firm Architecture Department Design v0.1

## Purpose

This document defines the Architecture department: why it exists, how it works, what expertise it needs, what persistent state it maintains, and what it produces.

Designed using the Department Blueprint Methodology (see `THE_FIRM_DEPARTMENT_BLUEPRINT.md`).

---

## 1. Why does this department exist?

Architecture exists because someone must translate product intent into a technically coherent, implementable design package. Product says *what to build*. Architecture says *how to build it well* -- boundaries, contracts, data flow, verification strategy.

Without Architecture:
- build starts from unclear technical boundaries
- interfaces are guessed rather than designed
- impact radius is unknown (what does this change touch?)
- there is no verification plan (how do we know it works?)
- parallelization is ad hoc rather than planned

Architecture is the translation layer between product specification and engineering implementation. No other department performs this function.

## 2. Who does this department serve?

**Primary: Engineering and QA.**

Architecture serves the departments that will build and verify the work. It produces the design package they need: clear boundaries, explicit contracts, testable interfaces, and a verification strategy that gives confidence the system works as intended.

**Secondary: Product and the client.**

Product benefits from Architecture's feedback on technical feasibility -- what is possible, what carries risk, what requires reframing. The client benefits through transparency: a clear explanation of the technical approach that will deliver their product.

## 3. Expertise areas

Architecture requires three distinct kinds of thinking. Each is a separate agent because the mindset is fundamentally different.

### Discovery Analyst

- **What it does:** Technical discovery and codebase analysis. Scans existing code, maps dependencies, identifies impact radius, and establishes the factual baseline for brownfield work. For greenfield, reviews available context and references.
- **Why separate:** Discovery is reading and analysis, not design. It requires a different mindset than creating -- careful observation, pattern recognition, and accurate documentation of what exists. A good analyst sees what is actually there, not what should be there.
- **Role within department:** First mover for brownfield and discovery engagements. Provides the factual baseline that design decisions are built on. Can push back: "I need access to X before I can complete impact analysis."

### Solution Architect

- **What it does:** Makes architecture decisions. Defines boundaries, contracts, interfaces, data models, and data flow. Owns the technical design and owns the tradeoffs.
- **Why separate:** Architecture judgment is distinct from analysis or planning. It requires weighing tradeoffs, understanding system-level consequences, and making binding decisions that others will build against. This is design authority, not analysis or documentation.
- **Role within department:** Lead designer. Takes discovery findings and product brief, produces the architecture design. Can push back: "This scope is technically infeasible as specified" or "This design requires reframing."

### Verification Planner

- **What it does:** Defines how to verify the design works. Plans test strategy, identifies critical verification points, designs parallelization strategy for implementation.
- **Why separate:** Verification thinking is adversarial and specific. It asks "how could this fail?" and "what proves it works?" This is not design and not analysis -- it is quality-minded planning that protects both the client and The Firm from delivering unverifiable systems.
- **Role within department:** Takes the architecture design and produces verification + parallelization plans. Can push back: "This design element is not verifiable as specified" or "The verification burden is too high for the value."

## 4. Persistent information

Architecture maintains two persistent records that live beyond individual engagements:

### Architecture decision log

ADR-style records of significant technical decisions:
- context (what problem were we solving)
- decision (what we chose)
- consequences (what this enables and constrains)
- alternatives considered (what we rejected and why)

Cross-engagement patterns that inform future decisions:
- patterns that proved reliable in production
- patterns that caused problems
- stack-specific conventions that emerged from real work

This is institutional memory that makes architecture decisions faster and more consistent over time.

### Technical pattern library

Accumulated patterns from architecture work:
- proven patterns by engagement type (greenfield, brownfield, rescue)
- known anti-patterns and failure modes
- interface design patterns that reduce integration risk
- data flow patterns that support testability
- parallelization patterns that actually work

This library encodes experience that would otherwise be lost between engagements.

## 5. Internal flow

```
Product brief arrives
  |
  ▼
Discovery Analyst ──── scans codebase (brownfield)
  │                     OR reviews greenfield context
  │                     maps dependencies
  │                     identifies impact radius
  │
  │  if insufficient context ──→ back to Product for clarification
  │
  ▼
Solution Architect ──── makes architecture decisions
  │                      defines boundaries and contracts
  │                      designs interfaces and data flow
  │                      produces architecture design
  │
  │  if product scope is technically infeasible ──→ back to Product for reframing
  │
  ▼
Verification Planner ──── stress-tests the design
  │                       defines verification strategy
  │                       plans parallelization
  │                       identifies critical test points
  │
  │  if verification reveals design gaps ──→ back to Solution Architect
  │
  ▼
OUTPUT ──→ architecture design → Engineering
       ──→ verification plan → QA
       ──→ ADR entries → persistent
       ──→ design summary → client (transparency)
```

### Iteration points

- **Discovery Analyst → Product:** insufficient context for technical decisions (missing codebase access, unclear integration points, undocumented assumptions)
- **Solution Architect → Product:** scope is technically infeasible as specified, needs reframing (impossible constraints, incompatible technologies, underestimated complexity)
- **Verification Planner → Solution Architect:** design doesn't support verifiable delivery (untestable interfaces, unclear boundaries, verification burden too high)
- **No iteration skips a step** -- every engagement goes through Discovery → Solution Architect → Verification Planner in that order

### Gate

The architecture package is not final until:

1. Discovery Analyst confirms the factual baseline is complete (for brownfield: impact radius known; for greenfield: context fully reviewed)
2. Solution Architect confirms the design is coherent, implementable, and implements the product brief
3. Verification Planner confirms the design is verifiable and the verification strategy is realistic
4. architecture_lead confirms design lock (governance checkpoint)

### Routing after Architecture

| Engagement type | Architecture output routes to | Notes |
|---|---|---|
| Greenfield build | Engineering | Full design package: boundaries, contracts, interfaces, data flow |
| Brownfield adoption | Engineering | Impact assessment + modification plan |
| Discovery | Back to Product | Technical findings only, no design produced |
| Plan review | Back to client | Technical review findings, recommendations |
| Rescue | Engineering (fast-track) | Minimal design, maximal flexibility; full architecture during delivery |
| Scoped delivery | Engineering | Design depends on complexity; may be minimal for simple work |

## 6. Output

| Output | Consumer | Purpose |
|---|---|---|
| Architecture design | Engineering | Boundaries, contracts, interfaces, data flow -- the blueprint for implementation |
| Verification plan | QA | Test strategy, critical verification points, risk-based testing priorities |
| Parallelization plan | Workflow Operations | Which work can run simultaneously, dependency ordering, safe concurrency |
| ADR entries | The Firm (persistent) | Architecture decisions and rationale for institutional memory |
| Design summary | Client | Transparency -- technical approach explained in accessible terms |

## Relationship to Product

Architecture receives the product brief as its primary input. The product brief provides:
- initiative framing (problem, user, value)
- product scope (features, non-goals, sequencing)
- acceptance criteria (what "done" looks like)
- client context (accessibility preferences, communication style, quality bar)

Architecture does not re-do product work. It builds on top of the brief. If the brief is technically insufficient, Architecture escalates back to Product -- it does not conduct its own product framing.

All three Architecture agents MUST apply client context from the brief to their output. A client with `technical_depth: low` gets design summaries with less jargon. A client with `quality_bar: enterprise` gets more conservative architecture decisions and more comprehensive verification plans.

## Relationship to existing design docs

- **Operating Model:** Architecture department implements the Architecture Office roles (`context_scout`, `callsite_auditor`, `state_flow_mapper`, `solution_architect`, `verification_planner`, `parallelization_planner`). The three Architecture agents map to these roles: Discovery Analyst (context_scout + callsite_auditor), Solution Architect (solution_architect + state_flow_mapper), Verification Planner (verification_planner + parallelization_planner).
- **Agent Catalog:** The three Architecture agents match existing catalog entries. This design adds department-level structure (flow, gates, iteration) that the catalog does not define.
- **Workflow Architecture:** Architecture department owns Phase 2 (Technical Design). The exit criteria for Gate 2 (Technical Design Readiness) are what the Architecture department gate produces.
- **Governance:** architecture_lead confirms design lock as the final gate checkpoint. Maximum 2 expansion rounds before escalation.
- **Client Engagement Model:** Architecture department is downstream of Product (Phase 1) and upstream of Engineering (Phase 3) in the canonical flow.

## Notes on engagement types that skip full Architecture

Not every engagement needs full Architecture design:

- **Idea shaping:** No architecture work (advisory only, no delivery)
- **Plan review:** Discovery Analyst only (technical review of existing plan, no new design)
- **Discovery:** Discovery Analyst only (findings go back to Product, no design produced)
- **Rescue:** Expedited -- Solution Architect does minimal design sufficient to start, full architecture happens during delivery

These shortcuts are the exception, not the default. The full flow is always the starting assumption.

## Version history

- v0.1 -- initial proposal, following blueprint methodology
