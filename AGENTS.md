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

## ⚠️ Workflow

**Read and follow [`docs/WORKFLOW.md`](docs/WORKFLOW.md) before making any changes.**

## Test-Driven Development (TDD)

- **Write the test first.** Every code change must be preceded by a failing test that describes the expected behavior.
- **Red → Green → Refactor.** Watch the test fail, make it pass, then clean up.
- **No production code without tests.** If you can't test it, you don't understand it well enough yet.
- **Run tests before commit.** `npm test` must pass before any code is committed.

It covers: decision ladder, branches & worktrees, versioning, Beads issue tracking, start-of-work procedure, traceability, git rules, code quality, commands, GitHub, and tool usage.

That file is mandatory. This file is identity only.

## Archived Upstream Docs

```text
docs/archive/upstream-pi-mono/
```

Reference material only. Active rules: `README.md`, `AGENTS.md`, `docs/WORKFLOW.md`.
