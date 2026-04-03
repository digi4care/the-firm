# Contributing to The Firm

Thank you for your interest in contributing to The Firm. This document outlines the process and conventions we follow.

## How to Contribute

1. **Fork the repository** on GitHub
2. **Create a feature branch** from `main` with a descriptive name
3. **Make your changes** following our code style guidelines
4. **Run linting** to ensure code quality (`bun run lint`)
5. **Commit** using conventional commit format
6. **Push** your branch to your fork
7. **Open a Pull Request** against the main repository

## Development Setup

```bash
# Install dependencies
bun install

# Available scripts
bun run lint          # Check code and markdown
bun run lint:fix      # Auto-fix linting issues
bun run format        # Format code with Biome
bun run format:check  # Check formatting without changes
```

## Code Style

- **Indentation**: Tabs (configured in `biome.json`)
- **Linting**: Biome for code, markdownlint-cli2 for markdown
- **Formatting**: Run `bun run format` before committing

Always ensure `bun run lint` passes before submitting a PR.

## Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) style:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `chore:` — Maintenance, dependencies, tooling
- `refactor:` — Code restructuring without behavior change
- `test:` — Adding or updating tests
- `style:` — Formatting changes only

Examples:
```
feat: add issue template validation
fix: correct bead reference parsing
docs: update AGENTS.md terminology
```

## Branch Naming

Use descriptive, lowercase names with hyphens:

- `feature/issue-tracker-integration`
- `fix/validation-bug`
- `docs/contributing-guide`
- `chore/update-dependencies`

## Pull Request Process

1. **Describe your changes** clearly in the PR description
2. **Reference related issues** using GitHub keywords (`Fixes #123`, `Closes #456`)
3. **Ensure all checks pass** — `bun run lint` must succeed
4. **Keep PRs focused** — one logical change per PR
5. **Respond to review feedback** promptly and professionally

## Important Files

- **`AGENTS.md`** — Project rules and conventions for AI agents
- **`design/the-firm/`** — Design documentation and architecture decisions
- **`design/REFERENCES.md`** — Reference materials and resources

Review these before making significant changes.

## Versioning

Regular commits do not bump the version. Version bumps happen when a coherent set of changes is ready to be marked as a release.

```bash
bun run version:patch  # Bug fixes, small changes
bun run version:minor  # New features, backwards-compatible
bun run version:major  # Breaking changes
```

The version-bump script updates `package.json`, adds a `CHANGELOG.md` entry, commits, and creates a git tag (e.g. `v0.2.0`).

Fill in the changelog entry before running the script, or edit it after.

## Communication

- **Language**: Dutch or English — both are welcome
- **Ask questions**: When requirements are unclear, ask rather than assume
- **Be explicit**: Prefer clarity over brevity in discussions

## Questions?

Open an issue on GitHub if something is unclear.

---

This project follows the [MIT License](LICENSE).
