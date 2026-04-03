# Vertical Slice Reference

Reference for the `prd-to-issues` skill. Contains vertical slicing patterns, dependency management, and issue creation guidelines.

---

## Vertical Slice Patterns

### What makes a good vertical slice

A vertical slice cuts through ALL integration layers end-to-end:

```
Schema ←→ API ←→ Business Logic ←→ UI ←→ Tests
   └──────── one slice covers all ────────┘
```

NOT a horizontal slice:

```
Schema Schema Schema Schema     ← all schema changes
API    API    API    API        ← all API changes
UI     UI     UI     UI         ← all UI changes
```

### Slice Types

#### HITL (Human-In-The-Loop)
Requires human interaction before merging. Examples:
- Architectural decision needs approval
- Design review required
- Security review needed
- Product owner sign-off on UX

#### AFK (Asynchronous From Keybord)
Can be implemented and merged without human interaction. Examples:
- Adding a new API endpoint following existing patterns
- Writing tests for documented behavior
- Refactoring within existing architectural boundaries
- Adding a field to an existing schema

**Prefer AFK over HITL** where possible.

### Slice Sizing

| Too thin | Good | Too thick |
|---|---|---|
| "Add one column to schema" | "Add user preference with schema, API, and default UI" | "Implement entire notification system" |
| Can't be demoed on its own | Demoable, verifiable, delivers value | Takes multiple sessions to complete |
| No user story is covered | Covers 1-3 user stories | Covers 10+ user stories |

---

## Dependency Management

### Dependency Types

- **blocks**: A must complete before B can start
- **related-to**: A and B are connected but not sequential
- **discovered-from**: B was discovered while working on A

### Dependency Ordering Rules

1. Create issues in dependency order (blockers first)
2. Reference real issue numbers in "Blocked by" fields
3. Never create circular dependencies — if you spot one, restructure
4. If more than 3 levels of blocking, consider if slices are too thin

### Dependency Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Every slice depends on slice 1 | Slice 1 is too broad | Split into independent foundation slices |
| No dependencies at all | Slices overlap in scope | Review for implicit dependencies |
| A→B→C→A circular | Can't execute | Find the optional dependency and break the cycle |
| Deep chain (5+ levels) | Too sequential, slow delivery | Find parallel paths |

---

## Issue Template Guide

### Writing Good Acceptance Criteria

Acceptance criteria should be:
- **Verifiable**: "Given X, when Y, then Z" format
- **Observable**: testable through public interface, not internals
- **Complete**: cover happy path + error cases + edge cases
- **Non-prescriptive**: describe WHAT, not HOW

Example:

```markdown
## Acceptance criteria

- [ ] Given a logged-in user, when they visit /settings, then they see their notification preferences
- [ ] Given a user with email notifications disabled, when an event triggers, then no email is sent
- [ ] Given a user with no preferences set, when they first visit settings, then defaults are shown
- [ ] Error case: given an invalid preference value, when submitted, then a validation error is shown
```

### Referencing Parent PRD

Don't duplicate PRD content in child issues. Instead:
- Reference specific sections: "See PRD #42, section 'Notification Delivery'"
- Reference user stories by number: "Addresses user stories 3, 7"
- Only include enough context for the implementer to work independently

---

## Breakdown Review Checklist

Before presenting slices to the user:

- [ ] Each slice is vertical (end-to-end), not horizontal (one layer)
- [ ] Each slice is demoable/verifiable on its own
- [ ] HITL vs AFK is correctly classified
- [ ] Dependencies are real, not assumed
- [ ] No circular dependencies
- [ ] At least some slices are AFK
- [ ] Each slice covers 1-5 user stories
- [ ] Acceptance criteria are testable
- [ ] Parent PRD is not modified
