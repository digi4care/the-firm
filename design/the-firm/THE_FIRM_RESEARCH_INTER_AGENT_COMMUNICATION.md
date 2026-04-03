# The Firm Research: Inter-Agent Communication v0

## Status
**Approved** — design vastgelegd in `THE_FIRM_INTER_AGENT_COMMUNICATION_PROTOCOL.md`

## Research vraag
Hoe laten we The Firm agents (intake-lead, request-analyst, brief-writer, en toekomstige agents) met elkaar communiceren?

---

## 1. Patronen uit GSD-2

### File-based IPC (GSD-2 kernpatroon)

GSD-2 gebruikt **bestanden als communicatiekanaal** tussen agents. Geen directe messaging.

| Mechanisme | Hoe | Voorbeeld |
|---|---|---|
| **Status files** | Agent schrijft `.gsd/parallel/<MID>.status.json` | Worker heartbeat |
| **Signal files** | Coordinator schrijft `.gsd/parallel/<MID>.signal.json` | Pause/resume/stop |
| **State files** | STATE.md, roadmap, plans = source of truth | Auto-mode leest schijf |
| **Atomic writes** | Write-to-temp + rename voorkomt partial reads | Crash-safe |

**Kernprincipe:** *"State lives on disk. No in-memory state survives across sessions."*

### Coordinator-Worker patroon

```
Coordinator (1)
  ├── Worker 1 (milestone M001 in eigen worktree)
  ├── Worker 2 (milestone M003 in eigen worktree)
  └── Worker 3 (milestone M005 in eigen worktree)
```

- Elke worker is een **apart proces** met eigen context window
- Communicatie ALLEEN via bestanden
- Coordinator bepaalt eligibility, volgt budget, merge reconciliation

### Diamond Pattern (parallelisatie)

```
    Planning (narrow, serial)
         ↓
   Fan Out (parallel execution)
         ↓
  Convergence (integration verification)
         ↓
    Fan Out (next parallel set)
```

### Dispatch Pipeline

1. Read disk state
2. Determine next unit
3. Classify complexity → select model
4. Build dispatch prompt (compressed context)
5. **Create fresh agent session** (clean context window)
6. Inject prompt, let LLM execute
7. On completion: snapshot metrics, verify artifacts, persist state
8. Loop

**Belangrijk:** Elke dispatch = nieuwe sessie met schoon context window. De LLM start met alleen pre-inlined artifacts.

---

## 2. Patronen uit Pi SDK

### Events (The Nervous System)

Pi's extensie systeem is event-driven:

| Categorie | Events | Relevance |
|---|---|---|
| **Session** | `session_start`, `session_shutdown`, `session_before_compact` | Lifecycle |
| **Agent** | `before_agent_start`, `agent_end`, `turn_start`, `turn_end`, `context` | LLM interactie |
| **Tool** | `tool_call`, `tool_result` | Tool gebruik |
| **Input** | `input` | User input |

### ExtensionAPI messaging

| Methode | Wat | Mode |
|---|---|---|
| `pi.sendMessage(msg)` | Inject custom message | `"steer"`, `"followUp"`, `"nextTurn"` |
| `pi.sendUserMessage(content)` | Verstuur als user | Triggers agent turn |
| `pi.appendEntry(type, data)` | Persist state (niet naar LLM) | State recovery |
| `pi.events` | **Shared event bus** voor inter-extension | Pub/sub |

### State recovery via tool result details

State leeft in `details` van tool results, zodat het werkt met branching/forking.

### Subagent systeem

Pi heeft een ingebouwd subagent systeem (`ctx.subagent()` of via skills). Dit start een **nieuwe sessie** met een apart context window.

---

## 3. Patronen uit agent-manifest (eigen repo)

### Communication schema

```json
{
  "communication": {
    "protocols": ["a2a", "mcp", "openai-functions"],
    "accepts": ["code-generation", "code-review"],
    "delegates": ["test-generation", "documentation"]
  }
}
```

### Wat agent-manifest oplost

- **Discovery:** Welke agent kan welke taak?
- **Routing:** Welke agent naar welke taak sturen?
- **Compatibility:** Kunnen twee agents samenwerken?
- **Contracts:** Wat zijn input/output formats?

### Nuttig voor The Firm

- Elke agent krijgt een manifest: capabilities, accepts, delegates
- `compare()` functie checkt of agent A naar agent B kan handoff-en
- `findAgentsForCapability()` voor task routing

