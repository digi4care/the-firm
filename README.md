# The Firm

The Firm is a lightweight custom fork of pi.

This repository is the active source of truth for `digi4care/the-firm`.

## Identity

- npm package: `@digi4care/the-firm`
- production binary: `firm`
- development binary: `firm-dev`
- config directory: `.the-firm/`
- repository: `digi4care/the-firm`

## What The Firm Is

The Firm is an independent product fork built on pi's philosophy.

It stays intentionally close to upstream `pi-mono` when that preserves simplicity and maintainability, but it may diverge where The Firm needs its own product behavior, workflows, fixes, and extension mechanisms.

## Architecture Philosophy

The Firm aims for a **small kernel, extensible platform** model:

- preserve pi's lightweight, opinionated, low-ceremony core
- prefer extensions, hooks, registries, contributors, and adapters over Firm-specific core customization
- change core packages only for real bug fixes or reusable extensibility seams
- keep Firm-specific workflow logic and integrations outside the kernel whenever practical
- document intentional architectural divergence

See:

- `docs/architecture/core-vs-extension.md`
- `docs/adr/0001-small-kernel-extensible-platform.md`

## Branch Model

```text
original -> development -> production
```

- `original`: upstream mirror branch
- `development`: daily work branch
- `production`: stable release branch

Do day-to-day work on `development`.

## Versioning Strategy

The Firm uses its own semantic version line.

- the first intentional The Firm release should be `0.0.1`
- releases are cut from `production` only
- upstream provenance should still be recorded by commit or tag
- version bumps are deliberate release actions, not routine implementation side effects

See `docs/adr/0002-versioning-strategy.md`.

## Upstream Lineage

The Firm versions itself independently, but it still tracks its upstream pi baseline and relevant adopted upstream fixes separately.

See:

- `docs/upstream/BASELINE.md`
- `docs/upstream/ADOPTION-LOG.md`
- `docs/upstream/WATCH-WORKFLOW.md`
- `docs/adr/0004-upstream-lineage-and-adoption.md`

## Code Quality Doctrine

The Firm enforces code quality through simplicity, boundaries, and deliberate abstraction rather than pattern cargo-culting.

- small local duplication is acceptable until a real shared pattern emerges
- generic buckets like `utils` or `helpers` should be avoided in favor of responsibility-driven names
- package and import boundaries should protect the small-kernel architecture
- SOLID is treated as a heuristic, not a reason to add ceremony
- new hooks, registries, adapters, or lifecycle seams should be justified explicitly

See:

- `docs/architecture/code-quality.md`
- `docs/adr/0003-code-quality-doctrine.md`

## Working in This Repo

Install dependencies:

```bash
npm install
```

Run The Firm from source:

```bash
npm run firm-dev -- --help
```

Build the workspace:

```bash
npm run build
```

Run checks:

```bash
npm run check
npm run lint:md
```

## Release Workflow

The Firm releases from `production`, not from `development`.

See:

- `docs/releasing.md`

## Dependency Updates

This repository uses `npm-check-updates` (`ncu`) for external npm dependency review and updates.

Review available updates across the root project and all workspaces:

```bash
npm run deps:check
```

Apply updates interactively:

```bash
npm run deps:update:interactive
```

Apply all allowed updates and regenerate the lockfile:

```bash
npm run deps:update
```

The repo-level `.ncurc.json` excludes internal workspace packages from this workflow. Use the versioning workflow separately for the monorepo's own lockstep package version line.

## Issue Tracking

This repository uses Beads (`bd`) for persistent issue tracking.

Beads is currently configured in local-only mode for this repository, so a missing Dolt remote is expected unless that setup is changed later.

Common commands:

```bash
bd ready
bd show <id> --long
bd update <id> --claim
bd close <id>
```

Run `bd prime` for the current workflow guide.
Use `bd dolt push` only if a Beads remote is configured later.

## Archived Upstream Docs

Upstream root docs were preserved for reference in:

```text
docs/archive/upstream-pi-mono/
```

The active project identity lives in the root `README.md` and `AGENTS.md`.
