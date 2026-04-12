# Code Quality

This document defines how The Firm evaluates and enforces code quality without drifting into over-engineering.

## Position

The Firm values simplicity, clarity, strong boundaries, and deliberate abstraction.

It does not treat design patterns, SOLID, or DRY as goals on their own. Those ideas are useful only when they reduce complexity and improve the codebase's long-term maintainability.

## Core Quality Principles

### Prefer small local duplication over premature abstraction

A small amount of overlap is acceptable while code is still settling.

Do not extract a helper, utility, or framework seam just because two code blocks look similar once. Extract only when repetition has become a clear, stable pattern with a meaningful name and a real maintenance benefit.

Wrong abstractions create technical debt just as surely as duplication does.

### Avoid generic buckets

Avoid vague module or file names such as:

- `utils`
- `helpers`
- `misc`
- `common`
- `manager`
- `processor`

These names often hide unclear responsibilities and encourage grab-bag modules.

Prefer names that describe behavior, domain, or responsibility directly.

Generic names are acceptable only in tightly local scopes where intent remains obvious.

### Protect boundaries

The Firm uses boundaries as a quality mechanism.

Kernel, platform, extension, and product-specific layers should not depend on each other arbitrarily. Package relationships should support the small-kernel, extensible-platform architecture rather than erode it.

Prefer public APIs, adapters, contributors, and explicit seams over reaching into internal files across package boundaries.

### Treat SOLID as a heuristic

SOLID is useful as a thinking tool, not as a mechanical compliance target.

Use it to ask better questions about:

- responsibility
- coupling
- extensibility
- dependency direction

Do not introduce interfaces, factories, layers, or indirection only to make code look more architected.

### Justify new abstractions and hooks

New abstractions are not free. Every new hook, registry, contributor, adapter, middleware seam, or lifecycle event adds concepts and maintenance cost.

Before adding one, be able to explain:

1. what concrete problem exists now
2. why a simpler local implementation is insufficient
3. what reuse value, boundary protection, or extension value the new seam provides

"It might be useful later" is not enough.

## What Quality Means in Practice

The Firm prefers code that is:

- intention-revealing
- locally understandable
- well placed in the architecture
- low in accidental coupling
- willing to duplicate a little rather than abstract badly
- explicit about current needs instead of speculative about future ones

## Review Questions

Before landing a non-trivial change, ask:

- Is this code simple in its current context?
- Is duplication still local and harmless, or has it become a true shared pattern?
- Does the name explain the responsibility clearly?
- Does this change respect package and layer boundaries?
- Is a new abstraction truly needed, or is it only more flexible in theory?
- If a new seam is added, is the reason explicit and current?

## Enforcement Model

The Firm enforces quality through a combination of:

- repo doctrine in `AGENTS.md`
- architectural guidance in this document
- ADR-backed decisions in `docs/adr/`
- code review placement and abstraction checks
- targeted tooling for boundaries, linting, and type safety where helpful

Not every quality rule should be converted into automation. The goal is maintainability, not bureaucratic ceremony.
