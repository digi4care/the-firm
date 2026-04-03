# AGENTS.md

**Agent Guidelines voor The Firm**

Dit project bouwt The Firm: een engineering operating system voor AI-assisted software development. De design documentatie staat in `src/internal/the-firm/`.

---

## IMPORTANT: This File Contains TIMELESS INFO ONLY

**Dit bestand hoeft normaal niet meer veranderd te worden na aanmaak.**

- GEEN actuele bugs of issues
- GEEN tijdelijke workarounds
- ALLEEN permanente waarheden over het project

Actuele issues horen in planning docs of issue tracker, niet hier.


## CRITICAL: Tool Usage Rules

### Bestanden lezen en schrijven

| Wat je wilt doen | NIET gebruiken | WEL gebruiken |
|---|---|---|
| Bestand lezen | `cat`, `head`, `tail`, `less` | `read` tool (met `offset`/`limit` voor delen) |
| Bestand schrijven | `echo >`, `cat <<`, `tee` | `write` tool |
| Bestand bewerken | `sed`, `awk`, `perl -i` | `edit` tool (met anchors) of `ast_edit` |
| Zoeken in code | `grep`, `rg` via bash | `grep` tool of `ast_grep` |
| Bestanden vinden | `find`, `ls` via bash | `find` tool of `read` op directory |

### Waarom

Deze bash-commando's worden **geblokkeerd** omdat de ingebouwde tools meer context geven, veiliger zijn, en beter werken met grote bestanden. Als je `cat` probeert te gebruiken krijg je een "Blocked" error.

- **LEES altijd een bestand volledig voordat je het bewerkt.**

## CRITICAL: Git Rules (Parallel Agents)

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

## Project Stack

Dit project is in de opstartfase. De stack wordt hier bijgewerkt zodra keuzes zijn gemaakt.

- **Runtime:** bun
- **Frontend:** nog te bepalen
- **Backend:** nog te bepalen
- **Database:** nog te bepalen
- **Overig:** nog te bepalen

---

## Project Structuur

```text
.
├── AGENTS.md                  ← dit bestand (projectregels, altijd aanwezig)
├── ai_docs/
│   └── principles/            ← algemene principes (anti-slop, intent engineering)
├── docs/                      ← gebruikers-documentatie
│   ├── overview.md
│   ├── how-it-works.md
│   ├── runtime-agents.md
│   └── ... (meer docs)
├── src/                       ← source laag (alles wat gecommit wordt)
│   ├── APPEND_SYSTEM.md       ← sessie-instructies (dev-only, gekopieerd naar .omp/)
│   └── internal/
│       ├── personal/          ← persona + woordenlijst
│       │   ├── PERSONA.md
│       │   └── TERMS.md
│       └── the-firm/          ← design documentatie (v0)
│           ├── THE_FIRM_VISION.md
│           ├── THE_FIRM_DOCTRINE.md
│           └── ... (meer design docs)
├── .omp/                      ← runtime laag (niet in git, gevuld bij dev release)
├── .gitignore
└── .git/
```

---

## Available Skills

Nog te bepalen na installatie.

---

## Testing Guidelines

Nog te bepalen na stack-keuze.

---

## Project Commands

Nog te bepalen na setup.

---

## NOOIT DOEN

- Aannames maken zonder te bevestigen bij de gebruiker
- Jargon gebruiken zonder uitleg
- Doorgaan als het niet duidelijk is wat de bedoeling is
- Code schrijven "omdat het kan" in plaats van "omdat het nodig is"
- Destructive git commands gebruiken zonder toestemming

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
