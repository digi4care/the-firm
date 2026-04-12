# ADR-0003: Use Simplicity, Boundaries, and Deliberate Abstraction as The Firm's Code Quality Doctrine

**Status**: Accepted  
**Date**: 2026-04-12

## Context

The Firm wants strong code quality, but it does not want to enforce quality through ceremony, pattern cargo-culting, or abstraction for its own sake.

The project is intentionally built on pi's lightweight philosophy. That means quality should reinforce simplicity and maintainability, not fight against them.

Without an explicit doctrine, future contributors or AI agents could easily:

- extract abstractions too early in the name of DRY
- introduce generic `utils` or `helpers` buckets that hide responsibility
- erode kernel, extension, and product boundaries through convenient imports
- apply SOLID mechanically and add layers without real value
- add hooks or registries without a clear present-day use case

The project therefore needs a clear statement of what code quality means in The Firm.

## Decision

The Firm will enforce code quality through simplicity, explicit boundaries, and deliberate abstraction.

### Core rules

- Prefer small local duplication over premature abstraction.
- Extract shared abstractions only when a repeated pattern is clear, stable, and meaningfully named.
- Avoid generic module names such as `utils`, `helpers`, `misc`, `common`, `manager`, and `processor` unless the scope is tightly local and the intent remains obvious.
- Protect package and import boundaries so the small-kernel, extensible-platform architecture does not erode over time.
- Treat SOLID as a heuristic for thinking, not as a mandatory framework for adding layers or indirection.
- Require explicit justification for new hooks, registries, adapters, contributors, middleware seams, and lifecycle mechanisms.

### Justification rule for new seams

When adding a new abstraction or extension seam, explain:

1. what concrete problem exists now
2. why a simpler implementation is insufficient
3. what current reuse, extension, or boundary value the seam provides

## Consequences

### Positive

- Keeps code quality aligned with pi's lightweight philosophy
- Reduces the risk of over-engineering and abstraction debt
- Makes module ownership and responsibility clearer
- Protects architectural boundaries as The Firm evolves
- Gives AI agents a concrete decision model for design choices

### Negative

- Contributors must sometimes tolerate local duplication for longer
- Some quality decisions remain review-based rather than fully automated
- New abstractions may require more explanation before they are accepted

### Mitigation

- Keep review criteria explicit in `AGENTS.md` and architecture docs
- Add tooling only where it reinforces clear boundaries and type safety
- Prefer small, well-explained steps over broad framework-building

## Alternatives Considered

### 1. Enforce SOLID and DRY directly as the primary quality doctrine

Rejected because that tends to encourage ceremony, premature abstraction, and pattern-driven code rather than maintainable code.

### 2. Rely only on linters and type checks

Rejected because many important quality decisions are architectural and semantic, not just syntactic.

### 3. Leave quality to contributor judgment without repository doctrine

Rejected because The Firm wants future human and AI sessions to share the same design defaults without re-explaining them each time.

## Follow-Up

- Keep `AGENTS.md` aligned with this doctrine
- Keep `docs/architecture/code-quality.md` as the explainer for contributors and AI agents
- Add boundary-enforcement tooling later where it provides clear value without unnecessary ceremony
