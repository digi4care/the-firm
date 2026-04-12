# Core vs Extension

This document defines how The Firm should evolve without losing pi's lightweight philosophy.

## Product Position

The Firm is an independent product fork built on pi's philosophy.

It is not meant to become a broad rewrite of upstream. It should stay small, opinionated, and maintainable while still allowing The Firm to ship its own workflows, integrations, fixes, and product behavior.

## Architectural Goal

The Firm follows a **small kernel, extensible platform** approach.

- The **kernel** should remain lightweight and generic.
- The **platform layer** should carry The Firm's product behavior.
- New Firm needs should push the architecture toward reusable seams instead of repeated core patching.

## Kernel Responsibilities

The kernel is the place for behavior that is generic, reusable, and structural.

Typical kernel responsibilities:

- session and agent lifecycle
- model and provider contracts
- settings infrastructure
- extension loading and execution
- registries and contributor systems
- generic hooks and lifecycle events
- shared types and validation rules
- bug fixes that improve the base system itself

## Platform Responsibilities

The Firm platform layer is the place for product-specific behavior.

Typical platform responsibilities:

- The Firm workflows and policies
- issue and pull request tracking behavior
- Firm-specific settings sections
- provider-specific workarounds that should not become global behavior
- custom commands, views, and operational integrations
- product-facing defaults and UI behavior

## Default Decision Rule

When adding or changing behavior, prefer this order:

1. **Configure existing behavior**
2. **Use an existing extension point**
3. **Add a small generic seam in the kernel**
4. **Patch kernel behavior directly only if necessary now**

Direct kernel patches are allowed when:

- they fix a real bug, or
- they introduce a reusable extensibility seam

Direct kernel patches are not the default place for The Firm product logic.

## How to Decide Where a Change Belongs

| If the change is... | Prefer... |
|---|---|
| reusable outside The Firm | kernel |
| a host capability such as hooks, lifecycle, registries, contributors, or adapters | kernel |
| a bug in shared behavior | kernel |
| a The Firm workflow or business policy | platform/extension |
| product-specific provider behavior | platform/extension, unless a generic provider seam is missing |
| a settings screen addition for a Firm feature | contributor or extension mechanism |

## Rule for Core Changes

Every core-package change should fit one of these categories:

1. **Bug fix**
2. **Reusable seam**
3. **Approved maintenance required to keep upstream-derived code healthy**

If a core change does not fit one of those categories, it probably belongs outside the kernel.

## Preferred Extensibility Mechanisms

When The Firm needs new behavior, prefer these mechanisms over product-specific branching in core code:

- hooks
- lifecycle events
- registries
- contributors
- adapters
- middleware/interceptors
- provider strategies
- composition over inheritance

## Practical Examples

### Settings expansion

If The Firm wants extra `/settings` sections, prefer a settings contributor or registration mechanism instead of hardcoding Firm panels into the base settings flow.

### Provider bugs

If a provider bug can only be fixed in shared request or response handling, patch the kernel. If the same area is likely to need future product-specific behavior, add a small provider hook or adapter seam while making the fix.

### Workflow integrations

If The Firm wants issue or PR tracking features, keep that logic outside the kernel unless the kernel first needs a generic hook or registry to support it.

## Anti-Goals

The Firm should avoid:

- turning the kernel into a large plugin framework with unnecessary complexity
- hardcoding Firm-only workflow logic into shared packages
- broad identity churn without architectural value
- repeated one-off patches in the same core area when a reusable seam is the better answer

## Documentation Rule

When The Firm intentionally diverges in architecture or extension strategy:

- update this document if the rule changes
- add or update an ADR in `docs/adr/`
- keep `AGENTS.md` aligned so future AI sessions follow the same doctrine

## Review Checklist

Before landing a structural change, ask:

- Does this preserve pi's lightweight philosophy?
- Is this change generic enough for the kernel?
- Could this be implemented through an existing extension point?
- If not, should a new small seam be added instead of a Firm-specific patch?
- Is the architectural intent documented?
