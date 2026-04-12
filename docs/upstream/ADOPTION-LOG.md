# Upstream Adoption Log

This document records relevant upstream pi issues, pull requests, and commits that The Firm has reviewed, adopted, adapted, or intentionally skipped.

Use it to answer questions such as:

- Has this upstream bug fix already been considered in The Firm?
- Was an upstream change taken as-is, adapted, or rejected?
- In which The Firm commit or release did an upstream fix land?

## Status Values

- `adopted` — upstream change was taken essentially as-is
- `adapted` — upstream change was brought in with The Firm-specific adjustments
- `rejected` — upstream change was reviewed and intentionally not adopted
- `tracked` — relevant upstream work is being watched but not yet applied

## Log Format

| Date | Upstream Ref | Type | Status | The Firm Commit | First Firm Version | Notes |
|---|---|---|---|---|---|---|
| YYYY-MM-DD | `#123` / `owner/repo#123` / `commit-hash` | issue / pr / commit | tracked | - | - | Short reason |

## Guidance

Only record upstream items that matter to The Firm's product, architecture, stability, or maintenance.

Do not try to mirror every upstream issue. Focus on items that are:

- adopted or adapted into The Firm
- consciously rejected after review
- likely to be revisited later
- important for debugging or provenance

## Current Entries

| Date | Upstream Ref | Type | Status | The Firm Commit | First Firm Version | Notes |
|---|---|---|---|---|---|---|
| 2026-04-12 | `badlogic/pi-mono@c779c14e` | commit | adopted | `c779c14e` base state | pre-`0.0.1` | Current upstream baseline used for the clean The Firm reset |
