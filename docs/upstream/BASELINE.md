# Upstream Baseline

This document records the upstream pi baseline that The Firm currently relates to.

The Firm does **not** use upstream version numbers as its own release versions. Instead, it tracks upstream lineage separately so future work can compare fixes, evaluate incoming upstream changes, and reason about divergence intentionally.

## Current Baseline

- Upstream repository: `badlogic/pi-mono`
- Upstream branch reference: `main`
- Current recorded upstream base commit: `c779c14e91bc2ea65143e59b0dc1baf3646ba8c9`
- Upstream baseline is tracked by repository, branch reference, and commit hash.
- Daily integration branch: `development`

## How to Update This File

Update this file when The Firm intentionally re-baselines against upstream or adopts a meaningful upstream sync point.

Record at least:

- upstream repo
- upstream branch or tag
- upstream commit hash
- date of the baseline change
- short note explaining the context

## Notes

- This file tracks **where The Firm came from**, not what version The Firm itself is.
- The Firm release version line is tracked separately in package manifests and release notes.
- Relevant upstream fixes that are adopted later should be recorded in `docs/upstream/ADOPTION-LOG.md`.
