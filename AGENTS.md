# AGENTS.md

**Agent Guidelines voor The Firm**

Dit project bouwt The Firm: een engineering operating system voor AI-assisted software development. De design documentatie staat in `design/the-firm/`.

---

## Dit bestand bevat alleen permanente waarheden

- GEEN actuele bugs of issues
- GEEN tijdelijke workarounds
- Actuele issues horen in beads (issue tracker), niet hier

---

## Terminologie

| Woord | Betekenis |
|---|---|
| tool | Ingebouwde agent-actie (read, write, edit, grep) |
| programma | CLI-programma (gh, bun, git, beads) |

Bij twijfel: vragen.

---

## Project Structuur

```text
.
├── AGENTS.md                  ← dit bestand (projectregels)
├── APPEND_SYSTEM.md           ← sessie-instructies (dev-only)
├── CHANGELOG.md               ← versiegeschiedenis
├── package.json               ← project metadata + scripts
│
├── src/                       ← bronlaag (alles wat naar .pi/ gesynct wordt)
│   └── APPEND_SYSTEM.md       ← sessie-instructies (wordt gekopieerd naar .pi/)
│
├── design/                  ← design documentatie (in git, NIET naar .pi/)
│   ├── the-firm/              ← design docs (v0)
│   │   ├── THE_FIRM_VISION.md
│   │   ├── THE_FIRM_DOCTRINE.md
│   │   └── ... (meer design docs)
│   └── REFERENCES.md          ← repo-links en relaties
├── .ai_docs/                  ← instructies voor de AI agent
│   └── principles/            ← anti-slop, intent engineering
├── docs/                      ← gebruikers-documentatie
│   ├── overview.md
│   ├── how-it-works.md
│   └── ... (meer docs)
│
├── scripts/                   ← build/sync scripts
│
├── .personal/                 ← persona + woordenlijst (gitignored)
├── .pi/                       ← runtimelaag (gitignored, gevuld door sync)
│   └── firm/                  ← The Firm runtime workspace
│       ├── handoffs/          ← per-sessie handoff documenten
│       │   └── handoff-<sid>-<ts>.md ← auto-generated per sessie
│       ├── config.json        ← engagement configuratie
│       ├── plans/             ← implementatie plans (linked to Beads)
│       ├── artifacts/         ← gate artifacts (design docs, verification)
│       ├── sessions/          ← brainstorm/session logs
│       └── scratch.md         ← ephemeral session notes

└── .git/
```

### Lagen

```
bron          sync            runtime
~~~~~         ~~~~            ~~~~~~~
src/     ──────────>    .pi/         (bun run dev / prod)
  APPEND_SYSTEM.md ──> APPEND_SYSTEM.md   (alleen bij dev)

design/        nooit naar .pi/        design docs, the-firm/
.personal/     nooit naar .pi/        persona, woordenlijst
.local/        nooit naar .pi/        ALLEEN HANDOFF.md (legacy, niet meer gebruikt)
```

---

## Project Stack

Dit project is in de opstartfase. De stack wordt hier bijgewerkt zodra keuzes zijn gemaakt.

- **Runtime:** bun
- **Frontend:** nog te bepalen
- **Backend:** nog te bepalen
- **Database:** nog te bepalen
- **Overig:** nog te bepalen

---

## Development Workflow

### Sessie start

Elke nieuwe sessie leest in deze volgorde:

