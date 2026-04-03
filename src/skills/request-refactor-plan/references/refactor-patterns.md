# Refactor Planning Reference

Reference for the `request-refactor-plan` skill. Contains tiny commit strategies, scope control patterns, and test coverage assessment.

---

## Tiny Commit Strategy

Based on Martin Fowler's refactoring principles: each commit should leave the codebase in a working state.

### Commit Granularity Guide

| Refactor Type | Commit Size | Example |
|---|---|---|
| Rename variable/method | 1 commit | Single rename across all usages |
| Extract method | 1 commit | Extract + update all callers |
| Move file/module | 1 commit | Move + update all imports |
| Introduce interface | 2-3 commits | (1) Define interface, (2) Implement adapter, (3) Switch callers |
| Replace conditional with polymorphism | 3-5 commits | (1) Add strategy classes, (2) Add factory, (3) Migrate case by case, (4) Remove old code |
| Split module | 3-4 commits | (1) Create new module with shared interface, (2) Move first concern, (3) Move second concern, (4) Remove old module |

### Order of Operations

1. **Start with the safest changes**: renames, extractions
2. **Then structural changes**: moves, splits
3. **Then behavioral changes**: new logic, removed logic
4. **Each commit**: tests pass, build succeeds, no dead code

### Commit Message Pattern

```
refactor: [what changed] — [why]

- Specific change 1
- Specific change 2

Part of: #[issue-number]
```

---

## Scope Control

### Scope Hammering Technique

When the user wants to refactor "everything about X":

1. **List everything** they mentioned
2. **Categorize**: must-have vs. nice-to-have vs. separate PR
3. **Draw the boundary**: "This refactor covers [A, B, C]. [D, E] are explicitly out of scope."
4. **Get explicit agreement** on the boundary
5. **Write it down** in the refactor plan's "Out of Scope" section

### Scope Red Flags

| Red Flag | Response |
|---|---|
| "While we're at it, we could also..." | Flag as scope creep, suggest separate issue |
| "This might affect [unrelated module]" | Add to scope investigation, don't include blindly |
| "We should probably redesign [X] too" | Separate refactor, separate issue |
| User mentions 3+ modules | Ask: "What's the ONE thing that's most painful right now?" |

### Scope Interview Questions

- "If this refactor fixes only ONE thing, what would give you the most relief?"
- "What can stay exactly as it is?"
- "What's the biggest pain point that prompted this refactor?"
- "Are there modules you're afraid to touch right now?"

---

## Test Coverage Assessment

### Before Refactoring

1. **Map existing tests** for the affected area
2. **Identify coverage gaps** — paths that aren't tested
3. **Classify tests**: behavior tests (good) vs. implementation tests (fragile)
4. **Assess risk**: how likely is the refactor to break something undetected?

### Coverage Decision Matrix

| Existing Coverage | Risk Level | Recommendation |
|---|---|---|
| Good behavior tests | Low | Proceed with refactor |
| Implementation tests | Medium | Add behavior tests before refactoring |
| No tests | High | Write characterization tests first |
| Tests but they're flaky | High | Stabilize tests before refactoring |

### What to Ask the User

- "Are there tests for this area of the codebase?"
- "Do you trust the existing tests to catch regressions?"
- "Are there any manual verification steps you currently do?"
- "What's the deployment risk if this breaks?"

---

## Alternative Approaches

When presenting alternatives to the user:

### Strangler Fig Pattern
Gradually replace old code by routing new requests to new implementation. Low risk, slow pace.

### Big Bang Rewrite
Replace entire module at once. High risk, fast pace. Only justified when old code is unsalvageable.

### Interface Extraction
Add an abstraction layer, then swap implementations behind it. Medium risk, medium pace. Best for most refactors.

### Parallel Implementation
Build new version alongside old, switch over with feature flag. Low risk, extra code to maintain during transition.
