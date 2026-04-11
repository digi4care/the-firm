# The Firm — Development Rules

> **Fork van:** [badlogic/pi-mono](https://github.com/badlogic/pi-mono)
> **Fork:** [digi4care/the-firm](https://github.com/digi4care/the-firm)
> **Owner:** Chris Engelhard (chris@chrisengelhard.nl)

---

## Branch Model (LEES DIT EERST)

```
original ─────► development ─────► production
(upstream)       (dagelijks)        (stable)
```

| Branch | Doel | Edits? | Binary |
|--------|------|--------|--------|
| `original` | Upstream pi-mono mirror. Track Mario's changes. | **NOOIT** | `pi` |
| `development` | Alle The Firm ontwikkeling. Nieuwe features, fixes, upstream merges. | **JA** | `firm-dev` |
| `production` | Stabiele releases. Alleen merges vanuit development + hotfixes. | **Alleen hotfixes** | `the-firm` |

### Branch Regels

1. **`original`** — NOOIT editen. Alleen `git fetch upstream && git merge upstream/main`.
2. **`development`** — Werkpaar. Commits, features, experiments, upstream merges.
3. **`production`** — Heilig. Alleen bereikt via merge vanuit `development`. Getagged.

### Upstream Sync Workflow

```bash
# 1. Sync original met upstream
git checkout original
git fetch upstream
git log HEAD..upstream/main --oneline          # wat is nieuw?
git merge upstream/main

# 2. Analyseer: zijn de changes relevant voor The Firm?
git diff development..original --stat          # welke bestanden veranderd?
git diff development..original -- packages/ai/  # provider changes?

# 3. Als relevant: merge naar development
git checkout development
git merge original
# Resolve conflicts, npm run check, npm run test

# 4. Als NIET relevant: noteer in CHANGELOG, skip
```

### Release Workflow

```bash
# Vanaf development → production
git checkout development
npm run check && npm run test                  # quality gates

git checkout production
git merge development
git tag the-firm-v0.x.0
git push origin production --tags
npm install -g .                                # installeer the-firm binary
```

---

## Werken met The Firm

### Development starten

```bash
git checkout development
cd ~/projects/the-firm

# Start vanuit TypeScript source (geen build nodig)
firm-dev                                       # via npx tsx
# of handmatig:
npx tsx packages/coding-agent/src/cli.ts       # direct vanuit source
```

### Binary namen

| Binary | Branch | Hoe gestart | Build nodig? |
|--------|--------|-------------|-------------|
| `the-firm` | `production` | `npm install -g .` → `the-firm` | Ja |
| `firm` | `production` | Alias voor `the-firm` | Ja |
| `firm-dev` | `development` | `npx tsx src/cli.ts` | Nee (jiti/tsx) |

### Config directory

The Firm gebruikt `.the-firm/` (niet `.pi/`).

```
my-project/
├── .the-firm/                  # The Firm config & data
│   ├── extensions/             # project-local extensions
│   ├── settings.json           # project settings
│   └── agent/                  # skills, prompts, rules
├── .firm/                      # KB knowledge base
│   ├── config.json
│   ├── concepts/
│   ├── decisions/
│   └── ...
└── ...
```

---

## The Firm Modifications

The Firm voegt toe aan Pi upstream:

### 1. Provider Hardening (`packages/ai/`)

**Probleem:** Pi's `transform-messages.ts` skipt errored turns met tool calls, wat orphaned `function_call_output` errors geeft bij OpenAI Responses API.

**Fix (2 lagen):**
- `src/providers/transform-messages.ts` — extraheert tool calls uit errored turns vóór skip, injecteert synthetic results
- `src/providers/openai-responses-shared.ts` — strictResponsesPairing filter

**Tests:** 10 regressietests in `packages/ai/test/`
**Upstream issue:** https://github.com/badlogic/pi-mono/issues/3017

### 2. KB Tools (`packages/coding-agent/the-firm-ext/`)

De Firm extension registreert 9 tools en 6 commands via Pi's ExtensionAPI.

| Tool | Pi naam | Doel |
|------|---------|------|
| `kb-init` | `firm_init` | Initialiseer `.firm/` structuur |
| `kb-setup` | `firm_setup` | Configureer KB settings |
| `kb-harvest` | `firm_harvest` | Analyseer broncode → patronen |
| `kb-capture` | `firm_capture` | Capture knowledge item |
| `kb-extract` | `firm_extract` | Externe docs → `.firm/reference/` |
| `kb-organize` | `firm_organize` | Organiseer KB content |
| `kb-compact` | `firm_compact` | Compacteer KB |
| `kb-map` | `firm_map` | Toon KB health |
| `kb-workflow` | `firm_workflow` | Workflow management |

### 3. Agent Assets

| Type | Locatie | Aantal |
|------|---------|--------|
| Skills | `the-firm-ext/skills/` | 3 (intake, research, doc-sync) |
| Prompts | `the-firm-ext/prompts/` | 10 |
| Rules | `the-firm-ext/rules/` | 2 |
| Defaults | `src/core/the-firm/defaults/` | 18 templates |

### 4. Identity Rename

| Wat | Pi | The Firm |
|-----|----|----|
| Package name | `@mariozechner/pi-coding-agent` | `@digi4care/the-firm` |
| Binary | `pi` | `the-firm` / `firm` |
| Config dir | `.pi/` | `.the-firm/` |
| Process title | `pi` | `the-firm` |

### Modification Manifest

Alle aanpassingen staan in `THE_FIRM_MODIFICATIONS.md`. **Raadpleeg dit bestand bij upstream merges** om conflicten te anticiperen.

---

## Code Quality

- No `any` types unless absolutely necessary
- Check `node_modules` for external API type definitions instead of guessing
- **NEVER use inline imports** — no `await import("./foo.js")`, no `import("pkg").Type` in type positions. Always use standard top-level imports.
- Never hardcode key checks. All keybindings must be configurable.
- TypeScript, strict, 2 spaces, 100 char (Biome)
- ESM only

## Commands

After code changes (not documentation changes):

```bash
npm run check                                  # biome + tsgo --noEmit
# Fix all errors, warnings, and infos before committing.
```

Note: `npm run check` does not run tests.

Run tests from the package root, not the repo root:

```bash
# AI provider tests
cd packages/ai && npx vitest run test/specific.test.ts

# Coding agent tests
cd packages/coding-agent && npx vitest run src/core/the-firm/__tests__/

# The Firm KB tests (237 tests)
cd packages/coding-agent && npx vitest run src/core/the-firm/__tests__/
```

If you create or modify a test file, you MUST run that test file and iterate until it passes.

NEVER commit unless user asks.

## Style

- Keep answers short and concise
- No emojis in commits, issues, PR comments, or code
- No fluff or cheerful filler text
- Technical prose only, be kind but direct

## Changelog

Location: `packages/*/CHANGELOG.md`

### Format

Use these sections under `## [Unreleased]`:
- `### Breaking Changes` - API changes requiring migration
- `### Added` - New features
- `### Changed` - Changes to existing functionality
- `### Fixed` - Bug fixes
- `### Removed` - Removed features

### Attribution

- **Internal changes**: `Fixed foo bar ([#123](https://github.com/digi4care/the-firm/issues/123))`
- **Upstream changes**: `Fixed foo bar (upstream: badlogic/pi-mono#123)`

## **CRITICAL** Tool Usage Rules

- NEVER use sed/cat to read a file or a range of a file. Always use the read tool.
- You MUST read every file you modify in full before editing.

## **CRITICAL** Git Rules

- **ONLY commit files YOU changed in THIS session**
- ALWAYS use `git add <specific-file-paths>` — NEVER `git add -A` or `git add .`
- Before committing, run `git status` and verify you are only staging YOUR files
- NEVER use `git reset --hard`, `git checkout .`, `git clean -fd`
- NEVER use `git commit --no-verify` on development branch
- If user instructions conflict with rules here, ask for confirmation

---

*Last updated: 11 April 2026*