1. `AGENTS.md` -- projectregels en structuur (dit bestand)
2. `src/APPEND_SYSTEM.md` -- sessie-instructies (persona, context, cli-programma's)
3. `.pi/firm/` -- handoff van vorige sessie (nieuwste `handoff-*.md`, indien aanwezig)
4. `beads list` -- openstaande issues ophalen

### Werken

1. Pick een issue uit beads (of overleg met gebruiker)
2. Maak wijzigingen in de juiste laag (zie Lagen hierboven)
3. Test je wijzigingen
4. Commit alleen bestanden die jij hebt veranderd

### Sessie afronde

Zie "Session Completion" onderaan dit bestand (beads integration sectie).

---

## Tool Usage Rules

### Bestanden lezen en schrijven

| Wat je wilt doen | NIET gebruiken | WEL gebruiken |
|---|---|---|
| Bestand lezen | `cat`, `head`, `tail`, `less` | `read` tool (met `offset`/`limit` voor delen) |
| Bestand schrijven | `echo >`, `cat <<`, `tee` | `write` tool |
| Bestand bewerken | `sed`, `awk`, `perl -i` | `edit` tool (met anchors) of `ast_edit` |
| Zoeken in code | `grep`, `rg` via bash | `grep` tool of `ast_grep` |
| Bestanden vinden | `find`, `ls` via bash | `find` tool of `read` op directory |

Deze bash-commando's worden **geblokkeerd** omdat de ingebouwde tools meer context geven, veiliger zijn, en beter werken met grote bestanden. Als je `cat` probeert te gebruiken krijg je een "Blocked" error.

- **LEES altijd een bestand volledig voordat je het bewerkt.**

---

## Git Rules (Parallel Agents)

Meerdere agents kunnen tegelijk aan verschillende bestanden werken.

### Committen

- **ALLEEN bestanden committen die JIJ in DEZE sessie hebt veranderd**
- NOOIT `git add -A` of `git add .` -- die pakken ook wijzigingen van andere agents
- ALTIJD `git add <specifieke-bestanden>` gebruiken
- Check `git status` voordat je commit

### Verboden git operaties

- `git reset --hard` -- vernietigt uncommitted wijzigingen
- `git checkout .` -- vernietigt uncommitted wijzigingen
- `git clean -fd` -- verwijdert untracked bestanden
- `git stash` -- stash ALLES inclusief werk van andere agents
- `git add -A` / `git add .` -- staged werk van andere agents
- `git commit --no-verify` -- omzeilt required checks

---

## Engineering Standards

### SOLID / DRY / TDD

- **TDD**: test first, dan pas implementatie. `bun test` moet slagen voor commit.
- **SOLID**: single responsibility per file/module, open voor extensie, interface segregation.
- **DRY**: drie keer dezelfde logica = extracten. Gedeelde logica in `src/lib/`.

### Elk werk begint met een ticket

**ALLES** wat gepland, onderzocht, ontworpen, geschreven of geïmplementeerd moet worden — **altijd** eerst `bd create`.

Dit geldt voor:
- Features, bugs, fixes, refactoring, tests
- Design docs schrijven of bijwerken
- Research en analyse
- Architectuur beslissingen
- Herontwerpen van bestaande code
- Elke actie die meer dan 5 minuten duurt

**Geen uitzonderingen.**

- Geen ticket = niet beginnen.
- Geen "ik maak het even zonder ticket".
- Geen "dit is te klein voor een ticket".
- Zie je werk dat nog geen ticket heeft? Maak er een.

### Nooit verwijderen zonder bevestiging

`src/settings.json` → `theFirm.requireConfirmationBeforeDelete`

Als deze op `true` staat: **altijd** de gebruiker vragen voordat een bestand wordt verwijderd (`rm`, unlink, rmdir, rsync --delete, enz.). Geen uitzonderingen.

---

## Project Commands

### Sync scripts

| Command | Wat het doet |
|---|---|
| `bun run dev` | Kopieert `src/APPEND_SYSTEM.md` naar `.pi/` |
| `bun run prod` | Synced `src/` naar `.pi/` ZONDER `APPEND_SYSTEM.md` |

### Linting en formatting

| Command | Wat het doet |
|---|---|
| `bun run lint` | Biome check + markdownlint op alle bestanden |
| `bun run lint:fix` | Biome + markdownlint met auto-fix |
| `bun run format` | Biome format alle bestanden (write) |
| `bun run format:check` | Biome format check (dry-run) |

### Versiebeheer

| Command | Wat het doet |
|---|---|
| `bun run version:patch` | Bump patch (0.1.0 -> 0.1.1) + changelog + git tag |
| `bun run version:minor` | Bump minor (0.1.0 -> 0.2.0) + changelog + git tag |
| `bun run version:major` | Bump major (0.1.0 -> 1.0.0) + changelog + git tag |

Het versie-bump script (`scripts/version-bump.js`):

- Leest huidige versie uit `package.json`
- Bumped versienummer
- Voegt nieuw entry toe aan `CHANGELOG.md`
- Maakt een git commit + tag (`vNIEUWE_VERSIE`)

### Issue tracking (Beads)

| Command | Wat het doet |
|---|---|
| `beads list` | Toon alle issues |
| `beads ready` | Toon beschikbare work (open, geen blockers) |
| `beads create --title "..." --body "..."` | Nieuw issue aanmaken |
| `beads show <id>` | Issue details bekijken |
| `beads close <id>` | Issue sluiten |
| `beads status` | Overzicht issue database |

Issue prefix: `the-firm` (issues heten `the-firm-<hash>`)

---

## NOOIT DOEN

- Aannames maken zonder te bevestigen bij de gebruiker
- Jargon gebruiken zonder uitleg
- Doorgaan als het niet duidelijk is wat de bedoeling is
- Code schrijven "omdat het kan" in plaats van "omdat het nodig is"
- Destructive git commands gebruiken zonder toestemming

---

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:

   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```

5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
