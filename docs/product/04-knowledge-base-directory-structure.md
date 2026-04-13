# 04 - Directory Structure

> **Overview:** The `.firm/` directory layout and naming conventions.

---

## Top-Level Structure

```
.firm/
├── agents/          ← all agent definitions
├── commands/        ← all slash commands
├── templates/       ← all communication templates
├── context/         ← all structured context
├── workflows/       ← all workflow YAMLs (Archon-compatible)
├── memory/          ← all durable knowledge
└── config/          ← project config (model policy, etc.)
```

**Principle:** One directory per type. No bundles, no shared refs, no cross-linking mechanisms. Everything findable by type.

---

## agents/

Agent definitions — each agent is a workflow node with identity, permissions, context needs, and output contract.

```
agents/
├── planner.md
├── builder.md
├── reviewer.md
└── copywriter.md
```

**Frontmatter example:**
```yaml
---
name: reviewer
description: "Code review specialist"
mode: primary | subagent | leaf
temperature: 0.1
model_role: thorough

permissions:
  bash:
    "*": deny
  read:
    "*": allow
  edit:
    "**/*.env*": deny
  task:
    "*": deny
    "contextscout": allow
    "test-engineer": allow
    "security-scanner": allow

context:
  - context/standards/code-quality.md
  - context/workflows/code-review.md

templates:                    # default templates (fallback)
  - review-findings

skills:                        # optional — restrict available skills
  - context7
  - code-review

output: review-findings        # what this agent produces

delegation:                    # which subagents this agent can call
  context: contextscout
  test: test-engineer
  security: security-scanner

parallel_delegation:           # call these simultaneously
  - [test, security]           # test + security run in parallel
---
```

**Agent modes:**

| Mode | What it can do | Example |
|------|---------------|---------|
| `primary` | Top-level agent, may delegate to subagents, may use approval gates | planner, orchestrator |
| `subagent` | Specialist, may delegate to other subagents | reviewer |
| `leaf` | Executor, may NOT delegate (no `task` tool) | coder-agent, contextscout, test-engineer |

**Delegation rules:**
- `primary` → may call subagents
- `subagent` → may call subagents
- `leaf` → may NOT delegate
- `firm validate` detects circular delegation chains

**Parallelism:**
- `parallel_delegation` in agent frontmatter — call multiple subagents simultaneously
- `parallel_group` in workflow YAML — run multiple phases simultaneously
- Parent waits for all parallel agents to complete before continuing
- Max parallel agents configurable in `config/settings.json` (default: 3)
- Isolation: `worktree` | `tmp` | `none` (configurable)

**Structure template (8 sections per agent):**
1. Identity (name, description, purpose)
2. Context needs (which context to load)
3. Permissions (what this agent may do — deny-all default)
4. Model preference (which model role)
5. Workflow (which steps this agent follows)
6. Delegation rules (when to delegate to other agents)
7. Error handling (what to do on failure)
8. Output contract (what this agent produces)

---

## commands/

Slash command definitions for in-session use.

```
commands/
├── review.md
└── deploy.md
```

All The Firm built-in commands use the `/firm:` prefix to avoid collisions.

**Frontmatter example:**
```yaml
---
name: firm:extract
description: "Extract knowledge from a source into context"
tags: [context, extract]
ai_required: true

skills:                        # optional
  - context7

dependencies:
  - subagent:contextscout
---
```

---

## templates/

Markdown communication templates linked to workflow nodes.

```
templates/
├── intake-brief.md
├── plan-document.md
├── handoff-brief.md
├── review-findings.md
├── adr.md
└── error-capture.md
```

**Default 6 templates** (initial release):

| Template | Purpose |
|----------|---------|
| intake-brief.md | New engagement intake |
| plan-document.md | Plan before building |
| handoff-brief.md | Phase/agent transitions |
| review-findings.md | Review results presentation |
| adr.md | Architecture decisions |
| error-capture.md | Recurring error documentation |

Templates are Markdown files that show how something should be created, submitted, handed off, reviewed, approved, or rejected.

**Frontmatter example:**
```yaml
---
name: review-findings
description: "Standard review findings format"
version: 1.0.0
priority: critical
linked_phase: review
---
```

---

## context/

Structured project context — navigation-driven, MVI-compliant.

```
context/
├── navigation.md
├── standards/
│   ├── navigation.md
│   ├── code-quality.md
│   └── typescript.md
├── guides/
│   ├── navigation.md
│   └── resuming-sessions.md
└── project-intelligence/
    ├── navigation.md
    └── technical-domain.md
```

