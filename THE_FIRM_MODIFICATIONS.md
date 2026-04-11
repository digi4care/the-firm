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

## Provider Hardening (commit TBD)

### `packages/ai/src/providers/transform-messages.ts`
- **Bug fix:** Errored/aborted assistant turns now track their tool calls before being skipped
- Previously, skipping errored turns silently dropped tool call IDs, leaving orphaned toolResult messages
- Now extracts tool calls from errored turns into `pendingToolCalls` so synthetic results are injected for any that lack real results
- Inspired by can1357/oh-my-pi's approach but implemented minimally

### `packages/ai/src/providers/openai-responses-shared.ts`
- **Bug fix:** Added strict responses pairing — orphaned `function_call_output` items are filtered
- Collects all known `call_id`s from `function_call` items, then removes any `function_call_output` whose `call_id` has no match
- Prevents OpenAI Responses API error: "No tool call found for function call output with call_id X"

### New tests
- `packages/ai/test/transform-messages-errored-turn.test.ts` — 7 unit tests covering errored/aborted turn handling
- `packages/ai/test/openai-responses-orphan-filtering.test.ts` — 3 unit tests covering orphaned function_call_output filtering

### Resolves
- Upstream issue: https://github.com/badlogic/pi-mono/issues/3017
- Beads issue: `the-firm-v2-g1b` (PHASE 5: Harden provider/model layer)
- Supersedes local `node_modules` hotfixes documented in `HOTFIX-OPENAI.md`

## Upstream Sync

To sync with upstream:
```bash
cd /home/digi4care/projects/the-firm
git fetch upstream
git merge upstream/main
# Resolve conflicts, rebuild, test
```

Upstream remote is push-protected (`git remote set-url --push upstream DISABLE`).
