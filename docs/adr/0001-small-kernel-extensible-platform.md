# ADR-0001: Keep a Small Kernel and Build The Firm as an Extensible Platform

**Status**: Accepted  
**Date**: 2026-04-12

## Context

The Firm is an independent product fork built on pi's philosophy.

The project needs room to add its own workflows, issue and pull request tracking behavior, provider fixes, and product-specific settings. At the same time, the project should preserve the qualities that make pi valuable: a lightweight core, strong opinions, low ceremony, and limited architectural sprawl.

Without a clear rule, future changes could drift into repeated Firm-specific edits across shared packages. That would increase maintenance cost, make the fork harder to reason about, and weaken the simplicity the project wants to keep.

The project therefore needs an explicit decision about where new behavior belongs and when core packages may change.

## Decision

The Firm will follow a **small kernel, extensible platform** model.

### Core rule

Prefer this implementation order:

1. Configure existing behavior
2. Use an existing extension point
3. Add a small reusable hook, lifecycle, registry, contributor point, adapter, or middleware seam
4. Patch kernel behavior directly only when necessary now

### Core-package policy

Changes to generic core packages are allowed when they:

- fix a real shared bug, or
- introduce a reusable extensibility seam, or
- perform approved maintenance necessary to keep upstream-derived code healthy

Firm-specific workflows, policies, and integrations should live outside the kernel whenever practical.

### Product-layer policy

The Firm should implement product behavior primarily through:

- extensions
- hooks and lifecycle integration
- registries and contributors
- adapters and provider strategies
- platform-level modules outside the kernel

## Consequences

### Positive

- Preserves pi's lightweight and opinionated philosophy
- Reduces unnecessary fork churn inside shared packages
- Makes The Firm easier to evolve as its own product
- Encourages reusable extension seams instead of repeated one-off patches
- Gives future AI sessions a clear rule for where code should live

### Negative

- Some short-term fixes may take slightly longer because they should be evaluated for extensibility value
- Certain features may still require kernel edits before proper seams exist
- Contributors must think about placement and architecture before patching shared code

### Mitigation

- Keep new seams small and focused
- Avoid building a large abstract plugin framework
- Add ADRs when significant new extension mechanisms are introduced
- Keep `AGENTS.md` and architecture docs aligned with accepted decisions

## Alternatives Considered

### 1. Put most new behavior directly in core packages

Rejected because it would make the fork harder to maintain and would blur the boundary between shared infrastructure and The Firm product logic.

### 2. Force all new behavior into extensions immediately

Rejected because some real bugs and missing seams must still be solved in the kernel first.

### 3. Stay as close to upstream as possible and avoid product-level divergence

Rejected because The Firm exists to support its own workflows, fixes, and product direction.

## Follow-Up

- Keep `AGENTS.md` aligned with this ADR
- Use `docs/architecture/core-vs-extension.md` as the explainer for contributors and AI agents
- When adding major new extensibility mechanisms, document them with follow-up ADRs
