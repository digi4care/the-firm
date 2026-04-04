# Changelog

All notable changes to The Firm are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and adheres to [Semantic Versioning](https://semver.org/).

## [0.1.12] - 2026-04-04

### Veranderd
- **Handoff herschreven**: OMP's exacte `handoff-document.md` prompt template gebruikt
- **Compaction blokkade opgelost**: `session_before_compact` returnt nu altijd `undefined` — Pi's eigen compaction wordt nooit meer geblokkeerd
- **Geen aparte LLM call meer**: de oude `generateHandoffSummary()` die garbage produceerde en sessies liet hangen is verwijderd
- Basic handoff (geen LLM nodig) wordt nu als safety net opgeslagen na compaction en bij shutdown

### Toegevoegd
- `/handoff` command: stuurt handoff prompt naar de actieve agent (OMP-stijl)
- `/handoff-now` command: maakt direct nieuwe sessie met basic handoff (instant fallback)
- `renderHandoffPrompt()` met OMP's `{{additionalFocus}}` template variabele
- `wrapHandoffContext()` met OMP's `<handoff-context>` wrapper

### Verwijderd
- `generateHandoffSummary()` — de LLM call die garbage produceerde
- `generateFocusedHandoff()` — aparte LLM call voor handoff
- `resolveModelAuth()` — model resolutie voor aparte LLM call
- `cancel: true` in `session_before_compact` — de oorzaak van de blokkade

## [0.1.11] - 2026-04-03

### Toegevoegd
- Intake office agents + pi-subagents referentie documentatie
- Design: inter-agent communication protocol (goedgekeurd)
- `spoken_language` + `preferred_language` gesplitst in client config (was één `language` veld)
- Backward compat: oud `language` veld wordt automatisch gemigreerd

### Veranderd
- Fix: runtime `settings.json` wordt niet meer overschreven bij sync
- Skill-creator console.log verwijderd, decision gate toegevoegd aan review skill
- Workflow-settings tests gesynchroniseerd met geëvolueerde code (19 tests, allemaal groen)

## [0.1.10] - 2026-04-03

### Toegevoegd
- Dropdown submenu's voor compaction threshold/tokens in /firm settings UI

### Veranderd
- Drie config schemas samengevoegd tot één `FirmConfig` (Zod)
- Fix: submenu crash + regressie tests

## [0.1.9] - 2026-04-03

### Toegevoegd
- Compaction/handoff settings met thresholds, tokens, autoContinue
- Instellingen gekoppeld aan Pi's compaction via `.pi/settings.json`

## [0.1.8] - 2026-04-03

### Toegevoegd
- Alle 12 settings gekoppeld aan extensions
- Brainstorming skill kan state opslaan in `.pi/firm/sessions/`
- Command-loader extension + sync fix

### Veranderd
- Fix: workflow-settings laden + shared/ syncen

## [0.1.7] - 2026-04-03

### Toegevoegd
- Utility extensions, shared scripts, slash commands
- Beads, brainstorming, workflow, developer tooling, discipline, knowledge, research, creative en design skills
- `/settings` extension met tabbed TUI panel

### Veranderd
- Migratie `.firm/` → `.pi/firm/`, `config.yml` → `config.json` met Zod validatie
- Stack optioneel in config schema en intake flow
- 8 The Firm skills geaudit en geoptimaliseerd met references
- Debug extension verwijderd

## [0.1.6] - 2026-04-03

### Toegevoegd
- Pre-commit hook — enforce `bun test` + lint voor elke commit
- Debug widget tests (multi-turn name persistence)

### Veranderd
- Fix: debug detailMode crash — event variabele out-of-scope
- Fix: compact widget toont tool-namen i.p.v. alleen nummers
- Refactor: extensions naar categorie-dirs (guards/, workflows/)
- Refactor: debug-dashboard → debug met co-located lib
- Refactor: delete-guard → guards/, intake → workflows/

## [0.1.5] - 2026-04-03

### Toegevoegd
- tf-delete-guard extension — enforce `requireConfirmationBeforeDelete`
- 11 test cases voor delete guard

### Veranderd
- Fix: debug widget — tool names altijd zichtbaar, truncate tot terminal width
- Fix: verwijder boutique consultancy/agency framing, The Firm is een tech/software bedrijf
- `bd create` als harde regel toegevoegd aan AGENTS.md en APPEND_SYSTEM.md
- Fix: invalid bgPanel theme color uit debug widget

## [0.1.4] - 2026-04-03

### Toegevoegd
- Delete confirmation guard via `settings.json` + AGENTS.md update
- SOLID/DRY/TDD + ticket-first workflow in AGENTS.md
- Hook tracking in debug dashboard + `/tf-debug --detail`

### Veranderd
- Fix: personal file paths van `src/internal/personal/` naar `.personal/`
- Fix: three bugs in `/tf-intake` extension

## [0.1.3] - 2026-04-03

### Toegevoegd
- Architecture department design v0.1
- Intake runtime design + `/tf-intake` Pi extension

### Veranderd
- Refactor: selective sync scripts — alleen runtime dirs naar `.pi/`
- Refactor: move schemas into `lib/`, fix tf-intake imports
- Refactor: rename front-door to intake, update blueprint methodology

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

## [0.1.13] - 2026-04-04

### Toegevoegd
- (nog in te vullen)

## [0.1.14] - 2026-04-04

### Toegevoegd
- (nog in te vullen)

## [0.1.0] - 2026-04-03

### Toegevoegd
- Project structuur en basisbestanden (AGENTS.md, APPEND_SYSTEM.md)
- Terminologie en communicatie-afspraken vastgelegd
- Handoff documentatie in `.local/HANDOFF.md`
