# The Firm Modifications

This document tracks all modifications made to the pi-mono fork for The Firm.

## Fork Info

- **Upstream:** `badlogic/pi-mono`
- **Fork:** `digi4care/the-firm`
- **Forked at:** `3b7448d15` (pi-mono v0.66.1)
- **Date:** 2026-04-10

## Identity Rename (commit `af5bc1061`)

### `packages/coding-agent/package.json`
- `name`: `@mariozechner/pi-coding-agent` → `@digi4care/the-firm`
- `version`: reset to `0.1.0`
- `description`: updated to "The Firm — governance-first coding agent (fork of pi-mono)"
- `piConfig.name`: `"pi"` → `"the-firm"`
- `piConfig.configDir`: `".pi"` → `".the-firm"`
- `bin`: added `"the-firm"` and `"firm"` entries (was `"pi"`)
- `author`: `Mario Zechner` → `digi4care`
- `repository.url`: updated to `digi4care/the-firm`

### `packages/coding-agent/src/config.ts`
- `process.title`: `"pi"` → `"the-firm"`
- `DEFAULT_SHARE_VIEWER_URL`: updated domain

### `packages/coding-agent/src/core/extensions/loader.ts`
- Project-local extension dir: hardcoded `.pi/extensions` → uses `CONFIG_DIR_NAME` (`.the-firm/extensions`)

### `packages/coding-agent/src/modes/interactive/components/config-selector.ts`
- Scope label: `~/.pi/agent/` → uses `CONFIG_DIR_NAME`

## Upstream Sync

To sync with upstream:
```bash
cd /home/digi4care/projects/the-firm
git fetch upstream
git merge upstream/main
# Resolve conflicts, rebuild, test
```

Upstream remote is push-protected (`git remote set-url --push upstream DISABLE`).
