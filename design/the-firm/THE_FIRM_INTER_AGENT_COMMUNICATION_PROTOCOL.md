# The Firm Inter-Agent Communication Protocol v1

## Status
**Approved** — 2026-04-03

---

## Design beslissingen

| Vraag | Besluit | Waarom |
|---|---|---|
| Communicatie patroon | Hybride — Files + Orchestrator Extension | Persistentie + controle |
| Context per agent | Artifacts + pull | Compact in prompt, filesystem als ground truth |
| Agent definitie | Frontmatter uitbreiden | YAGNI nu, migratiepad naar agent-manifest later |
| Iteratie-loop | Max iteraties + escalatie | Instelbaar per department, veiligheidsklep |
| Orchestratie | Hybride — agents signaleren, extension routeert | Scheiding content vs flow |
| Handoff artifacts | State file + artifacts | Machine-readable state + human-readable output |
| Subagent dispatch | Pi's subagent tool (single mode per stap) | Bewezen, geïsoleerd context window |
| Transport | Custom wrapper tool `firm_dispatch` | Orchestratielogica bovenop generiek transport |

---

## Architectuur

### Bestanden

```
src/extensions/departments/intake.ts    ← orchestrator extension
src/agents/intake-lead.md               ← agent prompts (bestaand)
src/agents/request-analyst.md           ← agent prompts (bestaand)
src/agents/brief-writer.md              ← agent prompts (bestaand)

.pi/firm/departments/intake/
├── state.json                          ← machine state (orchestrator)
├── conversation-summary.md             ← lead artifact
├── classification.md                   ← analyst artifact
└── brief.md                            ← brief-writer artifact
```

### Frontmatter uitbreiding

Elke agent krijgt extra velden in YAML frontmatter:

```yaml
---
name: request-analyst
office: intake
accepts: intake-conversation        # input artifact type
produces: classification            # output artifact type
delegates-to: brief-writer          # volgende agent (hint voor orchestrator)
tools: read, bash
---
```

Deze veldnamen zijn compatibel met agent-manifest voor toekomstige migratie.

### Settings in `/firm`

```
Tab: Agents
├── Default max iteraties: 2
├── Department overrides:
│   └── intake: 3
└── Bij deadlock: escalatie naar gebruiker
```

Opgeslagen in `.pi/settings.json` onder `theFirm.agents.*`.

---

## Flow

```
Gebruiker: /tf-intake
       │
       ▼
LLM roept: firm_dispatch({ department: "intake", action: "start" })
       │
       ▼
Orchestrator:
  1. Lees state.json (nieuw → start bij lead)
  2. Dispatch intake-lead via subagent (single mode)
  3. Sla output op als conversation-summary.md
  4. Update state.json → { next: "analyst", iteration: 1, step: "lead-done" }
  5. Return aan LLM: "lead compleet, wil je verder?"
       │
       ▼
LLM roept: firm_dispatch({ department: "intake", action: "continue" })
       │
       ▼
Orchestrator:
  1. Lees state.json → analyst is aan zet
  2. Bouw context: conversation-summary.md + analyst agent .md
  3. Dispatch request-analyst via subagent
  4. Sla output op als classification.md
  5. Check: volledig?
     ├── Ja → next: brief-writer
     └── Nee → next: lead (iteratie++)
  6. Check iteratie-limiet
     ├── Onder limiet → ga door
     └── Op limiet → escalatie naar gebruiker
  7. Update state.json
       │
    ... herhaal tot DONE of escalatie
       │
       ▼
Klaar → brief.md opgeslagen, state.json = { status: "completed" }
```

### State machine

```
     ┌──────────────────────────────────────────┐
     │                                          │
     ▼                                          │
  LEAD ──→ ANALYST ──→ BRIEF_WRITER ──→ REVIEW ──┘
     ▲         │              │
     │         │              │
     └─(onvolledig)   (onvolledig)
     │         │              │
     └───── iteratie ─────────┘
                    │
              iteratie-limiet?
                    │
              escalatie naar gebruiker
```

