# ADR-0004: Track Upstream Baseline and Adopted Upstream Changes Separately from The Firm Versions

**Status**: Accepted  
**Date**: 2026-04-12

## Context

The Firm is an independent forked product, but it still wants to benefit from relevant upstream pi work.

That creates two distinct tracking needs:

1. The Firm needs its **own version line** for its own releases.
2. The Firm still needs to know which upstream baseline it started from and which upstream issues, pull requests, or commits were adopted later.

If those concerns are mixed together, version numbers become misleading. If they are not tracked at all, the project loses provenance and makes upstream comparison harder.

## Decision

The Firm will track upstream lineage separately from The Firm release versions.

### Rules

- The Firm version numbers describe The Firm releases, not upstream pi releases.
- The current upstream base commit or tag must be recorded in `docs/upstream/BASELINE.md`.
- Relevant upstream issues, PRs, and commits that The Firm reviews should be tracked in `docs/upstream/ADOPTION-LOG.md` when they are adopted, adapted, rejected, or intentionally monitored.
- Upstream adoption records should link, when possible, to the corresponding The Firm commit and first The Firm release that includes the change.

## Consequences

### Positive

- Keeps The Firm's own version line honest and independent
- Preserves upstream traceability for debugging and maintenance
- Makes it easier to compare The Firm behavior with upstream behavior
- Supports selective adoption of upstream fixes without losing provenance

### Negative

- Requires lightweight maintenance of two provenance documents
- Adds a small amount of release and integration bookkeeping

### Mitigation

- Keep the baseline file short and factual
- Log only relevant upstream items in the adoption log
- Update the log as part of meaningful upstream adoption work, not as separate bureaucracy

## Alternatives Considered

### 1. Reuse upstream version numbers directly

Rejected because The Firm wants its own release identity.

### 2. Ignore upstream lineage after forking

Rejected because The Firm still expects to monitor upstream issues, PRs, and fixes and selectively adopt them.

### 3. Record provenance only in commit messages

Rejected because commit history alone does not provide a durable, queryable overview for future human or AI sessions.

## Follow-Up

- Keep `docs/upstream/BASELINE.md` current when the upstream baseline changes
- Update `docs/upstream/ADOPTION-LOG.md` when The Firm adopts, adapts, tracks, or rejects relevant upstream work
- Keep `AGENTS.md` aligned so future AI sessions understand the split between The Firm versions and upstream lineage