**Principles:**
- Every directory has a `navigation.md` as discovery entry point
- All files <200 lines (MVI compliance)
- Function-based subdirectories: standards/, guides/, examples/
- Lazy loading — agents read only what they need
- Navigation files index only durable items (max ~20 per file)

---

## workflows/

Archon-compatible YAML workflow definitions with The Firm extensions.

```
workflows/
├── plan-build-review.yaml
├── idea-to-release.yaml
└── seo-blog-pipeline.yaml
```

Workflows refer to agents, templates, and context by name:

```yaml
phases:
  review:
    agent: reviewer           # → agents/reviewer.md
    template: review-findings  # → templates/review-findings.md (overrides agent default)
    model_role: thorough       # → resolved via config/model-policy.json
```

**Template hierarchy:** workflow > agent > none
- Workflow defines template → use that
- Workflow has no template → use agent's default
- Agent has no template → free form (agent decides)

**Frontmatter example:**
```yaml
---
name: plan-build-review
description: "Standard delivery workflow"
version: 1.0.0
archon_compatible: true

agents:
  - planner
  - builder
  - reviewer

templates:
  - intake-brief
  - plan-document
  - handoff-brief
  - review-findings

skills:                        # optional — skills for all agents in this workflow
  - code-review

engagement_types:
  - feature
---
```

---

## memory/

Durable knowledge — only items explicitly promoted from ephemeral.

```
memory/
├── navigation.md
├── decisions/
│   ├── navigation.md
│   ├── adr-001-monorepo.md
│   └── adr-002-sdk-extension-seam.md
├── patterns/
│   ├── navigation.md
│   └── error-handling-standard.md
└── errors/
    ├── navigation.md
    └── db-connection-timeout.md
```

**Lifecycle:**

| Stage | What | Default |
|-------|------|---------|
| Ephemeral | Gone after session | ✅ All new artifacts |
| Session | Lives during the active project/session lifecycle | — |
| Durable | Permanent, curated | Only via explicit promote |
| Archive | Exists but is not actively loaded | Via demote |

**Nothing is durable by default.** Promote criteria: used in multiple sessions, explains a relevant decision, prevents a recurring error, defines a team standard.

---

## config/

Project-level configuration.

```
config/
├── model-policy.json
├── settings.json
└── schemas/          ← JSON Schema definitions for type safety
    ├── agent.schema.json
    ├── workflow.schema.json
    ├── template.schema.json
    ├── command.schema.json
    └── model-policy.schema.json
```

**model-policy.json:**
```json
{
  "model_policy": {
    "roles": {
      "creative": { "preferred": "anthropic/claude-opus", "fallback": ["anthropic/claude-sonnet"] },
      "fast": { "preferred": "anthropic/claude-sonnet", "fallback": ["openai/gpt-4o-mini"] },
      "thorough": { "preferred": "anthropic/claude-opus", "fallback": ["openai/gpt-4o"] }
    },
    "default": "anthropic/claude-sonnet"
  }
}
```

**Model hierarchy:** workflow > agent > model-policy.json > default

| Level | What defines it | Example |
|-------|----------------|---------|
| Workflow `model:` | Direct model, no role | `model: openai/gpt-4o` |
| Workflow `model_role:` | Role resolved via policy | `model_role: thorough` |
| Workflow `model_fallback:` | Override global fallback | `model_fallback: [openai/gpt-4o]` |
| Agent `model_role:` | Default role for this agent | `model_role: thorough` |
| model-policy.json | Global role definitions + fallbacks | See above |
| `default` | Fallback when nothing specified | `anthropic/claude-sonnet` |

**Resolution order:**
1. Workflow has `model:` → use that (+ `model_fallback:` if present)
2. Workflow has `model_role:` → resolve via policy (or `model_fallback:`)
3. Agent has `model_role:` → resolve via policy
4. Nothing → `default` from model-policy.json

---

## User Config Directory

```
~/.the-firm/
├── config/          ← user settings
├── auth/            ← API keys
├── models/          ← model config
└── sessions/        ← session history
```

Separate from Pi's `~/.pi/`. The Firm has its own identity and config.

---

## Schemas (Type Safety)

All frontmatter/YAML is validated against JSON Schema definitions in `config/schemas/`.

**Every file references its schema:**
```yaml
---
$schema: ../schemas/agent.schema.json
name: reviewer
...
---
```

**`firm validate` checks:**
- ✅ MVI compliance (<200 lines)
- ✅ Navigation files up-to-date
- ✅ Schema compliance (frontmatter validated)
- ✅ Cross-references (agent exists, template exists)
- ✅ model_role known in model-policy.json
- ✅ skills exist
- ✅ `[provider]/[model]` format correct

**Runtime:** TypeBox (`@sinclair/typebox`) generates the same schemas for SDK use. One source of truth.
