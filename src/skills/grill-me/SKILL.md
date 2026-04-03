---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me". Use when user wants to stress-test a plan, validate a design, or mentions "grill me". Keywords - grill, stress-test, validate, plan, design, interview, decision tree.
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

If a question can be answered by exploring the codebase, explore the codebase instead.

## When to Use Me

Use me when:

- grill me
- stress-test this plan
- validate my design
- is this plan solid
- poke holes in this
- challenge this architecture
- test my assumptions
- what am I missing
- is this sound

Do not use me for:

- create a new plan
- brainstorm an idea
- write a PRD
- implement this feature

## Workflow

1. Ask user to share the plan or design to validate
2. Identify decision points and dependencies
3. For each unresolved branch: ask one targeted question
4. If answer requires codebase exploration, explore instead of asking
5. Resolve dependencies one-by-one, diving deeper as needed
6. Summarize shared understanding when decision tree is resolved
7. Scan for decision points, dependencies, and implicit assumptions
8. Track resolved vs open decisions in a decision tree
9. Adjust pace and depth based on user signals (see references/interview-techniques.md)
10. Summarize shared understanding with resolved decision tree when complete

## Error Handling

- Plan too vague: ask for specific area to focus on first
- User gets frustrated: slow down, explain why each question matters
- Circular dependencies: surface the loop, ask user to break it
- Too many open branches: suggest prioritizing by risk or impact

## Quick Tests

Should trigger:

- Grill me on this design
- Stress-test my plan
- Validate this architecture
- Is this plan solid?
- What am I missing in this design?

Should not trigger:

- Help me create a plan
- Brainstorm a new feature
- Write implementation plan
- Design a system from scratch

Functional:

- Grill me on my authentication redesign plan
- Stress-test my migration strategy for moving to microservices

## References

- `references/references-interview-techniques.md`
