---
name: "TypeScript Coding"
description: "TypeScript coding conventions and best practices"
owner: "The Firm Architecture Team"
language: TypeScript
---

Use strict TypeScript configuration (`strict: true`).
Prefer `interface` for object shapes; `type` for unions, intersections, and mapped types.
Avoid `any` — use `unknown` and narrow with type guards.
Use `readonly` and `as const` where data should not mutate.
Prefer `enum` (union of string literals) over numeric enums.
Organize imports: Node built-ins → external packages → internal modules.
Use async/await over raw Promises; avoid `void` return from async functions.
Export at the declaration site; avoid barrel files for deep module trees.
