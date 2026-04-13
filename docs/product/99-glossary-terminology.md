# 99 - Glossary: Terminology

> **Reference:** Definitions of all terms used in The Firm documentation.

---

## Core Concepts

| Term | Definition |
|------|-----------|
| **The Firm** | A Pi-native governed AI work foundation for structured AI-assisted software delivery |
| **Pi** | The upstream coding agent (badlogic/pi-mono) that The Firm is built on |
| **The Firm SDK** | The contract layer between Pi runtime and The Firm product features |
| **Fork** | The Firm's relationship to Pi — a product fork with its own identity, binary, and direction |
| **Upstream** | badlogic/pi-mono — the original Pi repository |

---

## Product Objects

| Term | Definition |
|------|-----------|
| **Workflow** | An Archon-compatible YAML definition of a multi-step process with nodes, dependencies, and artifacts |
| **Agent** | A workflow node with identity, permissions, context needs, and output contract. Has frontmatter with defaults (template, model_role, skills). Three modes: primary (top-level), subagent (specialist, may delegate), leaf (executor, may NOT delegate) |
| **Template** | A Markdown communication protocol linked to workflow nodes (e.g., intake brief, review findings). Has frontmatter with name, version, priority, linked_phase |
| **Frontmatter** | YAML metadata at the top of a file defining its properties, dependencies, and behavior |
| **Context Profile** | Scoped context with 4 dimensions: Type, Scope, Shape, Lifecycle |
| **Model Policy** | Project-level configuration of `[provider]/[model]` references with role aliases and fallback chains |
| **Role** | A model alias (e.g., "creative", "fast", "thorough") that resolves to a specific provider/model |
| **Memory Artifact** | Promoted durable knowledge (decision, pattern, error capture, standard) |

---

## Context Management

| Term | Definition |
|------|-----------|
| **MVI** | Minimum Viable Information — files <200 lines, scannable in <30 seconds |
| **Navigation file** | `navigation.md` in each directory — the index of what's there |
| **Context type** | What kind of context: project, engagement, deliberation, execution, memory |
| **Context scope** | Who gets the context: which workflow, role, or phase |
| **Context shape** | In what form: full, summary, extract, reference |
| **Context lifecycle** | How long it lives: ephemeral, session, durable, archive |
| **Promote** | Make an artifact durable (with reason). Nothing is durable by default |
| **Demote** | Move a durable artifact to archive |
| **Template hierarchy** | workflow > agent > none — workflow template overrides agent default |

---

## Context Operations

| Term | Definition |
|------|-----------|
| **Extract** | Pull knowledge from a source (local, URL, GitHub, GitLab) into MVI-compliant context |
| **Harvest** | Collect loose notes/summaries into structured context + cleanup |
| **Capture** | Record a specific error, pattern, or decision into memory |
| **Compact** | Reduce a long file to MVI-compliant size while preserving core |
| **Organize** | Restructure loose files into type-based directories |
| **Map** | Show the `.firm/` directory structure |
| **Validate** | Check MVI compliance, navigation accuracy, and file integrity |

---

## File Structure

| Term | Definition |
|------|-----------|
| `.firm/` | Project-level The Firm directory containing agents, workflows, context, etc. |
| `~/.the-firm/` | User-level config directory (settings, auth, sessions) |
| `firm` | The Firm CLI binary |
| `firm-dev` | The Firm development binary |

---

## Integration

| Term | Definition |
|------|-----------|
| **Archon** | A workflow/harness system whose YAML format The Firm is compatible with |
| **Beads (bd)** | Dolt-backed issue tracker used for The Firm development |
| **OAC** | OpenAgentsControl — a reference project analyzed for context management patterns |
| **oh-my-pi** | A Pi fork used as a functional capability reference |

---

## Governance

| Term | Definition |
|------|-----------|
| **Approval gate** | A workflow node that requires human approval before proceeding |
| **Engagement** | A classified unit of work (feature, bug, research, architecture, content) |
| **Deliberation** | Structured pre-execution phase for clarification, brainstorming, and planning |
| **Structure template** | Default 8-section template for every agent (identity, context, permissions, model, workflow, delegation, errors, output) |
| **Skills dependency** | Optional frontmatter field (`skills:`) that restricts which skills are available to an agent, command, or workflow |
| **Delegation** | An agent calling another agent. `primary` and `subagent` modes may delegate; `leaf` mode may not |
| **Parallel delegation** | Calling multiple subagents simultaneously. Configured via `parallel_delegation` in agent frontmatter or `parallel_group` in workflow YAML |
| **Isolation** | How parallel agents are separated: `worktree` (git worktree), `tmp` (temp directory), or `none` |
