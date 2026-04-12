# The Firm — Agent Rules

This repository is `digi4care/the-firm`.

The Firm is an independent product fork built on pi's philosophy. Work in this repository as **The Firm**, not as upstream pi-mono.

## Core Identity

- Repository: `digi4care/the-firm`
- Main package: `@digi4care/the-firm`
- Production binary: `firm`
- Development binary: `firm-dev`
- Config directory: `.the-firm/`
- Conversation language: Dutch
- Code and documentation language: English

## Product Philosophy

- Preserve pi's lightweight, opinionated, low-ceremony design.
- Treat The Firm as its own product, not as a temporary rebrand of upstream pi.
- Prefer extension points, hooks, registries, contributors, and adapters over Firm-specific changes in generic core packages.
- Change core packages only when fixing a real bug or introducing a reusable extensibility seam.
- Keep Firm-specific workflows, policies, and integrations outside the kernel whenever practical.
- Keep divergence from upstream intentional, minimal, and documented.

## Decision Ladder for Agents

When implementing a change, prefer this order:

1. Configure existing behavior.
2. Use an existing extension point.
3. Add a small generic hook, registry, lifecycle, or contributor point.
4. Patch core behavior directly only when necessary now, and document why.

If direct core patching seems required, first ask whether the change should become a reusable seam instead.

For deeper guidance, read:

- `docs/architecture/core-vs-extension.md`
- `docs/adr/0001-small-kernel-extensible-platform.md`

## Branch Model

```text
original -> development -> production
```

## Versioning and Releases

- The Firm uses its own semantic version line. Do not treat upstream pi versions as The Firm release versions.
- The first intentional The Firm release version should be `0.0.1`.
- Versions describe The Firm product releases, not upstream lineage.
- Record the upstream base commit or tag when establishing or syncing a meaningful upstream baseline.
- Cut release versions from `production` only.
- Do not bump versions unless the user explicitly asks for a release or versioning change.
- Before `1.0.0`, treat version changes conservatively: patch for fixes, minor for non-breaking capabilities, and major only for explicit breaking-release decisions.

For rationale, read `docs/adr/0002-versioning-strategy.md`.

### Branch rules

- `original` is the upstream mirror branch. Do not do product work there.
- `development` is the daily work branch.
- `production` is the stable release branch.
- Start implementation work from `development` unless the user explicitly asks otherwise.

## Beads Workflow

Use **Beads (`bd`)** for all serious work tracking.

### Core commands

```bash
bd prime
bd ready
bd show <id> --long
bd update <id> --claim
bd update <id> --notes "..."
bd close <id>
bd dolt push
```

### Rules

- Use `bd` for tracked work instead of ad-hoc markdown task lists.
- Read the issue before changing code.
- Leave resumable notes when stopping mid-stream.
- In this repo, Beads is intentionally configured in local-only mode. `.beads/` is not repo-tracked.
- Do not treat a missing Dolt remote as an error condition unless the user explicitly changes the setup.
- Use `bd dolt push` only if the user later configures a Beads remote for this repository.

## Git Workflow

- Work on `development`.
- Keep commits focused and atomic.
- Use explicit staging only.
- Never use `git add .` or `git add -A`.
- Review `git status` before every commit.
- Do not use destructive commands like `git reset --hard`, `git checkout .`, or `git clean -fd`.

## Code Quality

- No `any` unless truly necessary.
- Check real package types before guessing external APIs.
- Do not remove intentional functionality without asking.
- Keep changes minimal and targeted.
- Treat upstream code carefully; do not cause broad churn without approval.
- Prefer small local duplication over premature abstraction.
- Extract shared abstractions only after a repeated pattern becomes clear, stable, and meaningfully named.
- Avoid generic module names like `utils`, `helpers`, `misc`, `common`, `manager`, and `processor` unless the scope is tightly local and the intent remains obvious.
- Respect package and import boundaries. Do not make kernel, platform, extension, and product layers depend on each other arbitrarily.
- Treat SOLID as a heuristic, not as a mandate for extra interfaces, factories, or layers.
- New hooks, registries, adapters, contributors, and lifecycle seams require explicit justification: what concrete problem exists now, why simpler code is insufficient, and what reuse or boundary value the seam provides.

For deeper guidance, read:

- `docs/architecture/code-quality.md`
- `docs/adr/0003-code-quality-doctrine.md`

## Commands

Install dependencies:

```bash
npm install
```

Run The Firm from source:

```bash
npm run firm-dev -- --help
```

Build all packages:

```bash
npm run build
```

Run code checks:

```bash
npm run check
```

Run markdown lint for active project docs:

```bash
npm run lint:md
```

Review external npm dependency updates with npm-check-updates:

```bash
npm run deps:check
```

Apply external npm dependency updates with npm-check-updates:

```bash
npm run deps:update:interactive
npm run deps:update
```

Internal workspace package versions are managed separately from external dependency updates. Do not use npm-check-updates to rewrite the monorepo's own lockstep version line.

## GitHub and PRs

When reading GitHub issues:

```bash
gh issue view <number> --json title,body,comments,labels,state
```

When posting issue or PR comments:

- write the comment to a temp file first
- use `gh issue comment --body-file` or `gh pr comment --body-file`
- preview the exact comment text before posting
- keep comments concise and technical

## Tool Usage Rules

- Never use `sed` or `cat` to read files when the read tool is available.
- Read every file fully before editing it.
- Prefer precise edits over broad rewrites unless a full rewrite is clearly cleaner.

## Archived Upstream Docs

Archived upstream root docs live in:

```text
docs/archive/upstream-pi-mono/
```

Those files are reference material only. The active project rules are in the root `README.md` and `AGENTS.md`.
