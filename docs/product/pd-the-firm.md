# Product Description — The Firm

## Executive Summary

The Firm is a **Pi-native governed AI work foundation**.

It builds on Pi as the native runtime substrate and helps teams **create, execute, and evolve project-specific AI systems** for planning, execution, and collaboration.

The Firm does not aim to be a generic workflow engine for every coding tool.
It remains **Pi-native by design**. Where workflow mechanics are already strong
and proven, The Firm adopts them. Where runtime capabilities are already
valuable, The Firm selectively takes them over. Its own differentiation lies
elsewhere: **context management, governance, communication protocols, model
policy, and durable memory**.

The product ambition is to make AI work feel less like a loose collection of improvised agent interactions, and more like work delivered by a professional firm.

---

## 1. The Problem

Most AI work systems lose quality as work becomes larger, more ambiguous, and more collaborative.

The common failure modes are:
- **Prompt drift** — every new situation is solved by adjusting prompts rather than improving structure;
- **Planning collapse** — systems jump too quickly from vague input to a concrete plan;
- **Context overload** — too much context, wrong context, or outdated context is carried into the wrong phase;
- **Communication ambiguity** — handoffs between entities are inconsistent and easily misinterpreted;
- **Workflow mismatch** — work is shaped around what the tool happens to offer rather than what the project needs;
- **Weak model policy** — the same model choices are used for very different tasks;
- **Memory loss** — standards, decisions, patterns, and previous errors are not managed as durable operational assets.

These problems are especially visible in larger, more complex, or organizationally sensitive projects.

### Glossary

| Term | Definition |
|------|------------|
| **MVI** | **Minimum Viable Information** — a readability standard that guarantees context files are scannable. Limits: ≤200 lines, ≤30 second scan time, ≤7 sections, ≤3 nesting levels. |
| **ContextProfile** | An object with 4 dimensions that define context: **Type** (what), **Scope** (who), **Shape** (form), **Lifecycle** (duration). See §6.2. |
| **Archon** | A YAML-based workflow orchestration format. The Firm is backwards-compatible with Archon workflows. |
| **Promote** | The explicit elevation of an artifact from ephemeral to durable status. Never happens automatically. |
| **navigation.md** | Auto-generated index file per `.firm/` subdirectory, contains only durable items, max 20 entries. |

---

## 2. The Core Insight

The central thought behind The Firm is:

> quality should not primarily depend on ad-hoc prompt editing.

Instead, quality should come from explicit product layers:
- context management,
- structured workflows,
- Markdown-based communication protocols and templates,
- role-aware deliberation,
- model choice and fallback policy,
- and durable, governed memory.

The Firm treats AI work as something that must be **designed, governed, and operationalized** — not just prompted.

---

## 3. What The Firm Is

The Firm is:
- a **product fork** with its own identity, binary, release line, and product boundaries;
- a **Pi-native runtime foundation** for AI work;
- a platform for creating **project-specific workflows, agents, and protocols**;
- a system that treats **context as a first-class managed asset**;
- a governed memory layer for **standards, decisions, patterns, errors, and references**;
- a product that supports **professional, repeatable, low-ambiguity collaboration** between humans and AI entities.

Practically, coding is the first major use case today. Strategically, The Firm
is not limited to coding. The same foundation should also be able to support
other governed AI work: brainstorming, planning, architecture, review,
research, SEO/content workflows, and communication-intensive collaboration.

---

## 4. What The Firm Is Not

The Firm is not:
- just a renamed Pi;
- just a coding agent with more features;
- just a workflow engine;
- just a knowledge base;
- just a swarm/subagent system;
- a platform-agnostic orchestration layer for every coding tool on the market.

The Firm remains **Pi-native**. It does not dissolve its identity into generic compatibility.

---

## 5. Product Principles

### 5.1 Pi-native by design
The Firm builds on Pi as the native substrate for runtime, tools, sessions, UI, extensibility, and model execution. The execution engine builds on **The Firm's own SDK**.

### 5.2 Adopt what already works
Where workflow mechanics are already strong and proven, The Firm adopts them. **Archon-style workflow mechanics are the baseline** — The Firm does not reinvent anything that already works well.

### 5.3 Archon backwards compatibility
The Firm workflows are **Archon-compatible**. This means:
- Archon YAML workflows work directly in The Firm
- The Firm adds its own layers (templates, context profiles, model policy)
- The Archon community can share workflows that The Firm can use directly

