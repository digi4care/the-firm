# Releasing The Firm

This document describes the intended release workflow for The Firm.

## Release Branch Rule

Release work belongs on `production`.

The normal flow is:

1. complete work on `development`
2. verify and merge or fast-forward into `production`
3. run the release workflow from `production`

## Preconditions

Before releasing:

- working tree must be clean
- `production` must contain the intended release state
- package versions must already represent the intended The Firm version line
- `npm run check` should pass
- relevant package changelogs should have accurate `## [Unreleased]` entries

## Release Script

The repository provides:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

These commands call `scripts/release.mjs` and perform the release from `production` only.

## What the Release Script Does

1. verifies current branch is `production`
2. verifies the working tree is clean
3. bumps the workspace version line
4. syncs inter-package versions
5. rewrites package changelogs from `## [Unreleased]` to the released version heading
6. creates a release commit and `v<version>` tag
7. publishes the workspace to npm
8. recreates fresh `## [Unreleased]` sections in package changelogs
9. creates a follow-up changelog-cycle commit
10. pushes `production` and the tag to `origin`

## Staging Policy

The release script stages explicit files only.

It does **not** rely on `git add .` or `git add -A`.

## Dry Run Guidance

For publication confidence before a real release, run:

```bash
npm run publish:dry
```

This checks the publish payload without publishing packages.

## Notes

- The Firm version line is independent from upstream pi version numbers.
- Upstream provenance is tracked separately in `docs/upstream/BASELINE.md` and `docs/upstream/ADOPTION-LOG.md`.
- Use release notes and changelogs to describe user-facing The Firm changes, not upstream baseline information.
