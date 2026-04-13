# 02 - Architecture

> **Overview:** The Firm's layered architecture and component boundaries.
> **Note:** This document describes a four-layer model. The file name is retained for continuity with earlier drafts and links.

---

## Layered Model

The Firm is built in four interacting layers:

```
┌─────────────────────────────────────────────────┐
│  Layer D — Governance & Knowledge               │
│  Memory, decisions, patterns, standards          │
│  .firm/memory/ .firm/templates/                  │
├─────────────────────────────────────────────────┤
│  Layer C — Orchestration & Workflows             │
│  Archon-compatible YAML, DAG execution,          │
│  approval gates, artifact handoff                │
│  .firm/workflows/ .firm/agents/                  │
├─────────────────────────────────────────────────┤
│  Layer B — The Firm Core Product                 │
│  Fork identity, CLI, extension seams,            │
│  context management, model policy, defaults      │
│  .firm/config/ .firm/context/ .firm/commands/    │
├─────────────────────────────────────────────────┤
│  Layer A — Pi Runtime Substrate                  │
│  Sessions, tools, providers, TUI, agent loop     │
│  Pi core (upstream)                              │
└─────────────────────────────────────────────────┘
```

---

## Layer A — Pi Runtime Substrate

The native runtime layer provided by Pi (upstream).

**Provides:**
- Agent loop and session management
- Tool system (bash, read, write, edit, etc.)
- Model/provider registry
- TUI (Terminal UI)
- Extension SDK
- Compaction and context management

**Boundary:** This layer should stay small, stable, and mergeable with upstream. The Firm does not rewrite Pi internals — it extends them via the SDK and targeted plugin points.

---

## Layer B — The Firm Core Product

The Firm's own product layer on top of Pi.

**Provides:**
- Product identity (binary `firm`, package `@digi4care/the-firm`)
- The Firm SDK (contract between runtime and product)
- Context management (ContextProfile with type/scope/shape/lifecycle)
- Model policy (`[provider]/[model]` format with role aliases)
- Default templates and protocols
- CLI commands (`firm init`, `firm extract`, etc.)
- In-session commands (`/firm:extract`, `/firm:harvest`, etc.)
- Config directory `~/.the-firm/`

**Boundary:** The Firm SDK is the contract. Pi is the runtime underneath. Product features live in the SDK layer, not in Pi internals.

---

## Layer C — Orchestration & Workflows

Archon-compatible workflow engine built on The Firm SDK.

**Provides:**
- Archon-compatible YAML workflow definitions
- DAG execution semantics
- Approval/reject/rework nodes
- Artifact handoff between phases
- Loops and resumability
- Each node maps to an agent

**Key decision:** Adopt Archon's workflow concepts directly. Don't reinvent. Build the execution engine on The Firm SDK. Any Archon workflow must work in The Firm. The Firm adds extras (context profiles, model policy, templates) as layers on top.

---

## Layer D — Governance & Knowledge

The Firm's unique differentiator — the "firm" in The Firm.

**Provides:**
- Durable memory (decisions, patterns, errors, standards)
- Communication templates (intake brief, plan document, handoff brief, review findings, ADR, error capture)
- Artifact lifecycle (ephemeral → session → durable → archive, with explicit promote/demote)
- Navigation-driven discovery
- MVI compliance (<200 lines, <30s scannable)

**Boundary:** This layer is what makes The Firm more than a coding agent. It provides the professional-firm posture: structured intake, governed execution, durable knowledge, repeatable delivery.

---

## How the Layers Interact

```
User input
    ↓
Layer D: Classify work, determine engagement type
    ↓
Layer C: Route to workflow, orchestrate phases
    ↓
Layer B: Manage context, apply model policy, load templates
    ↓
Layer A: Execute via agent loop, tools, sessions
    ↓
Results flow back up through layers
    ↓
Layer D: Capture decisions, patterns, errors → durable memory
```

---

## Reference Model

| Reference | Role in The Firm |
|-----------|-----------------|
| **Pi (upstream)** | Runtime substrate (Layer A) |
| **The Firm SDK** | Contract between layers (Layer B) |
| **Archon** | Workflow mechanics (Layer C) |
| **OpenAgentsControl** | Context management patterns (Layer B/D) |
| **oh-my-pi** | Capability reference (selective adoption) |
