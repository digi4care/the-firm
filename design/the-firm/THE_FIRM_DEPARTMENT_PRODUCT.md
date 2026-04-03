# The Firm Product Department Design v0.2

## Purpose

This document defines the Product department: why it exists, how it works, what expertise it needs, what persistent state it maintains, and what it produces.

Designed using the Department Blueprint Methodology (see `THE_FIRM_DEPARTMENT_BLUEPRINT.md`).

---

## 1. Why does this department exist?

Product exists because someone must translate what the client wants into what The Firm will build -- and just as importantly, into what it will not build.

Intake produces a classified engagement brief. That brief says *what the client asked for*. Product says *what problem is actually being solved, what scope is realistic, and what success looks like in observable terms*.

Without Product:
- work starts from unclear problem definitions
- scope is either too vague ("make it better") or too implementation-shaped ("add a button to X")
- there is no shared definition of done that Product, Architecture, and QA can align on
- the client's real intent gets lost between intake and implementation

Product is the translation layer between client intent and buildable specification. No other department performs this function.

## 2. Who does this department serve?

**Primary: The Firm's delivery pipeline.**

Product serves the departments that come after it -- Architecture, Engineering, QA. It produces the framing they need to do their work: sharp problem statements, explicit scope, and testable acceptance criteria.

**Secondary: The client.**

The client benefits from Product's work through clearer scope, visible non-goals, and a shared understanding of what "done" means. But Product's loyalty is to the integrity of the specification, not to telling the client what they want to hear.

## 3. Expertise areas

Product requires three distinct kinds of thinking. Each is a separate agent because the mindset is fundamentally different.

### Product Strategist

- **What it does:** Frames the initiative at the highest level. Defines the problem, the user, the value proposition, and the strategic boundaries. Answers: "Why does this matter? For whom? What does success look like at a product level?"
- **Why separate:** Strategic framing requires abstraction -- stepping back from the specific request to understand the underlying need. This is a different mindset than breaking down scope or defining acceptance tests. A strategist sees the forest; a manager sees the trees.
- **Role within department:** First mover. Takes the intake brief and produces the initiative framing. Sets the boundaries that the other two agents work within.

### Product Manager

- **What it does:** Translates the strategic frame into feature-level scope, sequencing, and explicit work decomposition. Answers: "What specifically are we building? What are we not building? In what order? What are the dependencies?"
- **Why separate:** Tactical decomposition and sequencing requires precision and realism. It requires understanding what is buildable, what can be parallelized, and what must come first. This is not strategy and it is not quality assurance -- it is scope engineering.
- **Role within department:** Takes the strategist's framing and makes it concrete. Produces the product brief that downstream departments can plan against.

### Acceptance Designer

- **What it does:** Turns the product brief into explicit, observable acceptance expectations. Defines what "done" means in terms that can be verified. Identifies edge cases, failure modes, and quality expectations that the brief may not have made explicit.
- **Why separate:** Acceptance thinking is adversarial and specific. It asks: "How could this fail? What would a client consider unacceptable? What edge cases must be handled?" This is not strategy and not scope planning -- it is quality-minded specification that exists to protect both the client and The Firm from ambiguity.
- **Role within department:** Takes the product brief and stress-tests it. Produces the acceptance specification that QA will eventually verify against.

## 4. Persistent information

Product maintains two persistent records:

### Product pattern library

Accumulated patterns from product framing work:

- common scope pitfalls by engagement type (e.g., greenfield builds always underestimate integration scope)
- acceptance patterns that catch real bugs vs. ones that are theatrical
- scope decomposition heuristics that produce parallelizable work
- anti-patterns: scope definitions that led to rework or scope creep

This library makes each Product engagement faster and more accurate because it encodes institutional experience.

### Decision register

A log of product-level decisions across engagements:

- what was in scope and what was explicitly out of scope
- why certain tradeoffs were chosen
- what acceptance expectations were set
- what changed between framing and delivery (and why)

This provides traceability and learning: future engagements benefit from knowing what tradeoffs worked and which ones didn't.

## 5. Internal flow

