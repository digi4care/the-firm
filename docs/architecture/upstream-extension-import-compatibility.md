# Upstream Extension Import Compatibility

## Status

Accepted as a narrow compatibility shim for shared `.pi` extensions.

## Summary

The Firm uses the standard `.pi` directory layout for settings, sessions, skills, prompts, themes, and extensions.

To reduce friction for users who already have upstream Pi extensions in shared `.pi` locations such as `~/.pi/agent/extensions/`, The Firm supports a small runtime import-compatibility layer in the extension loader.

This compatibility layer remaps upstream Pi package imports used by extensions to The Firm runtime packages.

## Supported Legacy Imports

The extension loader currently supports these upstream import aliases:

- `@mariozechner/pi-coding-agent` -> `@digi4care/the-firm`
- `@mariozechner/pi-ai` -> `@digi4care/the-firm-ai`
- `@mariozechner/pi-ai/oauth` -> `@digi4care/the-firm-ai/oauth`
- `@mariozechner/pi-tui` -> `@digi4care/the-firm-tui`
- `@mariozechner/pi-agent-core` -> `@digi4care/the-firm-agent-core`

## Why This Exists

Without this shim, shared upstream Pi extensions stored under `.pi` fail to load under The Firm with module-resolution errors, even when the extension logic itself would otherwise still work.

This creates unnecessary friction for users who:

- share one global `.pi` directory across tools
- switch between upstream Pi and The Firm
- want The Firm to honor the standard `.pi` extension locations without forcing immediate extension rewrites

## Scope

This compatibility layer is intentionally narrow.

It applies to:

- extension loading
- extension-local helper modules loaded through the extension loader
- runtime import resolution for known upstream Pi package names

It does **not** imply:

- full upstream Pi product compatibility
- stable compatibility with every upstream extension forever
- source-level or editor-level TypeScript compatibility outside The Firm runtime
- parity for all upstream commands, events, APIs, or behaviors

## Architectural Rationale

This choice fits The Firm's small-kernel, extensible-platform direction because it:

- solves a concrete user problem in a shared kernel concern: extension loading
- stays localized to the extension loader seam
- avoids introducing Firm-specific behavior into unrelated runtime areas
- improves interoperability without changing The Firm's product identity

This is a kernel-level compatibility fix, not a claim that The Firm is upstream Pi.

## Benefits

### Reduced user friction

Users can keep using shared `.pi` extension directories without immediate breakage caused only by package-name divergence.

### Small implementation surface

The compatibility is contained in the extension loader rather than spread across the codebase.

### Better migration path

Existing upstream Pi extensions can continue to load while being gradually migrated to native The Firm imports if desired.

## Risks

### False expectation of full compatibility

Users may assume that if imports resolve, the extension is fully compatible. That assumption is too strong.

### Hidden API drift

An extension may load successfully but still fail later if it depends on behavior that diverged from upstream Pi.

### Ongoing maintenance cost

If The Firm changes exports used by extensions, maintainers must consider both native and legacy import paths.

## Guardrails

To keep this compatibility healthy, follow these rules:

1. Keep the shim loader-local.
2. Do not treat it as a blanket promise of upstream compatibility.
3. Prefer native The Firm imports in first-party examples and documentation.
4. Add targeted regression tests for legacy import resolution.
5. Expand the shim only for real shared `.pi` interoperability needs.
6. Do not generalize this into broad cross-product compatibility without explicit decision-making.

## Recommended Messaging

When describing this feature, prefer wording like:

- "The Firm supports legacy upstream Pi import names for shared `.pi` extensions."
- "This is best-effort extension import compatibility, not full upstream product compatibility."

Avoid wording like:

- "The Firm is upstream Pi compatible."
- "All Pi extensions work unchanged in The Firm."

## Consequences for the Project

### Positive

- Shared `.pi` usage becomes more practical.
- Existing user extensions are less fragile.
- The Firm remains aligned with standard `.pi` paths.

### Negative

- Maintainers must preserve a small compatibility contract in extension loading.
- Debugging legacy extensions may require distinguishing import-compatibility issues from behavioral divergence.

## Future Review Triggers

Revisit this decision if:

- multiple upstream compatibility shims are added outside extension loading
- users start expecting full upstream package compatibility
- the shim grows beyond import aliasing into broad behavior emulation
- a dedicated extension compatibility policy or ADR becomes necessary
