# PRD Interview Guide

Reference for the `write-a-prd` skill. Contains interview techniques, module design patterns, and PRD quality checks.

---

## Interview Structure

### Phase 1: Problem Understanding

Goal: Understand the problem from the USER's perspective, not the developer's.

Questions:
- "Who is experiencing this problem?"
- "What are they trying to accomplish when they hit it?"
- "How are they working around it today?"
- "What happens if we don't solve this?"

### Phase 2: Solution Exploration

Goal: Understand the user's mental model of the solution before proposing one.

Questions:
- "If you had a magic wand, what would the ideal experience look like?"
- "Are there any solutions you've already considered?"
- "What existing tools or patterns should this feel like?"
- "What would make this solution feel complete vs. nice-to-have?"

### Phase 3: Boundary Definition

Goal: Prevent scope creep by making boundaries explicit.

Questions:
- "What's explicitly OUT of scope for this?"
- "Is [edge case] something we need to handle now, or can it wait?"
- "What's the minimum that would be useful?"
- "What would a v2 look like?"

### Phase 4: Technical Grounding

Goal: Align the solution with the codebase reality.

Questions:
- "Are there existing modules we should build on top of?"
- "Are there modules we should avoid touching?"
- "What are the performance constraints?"
- "Are there security or compliance requirements?"

---

## Deep Module Design

A **deep module** has:
- A simple, narrow interface
- Rich functionality behind that interface
- Testability through the public interface alone
- Independence from implementation details

### How to identify deep module opportunities

1. **Look for clusters of related behavior** — if 3+ functions always get called together, they might belong behind one interface
2. **Look for "shallow modules"** — modules that just pass through to another module without adding value
3. **Look for test pain** — if testing a feature requires mocking 5 things, the interface is too wide

### Module sketching template

For each proposed module:

```
Module: [name]
Purpose: [one sentence]
Public interface: [list of functions/methods]
Dependencies: [what it needs from other modules]
Tests verify: [what observable behavior, not implementation]
```

---

## User Story Patterns

### Good user stories

- "As a **mobile bank customer**, I want to **see my transaction history filtered by date**, so that **I can find a specific payment**"
- Concrete actor, specific feature, clear benefit
- Testable — you can verify "yes, this works" or "no, it doesn't"

### Bad user stories (and how to fix them)

| Bad | Why | Fix |
|---|---|---|
| "As a user, I want the app to be better" | Vague, untestable | "As a returning customer, I want to see my last 5 orders on the homepage, so I can quickly reorder" |
| "As a developer, I want to refactor the auth module" | This is a task, not a user story | Rescope: "As a user, I want to stay logged in across tabs, so I don't have to re-authenticate" |
| "As an admin, I want a dashboard" | Too broad | Break into: "As an admin, I want to see daily active users, so I can track growth" |
| 50+ user stories for one PRD | Scope too large | Split into multiple PRDs or phases |

---

## PRD Quality Checklist

Before submitting the PRD, verify:

- [ ] Problem statement is from the USER's perspective
- [ ] Solution is described in user-facing terms
- [ ] User stories are specific and testable
- [ ] Implementation decisions are technology choices, not file paths
- [ ] Testing decisions specify WHICH modules and WHAT behavior to test
- [ ] Out of scope section exists and is non-empty
- [ ] No specific file paths or code snippets (they go stale)
- [ ] Each user story has a clear actor, feature, and benefit
- [ ] Module interfaces are described, not implementations