```
Intake brief arrives
  │
  ▼
Product Strategist ──── frames the initiative
  │                     defines problem, user, value
  │                     sets strategic boundaries
  │                     identifies non-goals
  │
  │  if the brief is insufficient ──→ back to Intake Lead for clarification
  │
  ▼
Product Manager ──── decomposes into features
  │                  sequences the work
  │                  identifies dependencies
  │                  produces product brief
  │
  │  if scope is unrealistic or underspecified ──→ back to Strategist for reframing
  │
  ▼
Acceptance Designer ──── stress-tests the brief
  │                       defines observable acceptance criteria
  │                       identifies edge cases and failure modes
  │
  │  if acceptance reveals scope gaps ──→ back to Product Manager for scope adjustment
  │
  ▼
OUTPUT ──→ product brief → Architecture (or Engineering for simple work)
       ──→ acceptance specification → QA (for later verification)
       ──→ decision register update → persistent
       ──→ scope summary → client (transparency)
```

### Iteration points

- Strategist → Intake Lead: brief is insufficient for framing (missing intent, unclear goals, contradictory requirements)
- Manager → Strategist: scope doesn't decompose cleanly into buildable units (reframing needed)
- Acceptance Designer → Manager: acceptance criteria reveal gaps in scope or unrealistic expectations
- No iteration skips a step -- every engagement goes through Strategist → Manager → Acceptance Designer

### Gate

The product package is not final until:
1. Product Strategist confirms the framing matches the client's intent (against intake brief)
2. Product Manager confirms scope is buildable and sequenced
3. Acceptance Designer confirms acceptance criteria are observable and complete
4. Client confirms scope and non-goals (transparency checkpoint)

### Routing after Product

Product's output routes differently based on engagement type:

| Engagement type | Product output routes to | Notes |
|---|---|---|
| Idea shaping | Back to client | Advisory only, no delivery |
| Plan review | Architecture | For technical review of existing plan |
| Greenfield build | Architecture | Full design package needed |
| Brownfield adoption | Architecture (Discovery) | Impact assessment first |
| Scoped delivery | Architecture or Engineering | Depends on complexity |
| Rescue | Architecture (fast-track) | Skip non-essential framing |
| Discovery | Architecture (Discovery-only) | Scope unknown; Product produces discovery framing only, not full brief |

## 6. Output

| Output | Consumer | Purpose |
|---|---|---|
| Initiative framing | Downstream departments, client | Shared understanding of the problem |
| Product brief | Architecture, Engineering | Buildable specification with scope, non-goals, and sequencing |
| Acceptance specification | QA | Observable criteria that define "done" |
| Decision register entry | The Firm (persistent) | Traceability and institutional learning |
| Scope summary | Client | Transparency -- shows what is and is not included |

## Relationship to Intake

Product receives the intake brief as its primary input. The intake brief provides:
- engagement classification (type, urgency, risk)
- client intent (objective, desired outcomes, constraints)
- client context (communication preferences, accessibility needs, quality bar)

Product does not re-do intake. It builds on top of the brief. If the brief is insufficient for product framing, Product escalates back to Intake -- it does not conduct its own client conversation.

All three Product agents MUST apply client context from the brief (accessibility needs, output preferences, communication style) to their own output. A client with dyslexia gets bullet lists and short paragraphs in the product brief, not walls of prose. A client with `decision_velocity: fast` gets fewer options with a clear recommendation.

## Relationship to existing design docs

- **Operating Model:** Product department implements the Product Office roles (`product_strategist`, `product_manager`, `acceptance_designer`). Each role maps to one agent.
- **Agent Catalog:** The three Product agents match the existing catalog entries. This design adds department-level structure (flow, gates, iteration) that the catalog does not define.
- **Workflow Architecture:** Product department owns Phase 1 (Product Framing). The exit criteria for Gate 1 (Product Readiness) are what the Product department gate produces.
- **Client Engagement Model:** Product department is downstream of Intake (Phase 0) and upstream of Architecture (Phase 2) in the canonical flow.

## Notes on engagement types that skip Product

Not every engagement needs full Product framing:

- **Idea shaping:** Product Strategist only (quick framing, no decomposition or acceptance)
- **Plan review:** Product Manager reviews the supplied plan for realism, then routes to Architecture
- **Rescue:** Expedited -- Product Strategist does minimal framing, full Product work happens during delivery
- **Simple scoped delivery with clear requirements:** May skip Product Strategist and go straight to Product Manager for scope confirmation

These shortcuts are the exception, not the default. The full flow is always the starting assumption.

## Version history

- v0.2 -- scenario-tested: added discovery-first routing; explicit client context application requirement
- v0.1 -- initial proposal, following blueprint methodology