### 5.4 Differentiate on governance, not novelty
The Firm differentiates on governance, context, protocols, memory, and role-aware collaboration — not on inventing new machinery where existing patterns are already solid.

### 5.5 Project-need first
Workflows, agents, and templates arise from the needs of the project, not from what the underlying harness happens to offer.

### 5.6 Deliberation before execution
For large or ambiguous work, planning quality depends on structured deliberation before execution begins.

### 5.7 Templates are protocols
Templates are not just content helpers; they are communication contracts. In The Firm, templates are **Markdown-based standards** that show how something should be written, submitted, handed off, reviewed, approved, or rejected.

### 5.8 Context is a managed system resource
Context must be intentionally scoped, shaped, handed off, stored, and reset.

### 5.9 Durable memory matters
The Firm preserves the institutional memory needed to improve future AI and human work.

### 5.10 Opinionated defaults, fully overrideable
The Firm has an opinion about best practices. That opinion is embedded in the defaults (structure templates, model roles, context profiles). But the user can always say: "I do it differently."

---

## 6. Product Layers

### 6.1 Pi-native Foundation Layer
This layer provides the native substrate:
- runtime;
- tools;
- sessions;
- model/provider access;
- TUI/CLI integration;
- extension points;
- agent execution.

This layer remains small, stable, and mergeable. **The Firm SDK** is the contract between this layer and the layers above.

### 6.2 Context Management Layer
This layer manages which context is available to which entity, in what form, in which phase.

Context is managed as a **ContextProfile** with four dimensions:
- **Type** — what kind of information is it? (`project` | `engagement` | `deliberation` | `execution` | `memory`)
- **Scope** — who may see it? (`workflow` | `role` | `phase` — combinable with AND/OR)
- **Shape** — in what form? (`full` | `summary` | `extract` | `reference`)
- **Lifecycle** — how long to keep? (`ephemeral` | `session` | `durable` | `archive`)

The interface is formally defined in the PRD (Appendix A: The Firm SDK Specification).

### 6.3 Workflow Layer
This layer defines how work is structured and executed. The Firm uses **Archon-compatible workflow mechanics** as the baseline:
- YAML workflows,
- DAG execution,
- loops,
- approval and reject/rework patterns,
- artifacts as handoff,
- isolation and resumability.

**Every node in a workflow is an agent.** Agents get a structure template as default (identity, context needs, permissions, model preference, workflow, delegation rules, error handling, output contract).

The Firm adds its own layers on top of the Archon baseline:
- context profiles per phase,
- model policy per phase,
- templates linked to nodes,
- approval gates via The Firm SDK.

### 6.4 Capability Layer
This layer contains higher-value execution capabilities that improve the Pi-native substrate. The Firm selectively adopts concepts from forks such as oh-my-pi:
- subagent/swarm patterns,
- usable runtime features,
- model-role concepts,
- productive extension seams.

### 6.5 Protocol and Template Layer
This layer standardizes how entities communicate and hand off work.

**Default templates for the initial release:**

| Template | Purpose | Used by |
|----------|---------|---------|
| Intake brief | New engagement intake | Orchestration layer |
| Plan document | Plan before building | Planning/deliberation phase |
| Handoff brief | Hand off work between phases/agents | Workflow phase transitions |
| Review findings | Present review results | Review phase |
| ADR | Capture architecture decisions | Memory/governance layer |
| Error capture | Document recurring errors | Memory/governance layer |

These templates are **linked to Archon workflow nodes** as protocols.

### 6.6 Model Policy Layer
This layer manages model choice and fallback behavior per project, workflow, phase, and role.

Model references always use the format **`[provider]/[model]`**. Roles are aliases that refer to these:

```json
{
  "model_policy": {
    "roles": {
      "creative": { "preferred": "anthropic/claude-opus", "fallback": ["anthropic/claude-sonnet"] },
      "fast": { "preferred": "anthropic/claude-sonnet", "fallback": ["openai/gpt-4o-mini"] },
      "thorough": { "preferred": "anthropic/claude-opus", "fallback": ["openai/gpt-4o"] }
    }
  }
}
```

Workflows refer to roles or directly to `[provider]/[model]`.

### 6.7 Durable Memory and Governance Layer
This layer preserves and curates operational knowledge.

