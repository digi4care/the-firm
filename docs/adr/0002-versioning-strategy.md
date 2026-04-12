# ADR-0002: Use a The Firm Version Line and Track Upstream Provenance Separately

**Status**: Accepted  
**Date**: 2026-04-12

## Context

The Firm is an independent product fork built on pi's philosophy.

The project wants its own product identity, release rhythm, and roadmap. At the same time, the repository still benefits from being able to trace which upstream pi baseline a given state came from.

Without an explicit versioning rule, future work could drift into mixed signals:

- using upstream versions as if they were The Firm releases
- bumping versions during normal implementation work
- losing track of which upstream commit or tag a release is based on
- creating releases from the wrong branch

The project therefore needs a clear versioning policy that both humans and AI agents can follow without re-explaining it in every session.

## Decision

The Firm will use its own semantic version line.

### Core rules

- The Firm version numbers represent The Firm product releases, not upstream pi release numbers.
- The first intentional The Firm release version should be `0.0.1`.
- Release versions are cut from `production` only.
- The upstream base commit or tag must be recorded whenever establishing or syncing a meaningful upstream baseline.
- AI agents must not bump versions unless the user explicitly asks for a release or versioning change.

### Pre-1.0 guidance

Before `1.0.0`, use version bumps conservatively:

- **patch**: bug fixes and small corrective changes
- **minor**: new non-breaking capabilities, extension seams, or product features
- **major**: explicit breaking-release decision

This guidance exists to keep versioning intentional while The Firm is still forming its first stable product line.

## Consequences

### Positive

- Reinforces The Firm as its own product
- Keeps release signaling separate from upstream lineage
- Preserves traceability back to upstream baselines
- Prevents accidental version churn by AI agents during routine work
- Aligns release discipline with the `production` branch model

### Negative

- Contributors must maintain both The Firm version identity and upstream provenance notes
- Some work may require an extra documentation step when upstream baselines are refreshed
- Version changes become a deliberate act rather than a convenience side effect

### Mitigation

- Keep provenance notes lightweight and factual
- Record upstream baselines in release notes, ADRs, or dedicated tracking docs when relevant
- Treat version bumps as explicit release work, not incidental code cleanup

## Alternatives Considered

### 1. Continue using upstream version numbers as The Firm versions

Rejected because it blurs product identity and makes it harder to tell whether a version number reflects The Firm work or upstream history.

### 2. Let AI agents infer version bumps from implementation scope

Rejected because version numbers are release signals and should not change implicitly.

### 3. Ignore upstream provenance once the fork exists

Rejected because traceability remains useful for maintenance, bug comparison, and future upstream sync decisions.

## Follow-Up

- Keep `AGENTS.md` aligned with this ADR
- Keep `README.md` aligned with the public-facing versioning explanation
- When the version reset is executed in package files, make it a deliberate commit tied to this policy
