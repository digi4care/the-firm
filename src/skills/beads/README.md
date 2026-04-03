# Beads Skill for OMP/Pi

A comprehensive skill for using [beads](https://github.com/steveyegge/beads) (bd) issue tracking with OMP/Pi coding agent.

## What This Skill Does

This skill teaches the OMP coding agent how to use bd effectively for:
- **Multi-session work tracking** — Persistent memory across conversation compactions
- **Dependency management** — Graph-based issue relationships
- **Session handoff** — Writing notes that survive context resets
- **Molecules and wisps** (v0.34.0+) — Reusable work templates and ephemeral workflows

## Installation

The skill lives at `.pi/skills/beads/` in the project root.

```bash
# Verify skill is present
ls .pi/skills/beads/SKILL.md

# Verify bd CLI is installed
bd --version
```

## File Structure

```
.pi/skills/beads/
├── SKILL.md                 # Main skill file (loaded by OMP)
├── AGENTS.md                # Maintenance guide (this file)
├── README.md                # Human-readable docs
├── adr/                     # Architectural Decision Records
│   └── 0001-bd-prime-as-source-of-truth.md
└── resources/               # Detailed documentation (loaded on demand)
    ├── BOUNDARIES.md
    ├── CLI_REFERENCE.md
    ├── DEPENDENCIES.md
    ├── INTEGRATION_PATTERNS.md
    ├── ISSUE_CREATION.md
    ├── MOLECULES.md
    ├── PATTERNS.md
    ├── RESUMABILITY.md
    ├── STATIC_DATA.md
    ├── TROUBLESHOOTING.md
    ├── WORKFLOWS.md
    ├── AGENTS.md
    ├── ASYNC_GATES.md
    ├── CHEMISTRY_PATTERNS.md
    └── WORKTREES.md
```

## Key Concepts

### bd vs todo_write

| Use bd when... | Use todo_write when... |
|-----------------|------------------------|
| Work spans multiple sessions | Single-session tasks |
| Complex dependencies exist | Linear step-by-step work |
| Need to resume after weeks | Just need a quick checklist |
| Knowledge work with fuzzy boundaries | Clear, immediate tasks |

### The Dependency Direction Trap

`bd dep add A B` means **"A depends on B"** (B must complete before A can start).

```bash
# Want: "Setup must complete before Implementation"
bd dep add implementation setup  # CORRECT
# NOT: bd dep add setup implementation  # WRONG
```

### Surviving Compaction

When the agent's context gets compacted, conversation history is lost but bd state survives. Write notes as if explaining to a future agent with zero context:

```bash
bd update issue-123 --notes "COMPLETED: JWT auth with RS256
KEY DECISION: RS256 over HS256 for key rotation
IN PROGRESS: Password reset flow
NEXT: Implement rate limiting"
```

## Requirements

- [bd CLI](https://github.com/steveyegge/beads) installed and in PATH
- Git repository (optional — use `BEADS_DIR` + `--stealth` for git-free operation)
- Initialized database (`bd init` in project root — humans do this)

## License

MIT (same as beads)
