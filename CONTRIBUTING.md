# Contributing to The Firm

Thanks for wanting to contribute! This guide exists to save both of us time.

## The One Rule

**You must understand your code.** If you can't explain what your changes do and how they interact with the rest of the system, your PR will be closed.

Using AI to write code is fine. You can gain understanding by interrogating an agent with access to the codebase until you grasp all edge cases and effects of your changes. What's not fine is submitting agent-generated slop without that understanding.

If you use an agent, run it from the repository root so it picks up `AGENTS.md` automatically. Your agent must follow the rules and guidelines in that file.

## Workflow

Use GitHub Issues as the shared team tracker.

Use Beads (`bd`) locally for execution tracking, resumable notes, and AI session continuity.

### Standard Flow

1. Open or pick a GitHub Issue describing the change.
2. Create or claim a related Beads task locally.
3. Start from `development`.
4. Create a focused branch from `development`.
5. Implement and verify the change.
6. Open a PR to `development`.
7. Reference the GitHub Issue, the Beads task ID, and the verification performed.

### Rules

- Never work directly on `development`.
- `production` is the release target.
- `main` is not part of the active workflow and should not be used.
- Never reintroduce the removed `original` branch.
- Every completed change goes through a PR to `development`.
- Close the local Beads task only after the PR is merged or the work is explicitly stopped.

## Before Submitting a PR

```bash
npm run check  # must pass with no errors
./test.sh      # must pass
```

Do not edit `CHANGELOG.md`. Changelog entries are added by maintainers.

If you're adding a new provider to `packages/ai`, see `AGENTS.md` for required tests.

## Philosophy

The Firm's core is minimal. If your feature doesn't belong in the core, it should be an extension. PRs that bloat the core will likely be rejected.

## Questions?

Open a GitHub Issue or ask a maintainer before starting broad or structural work.
