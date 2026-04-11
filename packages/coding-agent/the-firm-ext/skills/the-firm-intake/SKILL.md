---
name: the-firm-intake
description: Unified The Firm intake, classification, and routing skill. Absorbs raw client input, classifies engagement types, and routes to the correct workflow. Use when the client is speaking to The Firm and the right next path is not yet explicit.
allowed-tools: Bash Read Write Edit
context:
  domains:
    - process
  concerns:
    - intake-routing
    - workflow-classification
    - engagement-types
    - decision-trees
  technologies: []
  patterns:
    - request-classification
    - workflow-routing
    - ambiguity-resolution
  priority: 7
  tokenBudget: 2000

---

# The Firm Intake

A unified The Firm-native skill for converting raw client conversation into governed flow — covering intake absorption, engagement classification, and workflow routing decisions.

## When to Use Me

Use me when:
- the client is asking The Firm for help and the right workflow path is not yet explicit
- the input is messy, mixed, high-entropy, or contains multiple workstreams
- The Firm must decide whether to classify, backlog, route, or escalate
- classifying the engagement type before staffing or execution
- building or maintaining repo-specific workflow router commands
- determining output mode (compact vs full) for routing responses

Do not use me for:
- already scoped implementation work with a clear owning run
- narrow QA or release decisions already in progress
- direct execution of specialist work
- one-off workflow questions without a router command context

## Quick Decision Tree

```
[Client speaks to The Firm]
         |
         v
[Is the request clear and scoped?]----YES----> [Direct routing to existing run]
         |                                          |
        NO                                          v
         |                              [Proceed with governed execution]
         v
[Multiple workstreams or side-paths?]---YES---> [Backlog distillation]
         |                                          |
        NO                                          v
         |                              [Structure and prioritize workstreams]
         v
[Intake classification]
         |
         v
[Classify engagement type] ---> [Determine staffing] ---> [First valid next step]
```

## Core Responsibilities

### 1. Intake Absorption (from firm-front-desk)
- Read client input as a firm-facing request, not as an implementation prompt
- Decide: intake classification / backlog distillation / direct routing / escalation
- Prevent raw client entropy from becoming implicit execution

### 2. Engagement Classification (from intake-classification)
- Distill input into one clear objective and desired outcomes
- Determine engagement type (product, architecture, delivery, QA, recovery)
- Identify known vs missing information
- Propose minimum sufficient staffing
- Define first valid next step

### 3. Workflow Routing (from workflow-router-support)
- Apply classification taxonomy with priority order
- Resolve ambiguities using precedence rules
- Select output mode (compact vs full)
- Extract bounded next step
- When the client wants to set up project governance, standards, or rules, route to the `kb-setup` tool from the the-firm-runtime extension.
- Include stop signs when implementation is premature

## Section Overview

| File | Purpose |
|------|---------|
| `decision-tree.md` | High-level intake routing and decision flowcharts |
| `engagement-types.md` | Engagement classification and staffing proposals |
| `routing-guide.md` | Classification priority, ambiguity resolution, workflow selection |
| `output-modes.md` | Compact vs full output mode contracts |
| `integration-contract.md` | Skill vs command boundaries and ownership split |

## Unified Workflow

### Phase 1: Intake Assessment
1. Read client input as firm-facing request
2. Assess clarity and scope
3. If clear and scoped → direct routing
4. If multiple workstreams → backlog distillation
5. Otherwise → proceed to classification

### Phase 2: Classification
1. Distill into clear objective and outcomes
2. Determine primary engagement type
3. Identify missing information
4. Propose minimum staffing
5. Define first valid next step

### Phase 3: Routing
1. Apply classification taxonomy (see routing-guide.md)
2. Resolve any ambiguities
3. Select output mode
4. Extract bounded next step
5. Evaluate and include stop signs

## Error Handling

- If no truthful workflow path can be chosen, stop and state the ambiguity
- If the client request would bypass issue-first execution, redirect to intake or backlog
- If the request would require strategic or governance decision, escalate
- If objective is still ambiguous after distillation, state what is missing
- If request mixes incompatible engagement types, split or route to backlog distillation

## Triggers

### Should trigger
- "I am the client and I am asking The Firm several things at once"
- "Figure out how this request should be handled before anyone starts building"
- "This conversation is drifting — route it correctly"
- "I have an idea but I do not know how to shape it"
- "Review this plan and tell me what kind of engagement it is"
- "Classify this request for The Firm"
- "Route this to the right workflow"
- "How should this be handled?"

### Should not trigger
- "Implement this already-scoped task"
- "Run QA on this completed work item"
- "Release this build"
- "Write code for this specific bugfix"
- "Execute this plan"

## References

- `decision-tree.md` - High-level routing decisions
- `engagement-types.md` - Engagement classification
- `routing-guide.md` - Classification taxonomy and routing logic
- `output-modes.md` - Output mode contracts
- `integration-contract.md` - Skill vs command boundaries
- `.pi/internal/the-firm/THE_FIRM_CLIENT_ENGAGEMENT_MODEL.md`
- `.pi/internal/the-firm/THE_FIRM_DOCTRINE.md`

## Operational Notes

The client should feel like they are speaking to a professional firm, not to a loose swarm of half-routed specialists.

This skill exists to ensure that entropy is converted into governed flow before execution expands.

The Firm must absorb entropy and respond with structure.

---

**Note on Merged Skills:** This skill consolidates the functionality of `firm-front-desk`, `intake-classification`, and `workflow-router-support`. Those skills are deprecated; use this skill for all intake, classification, and routing needs.
