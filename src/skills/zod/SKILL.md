---
name: zod
description: Zod v4 best practices, parsing patterns, schema design, transforms, error handling, and type inference guidance for TypeScript applications using runtime validation at system boundaries.
allowed-tools: Read Grep Find Edit Write Bash
license: MIT
version: 1.0.0
---

# Zod

Use this skill when the task is specifically about Zod v4 schema validation, parsing untrusted data, composing runtime schemas, or integrating Zod into TypeScript application boundaries.

## Audit Summary

This skill had strong domain content but weak skill routing structure for the current `skill-creator` rubric:
- frontmatter used source metadata instead of the current `allowed-tools` and versioned skill shape
- required sections such as `When NOT to Use`, `Workflow`, `Error Handling`, `Quick Tests`, and `Related Skills` were missing
- the main file mixed trigger logic, reference cataloging, and deep rule taxonomy instead of acting as a concise routing document
- the directory had rich references and rules content but no reference registry for progressive discovery

## When to Use

Use this skill for:
- designing or reviewing Zod v4 schemas in TypeScript
- deciding between `parse`, `safeParse`, `parseAsync`, and `safeParseAsync`
- composing objects, unions, discriminated unions, recursive schemas, transforms, and refinements
- handling Zod validation errors for forms, APIs, env parsing, or external service boundaries
- migrating from Zod v3 to v4 patterns
- organizing schema validation at application boundaries and deriving domain types with `z.infer`

## When NOT to Use

Do not use this skill for:
- compile-time-only typing with no runtime validation requirement
- choosing between unrelated validation libraries when Zod is not already part of the problem
- generic TypeScript type design unrelated to schema parsing or validation
- framework setup tasks that do not involve Zod usage
- database schema design or ORM validation outside application runtime boundaries

## The Iron Law

```
PARSE UNTRUSTED DATA AT THE BOUNDARY, PASS TYPED DATA INWARD, AND DO NOT DUPLICATE TYPES BY HAND
```

If data crosses a trust boundary, validate it. If data is already trusted and internal, do not add decorative parsing for its own sake.

## Workflow

1. Inspect the repository and task context first. Confirm Zod v4 usage, TypeScript boundaries, and whether the schema is for API input, form input, env parsing, or external service data.
2. Decide whether runtime validation is actually required. If the problem is compile-time only, prefer plain TypeScript.
3. Choose the parsing API deliberately: `safeParse()` for recoverable user input, `parse()` for fail-fast internal startup paths, and async parsing when async refinements exist.
4. Model schemas around the boundary contract. Use object composition, discriminated unions, recursive getter patterns, transforms, and refinements only where they clarify the contract.
5. Derive types from schemas with `z.infer<typeof Schema>` rather than duplicating shapes manually.
6. Shape error handling for the consumer: flattened errors for forms, tree-shaped errors for nested structures, and safe logging that avoids leaking sensitive input.
7. For migrations or reviews, check v4-specific changes first: string formats, enum handling, recursive schemas, and the `error` API.
8. Use the references and rules for deep guidance on objects, parsing, transforms, anti-patterns, CI, and boundary architecture.

## Error Handling

| Situation | Response |
|-----------|----------|
| Schema includes async refinement or transform | Use `parseAsync()` or `safeParseAsync()`; sync parsing is incomplete |
| User input failure must not throw | Prefer `safeParse()` and return structured validation errors |
| Form error rendering is needed | Use flattened or treeified errors rather than raw exception text |
| Sensitive values appear in logs | Do not enable input-reporting patterns that leak raw payloads in production |
| Boolean coercion looks convenient | Re-check semantics; `z.coerce.boolean()` is often wrong for string inputs such as `"false"` |
| Recursive schema example uses `z.lazy()` | Replace with the current v4 getter-based recursive pattern |

## Quick Tests

Should trigger:
- "Review this Zod schema for v4 best practices"
- "Should I use safeParse or parse here?"
- "Migrate this Zod v3 schema to v4"
- "Validate API input with Zod and derive the TypeScript type"

Should not trigger:
- "Design this TypeScript interface"
- "Set up Prisma models"
- "Choose a validation library for my project"
- "Explain generics in TypeScript"

Functional checks:
- recommends boundary parsing rather than parsing everywhere
- derives types from schemas instead of duplicating them manually
- distinguishes sync and async parsing correctly
- routes deep implementation details into references and rule files rather than bloating the main skill file

## References

- `references/schema-types.md` — primitives, formats, enums, records, maps, files, JSON, and core schema building blocks
- `references/parsing-and-inference.md` — parse APIs, coercion, inference, and input/output typing
- `references/objects-and-composition.md` — objects, unions, composition, recursion, and schema derivation
- `references/refinements-and-transforms.md` — refine, superRefine, transform, pipe, defaults, and staged parsing
- `references/error-handling.md` — ZodError handling, formatting, and safe reporting patterns
- `references/advanced-features.md` — codecs, branded types, registries, and JSON Schema support
- `references/anti-patterns.md` — common Zod mistakes with bad and good examples
- `references/boundary-architecture.md` — API, forms, env, and external-service boundary placement
- `references/linter-and-ci.md` — linting, CI checks, schema snapshots, and dependency hygiene
- `references/registry.json` — reference index for progressive discovery

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `better-auth` | Auth flow and runtime validation contexts | When Zod is being used around auth/session boundaries |
| `software-design-principles` | Boundary and type-driven design | When schema placement and domain boundaries need architectural review |
| `systematic-debugging` | Root-cause debugging workflow | When validation behavior is wrong and the failure source is unclear |
| `verification-before-completion` | Evidence before completion claims | When schema changes must be proven with tests or runtime checks |