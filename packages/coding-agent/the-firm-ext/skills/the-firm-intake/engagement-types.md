# Engagement Types

Classify raw client requests into The Firm engagement types, expose missing information, propose minimum staffing, and define the first valid next step.

## Objective Distillation

### Step 1: Distill the input
Convert client input into:
- **One clear objective** — What are they trying to achieve?
- **Short list of desired outcomes** — What does success look like?

### Step 2: Determine engagement type
Classify into one of these categories:

| Type | Indicators | Typical Staffing |
|------|-----------|------------------|
| **Product** | Feature requests, user stories, requirements | PM + Engineer + Design |
| **Architecture** | System design, tech decisions, scaling | Architect + Senior Engineer |
| **Delivery** | Implementation, execution, shipping | Engineer + QA |
| **QA** | Testing, verification, proof | QA + Engineer |
| **Recovery** | Incidents, bugs, hotfixes | Senior Engineer + QA |
| **Research** | Investigation, understanding, exploration | Researcher/Engineer |

### Step 3: Identify known vs missing

**Already known:**
- Clear objective
- Constraints or boundaries
- Success criteria
- Timeline expectations

**Potentially missing:**
- Acceptance criteria
- Technical constraints
- Stakeholder alignment
- Resource availability
- Dependencies

### Step 4: Propose minimum staffing

**Principle:** Reduce to the minimum sufficient team. Never propose a full-force deployment without justification.

| Engagement | Minimum Staffing |
|------------|-----------------|
| Simple bug fix | 1 Engineer |
| Feature implementation | 1 Engineer + 1 QA (for verification) |
| Architecture decision | 1 Architect + 1 Stakeholder |
| Multi-workstream | Lead + relevant specialists |
| Cross-cutting change | Council or escalation |

### Step 5: Define first valid next step

The next step must be:
- Concrete and actionable
- Completable in one session
- Advancing the engagement state

Examples:
- "Document the objective and constraints in ENGAGEMENT.md"
- "Create reproduction case for the bug"
- "Distill multiple asks into prioritized backlog items"

## Multi-Workstream Handling

If the request contains multiple distinct workstreams:

1. **Mark backlog distillation as the next action**
2. **Do not force premature execution** of any single stream
3. **Record the result** into intake-shaped artifacts

## Error Handling

- If the objective is still ambiguous after reasonable distillation, stop and state what is missing
- If the request mixes multiple incompatible engagement types, split it into classified workstreams or route to backlog distillation
- If the request pretends to be delivery-ready but lacks acceptance or scope truth, classify it first instead of executing
- If staffing would require a full-force deployment without justification, reduce to the minimum sufficient team and explain why

## Quick Reference

### When to classify
- Client arrives with rough idea or mixed asks
- Request is not yet clearly product, architecture, delivery, QA, or recovery work
- The Firm needs to classify before staffing or execution
- Next step is unclear because request is high-entropy

### When NOT to classify (use direct execution)
- Direct implementation work on already classified delivery item
- QA proof review for active work
- Release decisions
- Generic OMP configuration questions
