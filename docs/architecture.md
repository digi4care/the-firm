# Architecture

The Firm is a layered operating system that runs on top of Pi. Understanding its architecture helps operators make informed decisions about customization, debugging, and extension.

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    The Firm (Doctrine + Workflow)            │
│  - Role-specialized agents  - Artifact-based handoffs        │
│  - Gated execution phases   - Independent QA                 │
│  - Risk-tiered verification - Explicit governance            │
├─────────────────────────────────────────────────────────────┤
│                    Pi  (Runtime + Tools)                     │
│  - Agent dispatch           - Tool orchestration             │
│  - Skill system             - Command framework              │
│  - Template engine                                          │
├─────────────────────────────────────────────────────────────┤
│                    Beads (Issue Control Plane)               │
│  - Issue state machine      - Dependency tracking            │
│  - Work item lifecycle      - Readiness/blockers             │
├─────────────────────────────────────────────────────────────┤
│                    Dolt (Versioned History)                  │
│  - Versioned workflow state - Evidence records               │
│  - Audit trail              - Queryable history              │
├─────────────────────────────────────────────────────────────┤
│                    Git (Code History)                        │
│  - Source code versioning   - Branch management              │
│  - File system ground truth                                │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Pi Runtime

Pi provides the execution environment for The Firm:

- **Agent dispatch**: Routes work to role-specialized agents defined in `.pi/agents/`
- **Tool access**: Provides the tool surface (read, edit, grep, bash, etc.)
- **Skill system**: Loads domain-specific skills from `.pi/skills/`
- **Command framework**: Exposes commands like `pi run handoff-state` via `.pi/commands/`

The Firm overrides Pi's default assumptions with its own doctrine in `AGENTS.md`.

### Beads Control Plane

Beads is the issue tracker designed for AI-assisted work:

- **Issue-first execution**: All serious work links to a Beads issue
- **State machine**: Issues move through `proposed` → `triaged` → `ready` → `claimed` → `in_progress` → `review_pending` → `qa_pending` → `verified` → `closed`
- **Dependency awareness**: Blockers and prerequisites are explicit
- **Readiness gates**: Issues cannot progress without satisfying constraints

Beads uses Dolt as its storage layer, giving versioned history for free.

### Dolt-Backed History

Dolt provides versioned table storage:

- **Workflow state is versioned**: Every change to issue state is recorded
- **Auditability**: History can be queried, branched, and merged
- **Evidence records**: QA verdicts, handoff records, and decisions are durable

This means The Firm's operational history is as recoverable as its code history.

### `.firm/` Artifacts

The `.firm/` directory is the structured artifact root:

| Directory | Purpose | Lifecycle |
|-----------|---------|-----------|
| `.firm/intake/` | Engagement entry and qualification | `new` → `approved` → `in_delivery` |
| `.firm/engagements/` | Active work state and plans | Mirrors intake once approved |
| `.firm/artifacts/` | Cross-cutting design and decision records | Immutable once accepted |

Artifacts are the source of truth for:

- Design decisions (what was decided and why)
- Handoff context (what changed, what risks remain)
- Verification requirements (what proof is required)
- Release readiness (what was verified)

## Data Flow

### Intake Flow

1. Request arrives (chat, file, or automation)
2. `intake_orchestrator` classifies and creates `.firm/intake/<eng>/intake.yml`
3. `client_partner` reviews and qualifies
4. On approval, intake moves to `.firm/intake/<eng>/` and engagement becomes active

### Execution Flow

1. Work is claimed from an approved issue (Beads)
2. Agent produces artifacts in `.firm/artifacts/<eng>/`
3. Handoff artifact created with `pi run handoff-state`
4. Issue state updated via `bd update`
5. Downstream agent verifies handoff before accepting

### Verification Flow

1. Engineering completes implementation
2. `test_engineer` executes verification plan
3. `qa_verifier` reviews evidence and issues verdict
4. `release_reviewer` makes go/no-go decision
5. Issue closed only after all gates pass

## Design Principles

### Separation of Concerns

- **Git**: Code and files
- **Beads**: Work items and state
- **Dolt**: Versioned workflow history
- **`.firm/`**: Structured artifacts and decisions

No single system tries to do everything. Each layer has a clear contract.

### Explicit Over Implicit

- State changes require explicit commands
- Handoffs require explicit artifacts
- Gate decisions require explicit review

This prevents silent drift and makes the system auditable.

### Immutability at Gates

Once an artifact is accepted at a gate (design lock, QA entry, release), it becomes immutable. New understanding requires new artifacts with versioned names.

## Extension Points

### Adding Roles

Create a new file in `.pi/agents/` following the existing pattern. Define:

- Role purpose and boundaries
- Input artifacts required
- Output artifacts produced
- Escalation paths

### Adding Artifact Types

Add templates to `.pi/templates/` and update relevant agent definitions to reference them.

### Adding Commands

Create a new directory under `.pi/commands/` with an `index.ts` entry point.

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Mixing artifact and code concerns | Artifacts should explain decisions, not contain implementation |
| Automatic Beads/artifact sync | Would hide important handoff decisions |
| Mutable artifacts after gates | Destroys audit trail and traceability |
| Bypassing `.firm/` for structured data | Scatters truth across chat and memory |

## Operational Implications

### Backup and Recovery

- Git history covers code and `.firm/` artifacts
- Dolt history covers workflow state
- Beads database can be cloned and branched like code

### Debugging

When something goes wrong, check in order:

1. Issue state in Beads (`bd show <id>`)
2. Engagement state in `.firm/engagements/<eng>/`
3. Artifact history in `.firm/artifacts/<eng>/`
4. Dolt history if workflow state seems incorrect

### Migration

The brownfield bootstrap creates an operating contract without full migration. See [brownfield-adoption.md](./brownfield-adoption.md) for details.

## See Also

- [runtime-agents.md](./runtime-agents.md) — Role structure and responsibilities
- [issue-workflow.md](./issue-workflow.md) — Issue state machine and handoffs
- [source-of-truth.md](./source-of-truth.md) — How truth is maintained across systems
- [AGENTS.md](/AGENTS.md) — Runtime agent doctrine
- [.firm/README.md](/.firm/README.md) — Artifact structure reference

---

**Rule**: The Firm's architecture is designed for traceability. If you cannot trace a decision to an artifact and an artifact to an issue, the system is not being used correctly.

**Rule**: Each layer owns its contract. Do not ask Git to track workflow state. Do not ask Beads to store file content. Use each system for what it does best.

**Rule**: When in doubt, create an artifact. Artifacts are cheap. Missing context is expensive.

---

## FAQ

**Q: Why not just use Git issues?**

Git issues lack the state machine, dependency tracking, and versioned history that AI-assisted work requires. Beads provides a control plane designed for this use case.

**Q: Can I use The Firm without Dolt?**

No. Dolt is the storage layer for Beads. The versioned workflow history is a core feature, not an optional add-on.

**Q: What happens if `.firm/` artifacts get out of sync with Beads?**

This is an operational error. The artifact-to-issue contract (documented in [issue-workflow.md](./issue-workflow.md)) must be maintained manually. Automatic synchronization would hide important handoff decisions.

**Q: Can I customize the agent definitions?**

Yes. The `.pi/agents/` files are your local runtime configuration. Customize them to match your team's needs, but maintain the office boundaries and handoff discipline.
