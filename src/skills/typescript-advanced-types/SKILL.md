---
name: typescript-advanced-types
description: Advanced TypeScript type-system guidance for generics, conditional types, mapped types, template literal types, utility types, inference, and compile-time API design in strict TypeScript projects.
allowed-tools: Read Grep Find Edit Write Bash
version: 1.0.0
---

# TypeScript Advanced Types

Use this skill when the task is specifically about complex compile-time type design in TypeScript rather than runtime validation or framework-specific implementation details.

## Audit Summary

This skill had broad educational coverage but weak OMP skill structure:
- frontmatter did not include the current `allowed-tools` and versioned skill shape
- the main file was an extended tutorial instead of a concise routing and execution document
- required sections such as `When NOT to Use`, `Workflow`, `Error Handling`, `Quick Tests`, and `Related Skills` were missing
- there was no `references/registry.json` for progressive discovery of deep content

## When to Use

Use this skill for:
- designing reusable generic types, helper types, and compile-time APIs
- working with conditional types, `infer`, mapped types, key remapping, and template literal types
- building strongly typed builders, clients, state machines, or configuration shapes
- reviewing advanced type inference, narrowing, and discriminated union design
- writing or debugging deep readonly, deep partial, path, or extraction helper types
- improving type-safety in library code or shared TypeScript utilities

## When NOT to Use

Do not use this skill for:
- runtime schema validation or parsing of untrusted data
- introductory TypeScript syntax questions that do not involve advanced type mechanics
- framework setup work with little or no type-system complexity
- database schema design, SQL typing strategy, or ORM modeling
- situations where plain interfaces or simple types are sufficient and advanced typing would add noise

## The Iron Law

```
MAKE ILLEGAL STATES UNREPRESENTABLE WITHOUT MAKING THE TYPE SYSTEM UNMAINTAINABLE
```

Advanced types are justified only when they improve correctness, ergonomics, or reuse. If the type is harder to understand than the runtime code it protects, simplify it.

## Workflow

1. Identify the real constraint first: inference, narrowing, API ergonomics, state transitions, key transformation, or safe extraction.
2. Prefer the simplest type that preserves the invariant. Start with plain interfaces, unions, and generics before reaching for nested conditional or recursive types.
3. Use generics and constraints to connect inputs and outputs. Use `infer` only where extraction is genuinely needed.
4. For variant state or event flows, prefer discriminated unions and exhaustive switching over ad hoc optional fields.
5. For object transformation, choose mapped types, key remapping, and utility types deliberately, and verify whether composition helpers already cover the need.
6. Use type guards and assertion functions to connect runtime checks to compile-time narrowing instead of scattering type assertions.
7. Add type tests for tricky utilities so regressions fail at compile time.
8. Re-check maintainability: if the resulting type is too clever, too slow, or too opaque, simplify.

## Error Handling

| Situation | Response |
|-----------|----------|
| The type problem can be solved with a simple interface or union | Do not introduce advanced helper types unnecessarily |
| `any` appears in a core path | Replace it with `unknown`, generics, or a constrained abstraction before continuing |
| A utility type becomes recursive or deeply nested | Check compiler cost and simplify if readability or performance drops |
| Variant state uses optional fields instead of explicit tags | Replace with a discriminated union |
| Runtime assumptions are being forced with `as` | Prefer type guards or assertion functions tied to real checks |
| Type logic is correct but unreadable | Add a helper alias or refactor into smaller named types |

## Quick Tests

Should trigger:
- "Design a generic helper type for this API client"
- "Review this conditional type and infer usage"
- "How should I model this async state machine in TypeScript?"
- "Build a type-safe builder or event emitter"

Should not trigger:
- "Validate this payload at runtime"
- "Explain what an interface is"
- "Set up TypeScript in Vite"
- "Write this SQL schema"

Functional checks:
- prefers simple unions and generics before clever conditional machinery
- recommends discriminated unions for state and event flows
- favors `unknown` plus narrowing over `any` plus assertions
- requires type tests for tricky reusable helpers

## References

- `references/generics-and-constraints.md` — generic design, constraints, and reusable abstractions
- `references/conditional-and-infer.md` — conditional types, distributivity, `infer`, and extraction patterns
- `references/mapped-and-template-types.md` — mapped types, key remapping, template literals, and object transformation
- `references/patterns-and-state-machines.md` — typed builders, API clients, events, and discriminated union flows
- `references/type-guards-and-testing.md` — guards, assertion functions, and compile-time type tests
- `references/registry.json` — reference index for progressive discovery

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `zod` | Runtime schema validation and derived typing | When the problem is boundary validation rather than compile-time type design |
| `software-design-principles` | Simpler abstractions and maintainable design | When type complexity may be masking a design problem |
| `systematic-debugging` | Root-cause debugging workflow | When confusing type behavior or inference failures need systematic tracing |
| `verification-before-completion` | Evidence before completion claims | When type helpers or APIs need proof through type tests or compiler checks |