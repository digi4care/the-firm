---
name: software-design-principles
description: >
  Practical software design rules: object calisthenics, feature envy detection, dependency inversion,
  fail-fast error handling, intention-revealing naming, type-driven design, deep modules,
  information hiding, complexity management, and strategic programming. Use when
  writing new code, refactoring, reviewing code design, or analyzing module structure.
  Triggers on: "review this design", "check for feature envy", "apply calisthenics",
  "is this module deep enough", "complexity budget".
allowed-tools: Bash Read Write Edit
---

# Software Design Principles

Practical design rules for writing maintainable, well-structured code. Combines Ousterhout's complexity management philosophy with actionable coding principles.

## When to Use Me

Use me when:
- writing new classes or functions and want them well-designed from the start
- refactoring existing code that has grown complex or rigid
- reviewing code design — checking for feature envy, shallow modules, or naming issues
- analyzing module structure — is a module deep enough? Does it hide the right information?
- deciding between strategic investment and tactical shortcuts
- evaluating whether code follows type-safety, dependency injection, or fail-fast principles

## When NOT to Use Me

Do not use me for:
- debugging runtime errors or fixing syntax — that is direct debugging
- choosing between libraries or frameworks
- writing tests for specific functionality
- performance optimization that does not involve structural changes
- CSS or styling work

**Decision test**: "Am I making a structural or behavioral design decision about code?" YES = use this skill. NO = solve directly.

## Critical Rules

These are non-negotiable defaults for all new code:

1. **Fail-fast over silent fallbacks.** Never use fallback chains (`value ?? backup ?? 'unknown'`). If data should exist, validate and throw a clear error.

2. **Maximum type-safety. No `any`. No `as`.** Type escape hatches defeat TypeScript's purpose. There is always a type-safe solution.

3. **Make illegal states unrepresentable.** Use discriminated unions, not optional fields. If a state combination shouldn't exist, make the type system forbid it.

4. **Inject dependencies, don't instantiate.** No `new SomeService()` inside methods. Pass dependencies through constructors.

5. **Intention-revealing names only.** Never use `data`, `utils`, `helpers`, `handler`, `processor`. Name things for what they do in the domain.

6. **No code comments as excuse.** Comments are a failure to express intent in code. If you need a comment to explain what code does, refactor the code instead. Comments capturing design intent (why, not what) are acceptable — see `references/comments-as-design.md`.

## Workflow

### Step 1: Assess Complexity (Philosophy)

Before diving into specific rules, evaluate the overall design health. Ask:

- Does the module hide significant complexity behind a simple interface? See `references/deep-modules.md`
- Is information leaking across module boundaries? See `references/information-hiding.md`
- Are the three complexity symptoms present: change amplification, cognitive load, unknown unknowns? See `references/complexity-symptoms.md`

### Step 2: Check Object Calisthenics

Apply the 9 rules. The most impactful for code review:

| Rule | What to Look For |
|------|-----------------|
| One level of indentation | Deeply nested logic |
| No ELSE keyword | Use early returns instead |
| Wrap primitives | Raw strings/numbers used as domain concepts |
| First class collections | Classes mixing collection logic with other concerns |
| One dot per line | Chain calls like `a.getB().getC()` |
| Don't abbreviate | Short, cryptic names |
| Keep entities small | Classes > 150 lines, methods > 10 lines |
| No getters/setters on entities | Objects exposing data instead of doing work |

### Step 3: Review Dependencies and Naming

**Feature envy:** Method uses another class's data more than its own? Move it there.

**Dependency inversion:** Scan for `new X()` inside methods. Extract to constructor injection.

**Naming:** Replace generic names (`data`, `utils`, `helpers`, `manager`, `processor`) with domain-specific, intention-revealing names.

### Step 4: Verify Type Safety

- No `any` or `as` type assertions
- Discriminated unions for state-dependent types (not optional fields)
- Value objects for domain primitives
- Zod schemas for runtime validation of external data

### Step 5: Strategic Evaluation

- Is this the simplest interface that covers current needs? See `references/general-vs-special.md`
- Are we building only what is needed now (YAGNI)?
- Does this change leave the code simpler than we found it? See `references/strategic-programming.md`

## Error Handling

| Situation | Response |
|-----------|----------|
| Code has no obvious design issues | Do not force patterns. Simple, correct code does not need design changes. |
| Feature envy is ambiguous (equal external/internal refs) | Use judgment. If the method conceptually belongs to the other class, move it. |
| Principle conflicts with framework convention | Follow the framework convention. Note the deviation. |
| Two principles contradict each other | Favor the principle that reduces more complexity. |
| Existing code is too entangled to fix in one pass | Flag for incremental improvement. Do not attempt a mega-refactor. |

## Quick Tests

Should trigger:
- "Review this code's design."
- "Check this class for feature envy."
- "Apply object calisthenics to this file."
- "Is this module deep enough or should it be split?"
- "Improve naming in this file."

Should not trigger:
- "Fix this failing test."
- "Choose between React and Vue."
- "Debug this API endpoint."
- "Style this component with Tailwind."

Functional:
- Detects feature envy by counting external vs own class references.
- Identifies shallow modules and suggests deepening or merging.
- Spots dependency inversion violations (`new` inside methods).
- Flags generic names and suggests domain-specific alternatives.
- Recognizes when no design change is needed — does not force patterns.

## References

- `references/complexity-symptoms.md` — Three symptoms of complexity (change amplification, cognitive load, unknown unknowns), two causes (dependencies, obscurity), measuring complexity
- `references/deep-modules.md` — Deep vs shallow modules, interface-to-functionality ratio, classitis, designing for depth
- `references/information-hiding.md` — Information hiding principle, information leakage red flags, temporal decomposition, decorator pitfalls
- `references/general-vs-special.md` — Somewhat general-purpose approach, pushing complexity down, configuration parameter antipattern
- `references/comments-as-design.md` — Four comment types, comment-driven design, self-documenting code myth, maintaining comments
- `references/strategic-programming.md` — Strategic vs tactical mindset, tactical tornado, investment approach, startup considerations
