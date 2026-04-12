# Upstream Watch Workflow

This document explains how The Firm monitors relevant upstream pi work and selectively adopts it.

## Goal

The Firm is an independent product, but it still benefits from relevant upstream fixes, features, and architecture work.

The goal is **not** to mirror upstream blindly. The goal is to monitor upstream intentionally and adopt only what fits The Firm.

## Sources to Watch

Typical upstream sources:

- upstream issues in `badlogic/pi-mono`
- upstream pull requests in `badlogic/pi-mono`
- direct upstream commits that matter to The Firm

## Triage Flow

When you find upstream work that may matter:

1. read the upstream issue or PR fully
2. decide whether it is relevant to The Firm
3. if relevant, create or update a local Beads item
4. decide one of:
   - adopt
   - adapt
   - reject
   - track for later
5. record the decision in `docs/upstream/ADOPTION-LOG.md` when the item is important enough to revisit or explain later

## Useful Commands

Read an upstream issue:

```bash
gh issue view <number> --repo badlogic/pi-mono --json title,body,comments,labels,state
```

Read an upstream PR:

```bash
gh pr view <number> --repo badlogic/pi-mono --json title,body,commits,files,comments,labels,state
```

## Adoption Guidance

### Adopt

Use when upstream change fits The Firm as-is.

### Adapt

Use when upstream change is useful, but needs The Firm-specific adjustments.

### Reject

Use when upstream change conflicts with The Firm's product direction, architecture, or workflow.

### Track

Use when upstream work is relevant but not yet ready to adopt.

## Logging Rule

Use `docs/upstream/ADOPTION-LOG.md` for significant upstream decisions.

Good candidates:

- adopted bug fixes
- adapted provider changes
- consciously rejected upstream behavior
- tracked upstream work that is likely to matter later

Do not use the log as a complete mirror of upstream activity.

## Baseline Rule

When The Firm intentionally changes its upstream baseline, update:

- `docs/upstream/BASELINE.md`
- and, if needed, `docs/upstream/ADOPTION-LOG.md`

## Relationship to Versions

- The Firm versions itself independently.
- Upstream baseline and adoption history are tracked separately.
- Do not infer upstream equivalence from The Firm package versions alone.