---

## 4. Patronen uit GSD-2 building-coding-agents docs

### Layered Memory Architecture

```
Project Manifest (always loaded, <1000 tokens)
        ↓
Task Context (per-task, relevant files + specs)
        ↓
Retrieval Layer (pull-based, on-demand)
        ↓
Ground Truth (filesystem, git, actual code)
```

### Golden Rules

1. **Never summarize summaries** — altijd vanuit ground truth regenereren
2. **Filesystem = infinite context window** — organized for retrieval
3. **Agents communicate through filesystem, never directly**
4. **Fresh session per unit** — clean context window, pre-inlined artifacts
5. **Compress at every state transition** — 5:1 ratio per niveau

### Handoff Problem (doc #18)

Anti-patronen bij AI-generated code die ook gelden voor agent handoffs:
- **Flat code** → geen structuur, moeilijk te volgen
- **Missing breadcrumbs** → geen README/ADR/diagrams
- **Over-abstraction** → custom patterns nobody knows

Oplossing: **Adversarial verification** — aparte agent (zonder context van builder) probeert het werk te gebruiken. Als die strugglet, zal een human ook strugglen.

---

## 5. Synthese: patronen die relevant zijn voor The Firm

### Wat The Firm nodig heeft

| Behoefte | GSD-2 patroon | Pi SDK mechanisme | agent-manifest |
|---|---|---|---|
| **Agent discovery** | Dispatch table | Skills/agents dirs | `findAgentsForCapability()` |
| **Task routing** | Coordinator bepaalt | `pi.events` bus | `accepts` / `delegates` |
| **Handoff** | File-based (artifacts) | `sendMessage` / clean session | `compare()` compatibility |
| **State persistence** | `.gsd/` on disk | `appendEntry` / tool details | N/A |
| **Context compression** | Pre-inlined, compressed | Compaction events | N/A |
| **Iteration loops** | Signal files | `pi.sendMessage("steer")` | N/A |
| **Crash recovery** | Lock files, atomic writes | Session entries | N/A |

### The Firm's specifieke constraint

Anders dan GSD-2 (parallelle workers voor milestones), heeft The Firm **sequentiële agents binnen een department**:

```
Intake Lead → Request Analyst → Brief Writer
     ↑                                    │
     └──── (iteratie als onvolledig) ─────┘
```

Dit is een **pipeline**, geen fan-out. Dat vereist:
1. Gedeelde context (het gesprek + bevindingen)
2. Expliciete handoff met artifact
3. Iteratie-mogelijkheid (terug naar vorige agent)

---

## 6. Open vragen voor brainstorm

1. **Protocol:** File-based (GSD-2 stijl) vs event-based (Pi SDK events) vs hybride?
2. **Context:** Deelt de intake-lead zijn volledige conversation history met de analyst, of een samenvatting?
3. **Manifest:** Gebruiken we agent-manifest voor onze agents, of is frontmatter in de .md voldoende?
4. **Orchestratie:** Wie stuurt? Een department orchestrator extension, of de agents zelf (via handoff instructions)?
5. **Iteratie:** Hoe werkt "terug naar vorige agent" zonder infinite loop?
6. **Testing:** Hoe testen we agent communicatie?

---

## Bronnen

| Bron | Wat geleerd |
|---|---|
| GSD-2 `architecture.md` | File-based state, fresh session per dispatch, dispatch pipeline |
| GSD-2 `parallel-orchestration.md` | Coordinator-worker, signal IPC, atomic writes |
| GSD-2 `05-parallelization-strategy.md` | Diamond pattern, filesystem als communicatiekanaal |
| GSD-2 `03-state-machine-context-management.md` | Layered memory, pull-based context |
| GSD-2 `11-god-tier-context-engineering.md` | Context window = UX, token budgets, cascading summarization |
| GSD-2 `13-long-running-memory-fidelity.md` | Never summarize summaries, append-only decision log |
| GSD-2 `18-the-handoff-problem.md` | Adversarial verification, readability |
| Pi SDK `07-events.md` | Event systeem, handler signatures |
| Pi SDK `09-extensionapi.md` | sendMessage, appendEntry, pi.events bus |
| Pi SDK `13-state-management.md` | State in tool result details, appendEntry pattern |
| agent-manifest | Communication protocols, accepts/delegates, compatibility scoring |

---
*Research date: 2026-04-03*
*Issue: the-firm-659*
