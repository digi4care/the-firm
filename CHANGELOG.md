# Changelog

All notable changes to The Firm are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and adheres to [Semantic Versioning](https://semver.org/).

## [0.1.16] - 2026-04-04

### Toegevoegd
- `/firm` subcommands: `settings`, `handoff`, `compaction`, `status`
- `/firm handoff` — toont handoff bestanden, storage mode, last session info
- `/firm compaction` — toont The Firm + Pi's synced compaction settings
- `/firm status` — toont firm overview (initialized, config, settings count)
- Autocomplete voor subcommands via `getArgumentCompletions`

## [0.1.15] - 2026-04-04

### Veranderd
- Handoff bestanden per sessie: `handoff-<sid>-<ts>.md` in `.pi/firm/handoffs/`
- Multi-instance safe: meerdere Pi-sessies overschrijven elkaars handoff niet meer
- Alle `.local/` referenties verwijderd: handoff leeft in `.pi/firm/`
- `/handoff` gefixt: slaat basic handoff op, stuurt prompt naar agent
- `clearHandoffDoc()` respecteert `handoffStorage` setting

### Toegevoegd
- `theFirm.compaction.handoffStorage` setting: `inmemory` (default) of `file`

### Verwijderd
- `/handoff-now` command — overbodig (shutdown + nieuwe sessie doet hetzelfde)
- `saveHandoffToDisk()` functie — samengevoegd in `/handoff` handler
- `theFirm.compaction.handoffSaveToDisk` setting — vervangen door `handoffStorage`

## [0.1.14] - 2026-04-04

### Veranderd
- Handoff herschreven: OMP's exacte `handoff-document.md` prompt template
- Compaction blokkade opgelost: `session_before_compact` returnt altijd `undefined`
- Geen aparte LLM call meer: `generateHandoffSummary()` verwijderd

### Toegevoegd
- `/handoff` command: stuurt handoff prompt naar actieve agent (OMP-stijl)
- `renderHandoffPrompt()` met OMP's `{{additionalFocus}}` template variabele
- `wrapHandoffContext()` met OMP's `<handoff-context>` wrapper

### Verwijderd
- `generateHandoffSummary()` — LLM call die garbage produceerde
- `generateFocusedHandoff()` — aparte LLM call voor handoff
- `resolveModelAuth()` — model resolutie voor aparte LLM call
- `cancel: true` in `session_before_compact` — oorzaak van de blokkade

## [0.1.12] - 2026-04-04

### Veranderd
- Handoff herschreven: OMP's exacte prompt template gebruikt
- Compaction blokkade opgelost
- Geen aparte LLM call meer

### Toegevoegd
- `/handoff` command (OMP-stijl)
- `/handoff-now` command (instant fallback)
- `renderHandoffPrompt()` + `wrapHandoffContext()`

### Verwijderd
- `generateHandoffSummary()`, `generateFocusedHandoff()`, `resolveModelAuth()`
- `cancel: true` in `session_before_compact`

## [0.1.11] - 2026-04-03

### Toegevoegd
- Intake office agents + pi-subagents referentie documentatie

## [0.1.10] - 2026-04-03

### Toegevoegd
- Dropdown submenu's voor compaction threshold/tokens in /firm settings UI

### Veranderd
- Drie config schemas samengevoegd tot één `FirmConfig` (Zod)

## [0.1.9] - 2026-04-03

### Toegevoegd
- Compaction/handoff settings met thresholds, tokens, autoContinue
- Instellingen gekoppeld aan Pi's compaction via `.pi/settings.json`

## [0.1.8] - 2026-04-03

### Toegevoegd
- Alle 12 settings gekoppeld aan extensions
- Brainstorming skill kan state opslaan in `.pi/firm/sessions/`
- Command-loader extension + sync fix

## [0.1.7] - 2026-04-03

### Toegevoegd
- Utility extensions, shared scripts, slash commands
- Beads, brainstorming, workflow, developer tooling skills
- `/settings` extension met tabbed TUI panel

### Veranderd
- Migratie `.firm/` → `.pi/firm/`, `config.yml` → `config.json` met Zod
- 8 The Firm skills geaudit en geoptimaliseerd

## [0.1.6] - 2026-04-03

### Toegevoegd
- Pre-commit hook — enforce `bun test` + lint
- Debug widget tests (multi-turn name persistence)

### Veranderd
- Fix: debug detailMode crash
- Fix: compact widget toont tool-namen
- Refactor: extensions naar categorie-dirs (guards/, workflows/)

## [0.1.5] - 2026-04-03

### Toegevoegd
- tf-delete-guard extension — enforce `requireConfirmationBeforeDelete`
- 11 test cases voor delete guard

### Veranderd
- Fix: debug widget — tool names altijd zichtbaar, truncate tot terminal width
- Fix: verwijder boutique consultancy/agency framing

## [0.1.4] - 2026-04-03

### Veranderd
- Fix: three bugs in `/tf-intake` extension

## [0.1.3] - 2026-04-03

### Toegevoegd
- Architecture department design v0.1
- Intake runtime design + `/tf-intake` Pi extension

### Veranderd
- Refactor: selective sync scripts
- Refactor: rename front-door to intake

## [0.1.2] - 2026-04-03

### Toegevoegd
- Zod schemas voor client dossier + project config
- Client dossier redesign met global/project split

### Veranderd
- OMP→Pi migratie (docs, design dir moves, deletions)

## [0.1.1] - 2026-04-03

### Toegevoegd
- Client dossier design + intake department revisie
- The Firm design documentatie

## [0.1.18] - 2026-04-04

### Toegevoegd
- (nog in te vullen)

## [0.1.0] - 2026-04-03

### Toegevoegd
- Project structuur en basisbestanden (AGENTS.md, APPEND_SYSTEM.md)
- Terminologie en communicatie-afspraken vastgelegd
- Handoff documentatie in `.pi/firm/handoffs/`
