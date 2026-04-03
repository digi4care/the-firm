---
name: request-refactor-plan
description: Create a detailed refactor plan with tiny commits via user interview, then file it as a GitHub issue. Use when user wants to plan a refactor, create a refactoring RFC, or break a refactor into safe incremental steps. Keywords - refactor, plan, tiny commits, RFC, GitHub issue, incremental.
---

This skill will be invoked when the user wants to create a refactor request. You should go through the steps below. You may skip steps if you don't consider them necessary.

1. Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions.

2. Explore the repo to verify their assertions and understand the current state of the codebase.

3. Ask whether they have considered other options, and present other options to them.

4. Interview the user about the implementation. Be extremely detailed and thorough.

5. Hammer out the exact scope of the implementation. Work out what you plan to change and what you plan not to change.

6. Look in the codebase to check for test coverage of this area of the codebase. If there is insufficient test coverage, ask the user what their plans for testing are.

7. Break the implementation into a plan of tiny commits. Remember Martin Fowler's advice to "make each refactoring step as small as possible, so that you can always see the program working."

8. Create a GitHub issue with the refactor plan. Use the following template for the issue description:

<refactor-plan-template>

## Problem Statement

The problem that the developer is facing, from the developer's perspective.

## Solution

The solution to the problem, from the developer's perspective.

## Commits

A LONG, detailed implementation plan. Write the plan in plain English, breaking down the implementation into the tiniest commits possible. Each commit should leave the codebase in a working state.

## Decision Document

A list of implementation decisions that were made. This can include:

- The modules that will be built/modified
- The interfaces of those modules that will be modified
- Technical clarifications from the developer
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They may end up being outdated very quickly.

## Testing Decisions

A list of testing decisions that were made. Include:

- A description of what makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for the tests (i.e. similar types of tests in the codebase)

## Out of Scope

A description of the things that are out of scope for this refactor.

## Further Notes (optional)

Any further notes about the refactor.

</refactor-plan-template>

## When to Use Me

Use me when:

- plan a refactor
- create refactor plan
- refactoring RFC
- break refactor into commits
- tiny commits refactor
- plan code restructuring
- refactor into safe steps

Do not use me for:

- implement this feature
- fix this bug
- write a PRD
- design an interface

## Workflow

1. Ask user for detailed problem description and solution ideas
2. Explore repo to verify assertions and understand current state
3. Present alternative options, get user preference
4. Interview user relentlessly about implementation details
5. Hammer out exact scope - what to change and what NOT to change
6. Check test coverage, ask about testing plans if insufficient
7. Break into tiny commits (Fowler: each step keeps code working)
8. Create GitHub issue with refactor plan
9. Present alternative approaches (see references/refactor-patterns.md)
10. Interview user about implementation — hammer out scope (see references/refactor-patterns.md scope control)
11. Check test coverage, assess risk level (see references/refactor-patterns.md test coverage)
12. Break into tiny commits following Fowler's principle: each step keeps code working

## Error Handling

- Problem unclear: ask for detailed description with examples
- No test coverage: flag risk, ask about testing plans
- Scope creep: document explicitly what's out of scope
- GitHub issue fails: provide markdown for manual creation

## Quick Tests

Should trigger:

- Plan a refactor for this module
- Create a refactoring RFC
- Break this refactor into tiny commits
- Plan code restructuring
- I need a refactor plan

Should not trigger:

- Implement user authentication
- Fix the login bug
- Write a PRD for payments
- Debug the failing test

Functional:

- Create a refactor plan for consolidating the user service modules
- Break the auth module refactor into safe incremental commits

## References

- `references/references-refactor-patterns.md`
