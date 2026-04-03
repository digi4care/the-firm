---
name: write-a-prd
description: Create a PRD through user interview, codebase exploration, and module design, then submit as a GitHub issue. Use when user wants to write a PRD, create a product requirements document, or plan a new feature. Keywords - PRD, product requirements, feature spec, GitHub issue, user stories.
---

This skill will be invoked when the user wants to create a PRD. You may skip steps if you don't consider them necessary.

1. Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions.

2. Explore the repo to verify their assertions and understand the current state of the codebase.

3. Interview the user relentlessly about every aspect of this plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one.

4. Sketch out the major modules you will need to build or modify to complete the implementation. Actively look for opportunities to extract deep modules that can be tested in isolation.

A deep module (as opposed to a shallow module) is one which encapsulates a lot of functionality in a simple, testable interface which rarely changes.

Check with the user that these modules match their expectations. Check with the user which modules they want tests written for.

1. Once you have a complete understanding of the problem and solution, use the template below to write the PRD. The PRD should be submitted as a GitHub issue.

<prd-template>

## Problem Statement

The problem that the user is facing, from the user's perspective.

## Solution

The solution to the problem, from the user's perspective.

## User Stories

A LONG, numbered list of user stories. Each user story should be in the format of:

1. As an <actor>, I want a <feature>, so that <benefit>

<user-story-example>
1. As a mobile bank customer, I want to see balance on my accounts, so that I can make better informed decisions about my spending
</user-story-example>

This list of user stories should be extremely extensive and cover all aspects of the feature.

## Implementation Decisions

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

A description of the things that are out of scope for this PRD.

## Further Notes

Any further notes about the feature.

</prd-template>

## When to Use Me

Use me when:

- write a PRD
- create a PRD
- product requirements document
- feature specification
- plan a new feature
- I need a PRD

Do not use me for:

- implement this PRD
- debug this code
- write tests
- refactor this module

## Workflow

1. Ask user for detailed problem description and solution ideas
2. Explore repo to verify assertions and understand current state
3. Interview user relentlessly - resolve design tree dependencies
4. Sketch major modules, look for deep module opportunities
5. Confirm modules with user, identify which need tests
6. Write PRD with problem, solution, user stories, decisions, testing, scope
7. Submit as GitHub issue
8. Interview user relentlessly through all 4 phases — resolve design tree dependencies
9. Run PRD quality checklist before submitting (see references/interview-guide.md)

## Error Handling

- Problem unclear: ask for detailed description with user perspective
- No codebase context: proceed with interview-only approach
- Scope too large: suggest breaking into multiple PRDs
- GitHub issue fails: provide markdown for manual creation

## Quick Tests

Should trigger:

- Write a PRD
- Create a product requirements document
- Plan a new feature
- I need a feature spec

Should not trigger:

- Implement the notification feature
- Debug the email service
- Refactor the PRD module
- Write tests for auth

Functional:

- Write a PRD for a user notification system with email and SMS support
- Create a PRD for migrating from monolith to microservices

## References

- `references/references-interview-guide.md`