---

## firm_dispatch tool

De orchestrator extension registreert één tool: `firm_dispatch`.

### Parameters

```typescript
{
  department: string,        // "intake", "product", etc.
  action: "start" | "continue" | "status" | "reset",
  context?: string,          // optioneel: extra context van de LLM
}
```

### Acties

| Action | Wat | Return |
|---|---|---|
| `start` | Initialiseert department state, dispatcht eerste agent | Status + "continue om door te gaan" |
| `continue` | Leest state, dispatcht volgende agent | Resultaat + volgende stap |
| `status` | Toont huidige state zonder te dispatchen | State overview |
| `reset` | Reset department state (na escalatie) | Bevestiging |

### Wat de tool intern doet

1. **State lezen** — `.pi/firm/departments/<dept>/state.json`
2. **Bepaal agent** — op basis van state + agent frontmatter (`delegates-to`)
3. **Context bouwen** — compact handoff artifact + agent .md prompt
4. **Subagent callen** — via Pi's subagent tool (single mode)
5. **Artifact opslaan** — output naar `.pi/firm/departments/<dept>/<artifact>.md`
6. **State updaten** — next agent, iteratie count, status
7. **Iteratie check** — onder limiet? ga door. Op limiet? escalatie.
8. **Return** — resultaat + hint voor LLM over volgende actie

---

## Agent context strategie

### Wat een agent in zijn prompt krijgt

```
[Agent .md — volledige system prompt]

## Handoff context
[Relevant artifact — bijv. conversation-summary.md]

## Je taak
[Specifieke instructie voor deze stap]
```

### Wat een agent NIET krijgt

- Het volledige vorige gesprek (te veel tokens, te noisy)
- State van andere departments (niet relevant)
- Interne orchestrator logica (niet nodig)

### Wat een agent WEL kan ophalen

- Alle artifacts in `.pi/firm/` (read tool)
- Codebase files (read tool)
- Client config (`.pi/firm/config.json`)

Pull-based: compact in de prompt, alles beschikbaar via tools.

---

## Iteratie protocol

### Per overgang

| Overgang | Default limiet | Reden |
|---|---|---|
| Lead → Analyst → Lead | 3 | Client gesprekken zijn onvoorspelbaar |
| Analyst → Brief Writer → Analyst | 2 | Classificatie is meestal helder |
| Brief Writer → Lead → Brief Writer | 2 | Review is meestal 1 ronde |

### Limiet bereikt

1. Orchestrator stopt dispatch
2. Return aan LLM: "Iteratie-limiet bereikt. {samenvatting van waar het stuck zit}"
3. LLM escaleert naar gebruiker: "Ik kom er niet uit met de info die ik heb. Kun jij helpen?"
4. Gebruiker kan: extra info geven (→ `continue`) of resetten (→ `reset`)

---

## Toekomstige migratie

### Frontmatter → agent-manifest

Als we 6+ departments hebben met 18+ agents:

1. Schrijf migratie script: `.md` frontmatter → `.manifest.json`
2. Orchestrator leest manifest in plaats van frontmatter
3. Gebruik `agent-manifest.compare()` voor compatibility checks
4. Gebruik `agent-manifest.findAgentsForCapability()` voor discovery

De frontmatter velden (`accepts`, `produces`, `delegates-to`) zijn direct compatibel.

---

## Bronnen

| Bron | Wat we gebruiken |
|---|---|
| GSD-2 parallel-orchestration | File-based IPC, atomic writes |
| GSD-2 dispatch pipeline | Fresh session per dispatch, compressed context |
| GSD-2 god-tier context engineering | Token budgets, pull-based context |
| Pi SDK subagent tool | Single mode dispatch, isolated context window |
| Pi SDK ExtensionAPI | Tool registration, state management |
| agent-manifest | Migratiepad voor schaal |

---
*Approved: 2026-04-03*
*Issue: the-firm-659*
*Brainstorm session: 2026-04-03-inter-agent-communication*