Nothing becomes durable unless it is **explicitly promoted**. The lifecycle is:

| Status | Meaning |
|--------|---------|
| Ephemeral | Gone after session (default) |
| Session | Lives as long as the active project/session lifecycle runs |
| Durable | Permanent, curated, in navigation |
| Archive | Still exists, not actively loaded |

Promote criteria: has it been used more than once? Does it explain a decision? Does it prevent an error? Is it a standard?

---

## 7. Deliberation as a First-Class Capability

An important product gap in current AI systems is that they often only help after a task is already well-defined.

The Firm explicitly supports **deliberation workflows** before execution:
- intake and clarification,
- brainstorming,
- scoping,
- alignment,
- role-based planning,
- pre-execution approval,
- decision-making.

This is especially important for larger projects, where planning is not the output of a single agent or single prompt.

---

## 8. Dynamic Workflows

The Firm supports dynamic workflows shaped by actual project needs:

- brainstorming workflows,
- planning workflows,
- SEO/content workflows,
- architecture workflows,
- implementation workflows,
- validation and review workflows,
- delivery/reporting workflows.

These workflows are not hardcoded assumptions about what AI work is. They are configurable and composable from the foundation.

**Archon-import**: Existing Archon workflows can be directly imported and extended with The Firm's own layers.

---

## 9. Meta-Creation: Building AI for AI

A distinguishing ambition of The Firm is that it not only executes AI workflows — it also helps build them.

The Firm supports first-class creation of:
- new agents (from template or interactive wizard),
- new workflows (from template, Archon import, or interactive wizard),
- new templates,
- new communication protocols,
- new model policies.

Every new agent gets a **structure template** as default with best-practice sections: identity, context needs, permissions, model preference, workflow, delegation rules, error handling, output contract. Everything is overrideable.

---

## 10. Project Directory Structure

The Firm organizes everything **by type** — simple, findable, no cognitive debt:

```
.firm/
├── agents/          ← all agent definitions
├── commands/        ← all slash commands
├── templates/       ← all communication templates
├── context/         ← all structured context
├── workflows/       ← all Archon-compatible YAML workflows
├── memory/          ← all durable knowledge
└── config/          ← project configuration (model policy, etc.)
```

Workflows refer to agents/templates/context **by name**. One place per type.

Config directory: `~/.the-firm/` — own identity, separate from Pi.

---

## 11. CLI Commands

The Firm offers two types of commands:

**Agent commands** (within a session, via TUI):
- `/firm:extract`
- `/firm:capture`
- `/firm:compact`
- `/firm:harvest`
- `/firm:map`
- `/firm:validate`

**CLI commands** (outside session, scriptable):

| Command | AI needed? | What it does |
|---------|------------|--------------|
| `firm init` | No | Scaffold .firm/ |
| `firm map` | No | Show structure |
| `firm validate` | No | Check MVI compliance |
| `firm extract` | Yes | Distill knowledge from sources |
| `firm harvest` | Yes | Summaries → durable context |
| `firm capture` | Yes | Recognize errors/patterns |
| `firm compact` | Yes | Create shortened version |
| `firm scan` | Yes | Analyze project |

**`firm extract` supports multiple source types:**
```bash
firm extract --from docs/api.md                        # local file
firm extract --from https://react.dev/reference        # URL
firm extract --from github.com/vercel/next.js          # GitHub repo
firm extract --from gitlab.com/myorg/myproject         # GitLab repo
firm extract --from github.com/vercel/next.js \
  --focus packages/app
```

---

## 12. Strategic Positioning

The Firm positions itself as:
- **Pi-native** at the substrate level,
- **Archon-compatible** in workflow mechanics,
- **selectively capability-rich** through targeted adoption of valuable ideas,
- and **distinguished** by governance, context, protocols, memory, and professional work posture.

---

## 13. Product Promise

The product promise is not just better automation. It is:
- more structure,
- clearer collaboration,
- less ambiguity,
- stronger context discipline,
- better model fit for every type of work,
- and more durable organizational learning.

The result feels like collaborating with a professional firm rather than improvising with a swarm of partially aligned AI agents.

---

## 14. Closing Statement

The Firm is a Pi-native governed AI work foundation for creating project-specific workflows, agents, communication protocols, and memory systems, so that AI-assisted work becomes structured, repeatable, and professionally legible.
