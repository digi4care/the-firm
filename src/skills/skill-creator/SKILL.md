---
name: skill-creator
description: Create, audit, and optimize Pi skills using quality-first workflow with dry-run, quality gates, and structured references. Use when users ask to build, improve, audit, or refactor a skill. Uses skill-creator-plan, skill-creator-audit, skill-creator-create, and skill-creator-optimize plugin tools. Do not trigger for generic Pi Q&A, extension questions, or unrelated coding tasks.
allowed-tools: Bash Read Write Edit
---

# Skill Creator

**META-SKILL** - Create, audit, and optimize Pi skills with quality-first process.

## Plugin Tools

This skill uses plugin tools registered by `src/extensions/skill-creator.ts`:

| Tool | Purpose |
|------|---------|
| `skill-creator-plan` | Draft skill plan without writing files |
| `skill-creator-audit` | Score SKILL.md against quality rubric |
| `skill-creator-create` | Generate new skill skeleton |
| `skill-creator-optimize` | Update existing skills with quality gates |

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Create a new skill for X" | Use skill-creator-create |
| "Optimize this SKILL.md" | Use skill-creator-optimize |
| "Audit this skill" | Use skill-creator-audit |
| "Improve skill triggering" | Use skill-creator-optimize with triggers |
| "Add references to a skill" | Use skill-creator-optimize with references |
| "Refactor this skill" | Use skill-creator-optimize (merge mode) |
| "Plan a skill for X" | Use skill-creator-plan |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "How do extensions work?" | `/skill:pi-encyclopedia` |
| "What is the ExtensionAPI?" | `/skill:pi-encyclopedia` |
| "Fix this React bug" | Direct debugging |
| "General programming question" | Direct help |
| "How do I configure providers?" | `/skill:pi-encyclopedia` |
| "Create AGENTS.md" | `/skill:agents-md-generator` |

## The Iron Law

```
DRY-RUN FIRST, CONFIRM BEFORE APPLY, QUALITY MUST NOT REGRESS
```

## Workflow

### Mode: Plan

1. Parse request for skill purpose, triggers, workflow
2. Call `skill-creator-plan` tool with request and any provided fields
3. Return structured plan without writing files
4. Await confirmation before create

### Mode: Audit

1. Read existing `SKILL.md`
2. Call `skill-creator-audit` tool with skillContent
3. Parse quality score and missing sections
4. Return diagnostics and improvement suggestions
5. Offer to optimize

### Mode: Create

1. Call `skill-creator-create` tool with:
   - request, name, purpose, triggers, negativeTriggers
   - workflow, errorHandling, tests, references
   - author, version, license, baseDir
   - dryRun (default true), confirm, overwrite
2. If dryRun=true: show planned writes
3. If confirm=true or dryRun=false: actually create files
4. Return results

### Mode: Optimize

1. Read existing skill
2. Call `skill-creator-optimize` tool with:
   - skillDir path
   - description, triggers, workflow, errorHandling, tests, references
   - version, replaceSections, enforceQualityGate, allowQualityDrop
   - dryRun (default true), confirm
3. Quality gate blocks if score drops (unless allowQualityDrop=true)
4. Return before/after scores and changes

## Quality Safeguards

| Safeguard | Default |
|-----------|---------|
| Dry-run | `true` |
| Quality gate | `true` |
| Confirm before apply | `true` |
| Path safety | enforced |

## Pi Plugin Tools

The skill-creator provides these plugin tools:

| Tool | Purpose |
|------|---------|
| `skill-creator-plan` | Draft skill plan without writing files |
| `skill-creator-audit` | Score SKILL.md against quality rubric |
| `skill-creator-create` | Generate new skill skeleton |
| `skill-creator-optimize` | Update existing skills with quality gates |

## Pi Skill Structure

Every Pi skill must have:

```
.pi/skills/<skill-name>/
├── SKILL.md              # Main skill file (required)
└── references/           # Deep content (optional)
    ├── <topic>.md
    └── registry.json     # Reference index
```

### SKILL.md Required Sections

| Section | Purpose |
|---------|---------|
| Frontmatter | name, description, allowed-tools |
| When to Use | Trigger phrases and actions |
| When NOT to Use | Negative triggers, route to |
| Workflow | Ordered execution steps |
| Error Handling | Failure cases and responses |
| Quick Tests | should/should-not trigger |
| References | Links to deep content |
| Related Skills | Cross-skill handoffs |

### Frontmatter Format

```yaml
---
name: skill-name
description: One-line description with keywords for matching.
allowed-tools: Bash Read Write Edit
---
```

## Error Handling

| Situation | Response |
|-----------|----------|
| Missing required input | Ask one targeted question with safe default |
| Invalid path | Block and explain constraint |
| Quality score regression | Block apply, return before/after metrics |
| Missing references | Create minimal compliant files |
| Dry-run requested | Show planned changes, await confirmation |
| Plugin tool fails | Return error message, suggest fix |

## Quick Tests

**Should trigger:**

- "Create a new skill for incident postmortem writing"
- "Optimize this SKILL.md to improve triggering"
- "Audit this skill against best practices"
- "Add error handling to my skill"
- "Plan a skill for database design"

**Should not trigger:**

- "How do I configure Pi providers?"
- "Fix this React state bug"
- "What is the TUI API?"
- "Create AGENTS.md for my project"

**Functional:**

- "Refactor `.pi/skills/my-skill/SKILL.md` with dry-run first"
- "Create skill with workflow: collect data, validate, output"
- "Optimize skill-creator with triggers for Pi commands"

## Cross-Skill Handoffs

| If user asks | Route to |
|--------------|----------|
| "How do extensions work?" | `/skill:pi-encyclopedia` |
| "Find a package for X" | `/skill:pi-ecosystem` |
| "Create AGENTS.md" | `/skill:agents-md-generator` |
| "Analyze a GitHub repo" | `/skill:repo-analysis` |

## References

- `references/pi-sdk-reference.md` - Pi SDK frontmatter spec and patterns
- `references/quality-rubric.md` - Scoring dimensions and gate policy
- `references/templates.md` - Input templates for create/optimize
- `references/troubleshooting.md` - Common issues and fixes
- `references/workflow-playbook.md` - Execution flow for each mode

## Pi SDK Compliance

This skill follows Pi SDK standards:

| Standard | Implementation |
|----------|---------------|
| Name format | `skill-creator` (lowercase + hyphens) |
| Description | Includes keywords + purpose |
| Allowed tools | Space-delimited: `Bash Read Write Edit` |
| Plugin tools | Registered via `src/extensions/skill-creator.ts` |

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **pi-encyclopedia** | Pi documentation | Learning about Pi features |
| **pi-ecosystem** | Package discovery | Finding existing skills/packages |
| **agents-md-generator** | AGENTS.md creation | Project context files |
| **repo-analysis** | GitHub repo analysis | Analyzing repositories |

## Commands

| Command | Description |
|---------|-------------|
| `/skill-creator-plan <request>` | Draft skill plan |
| `/skill-creator-audit <path>` | Audit SKILL.md |
| `/skill-creator-create <request>` | Create new skill |
| `/skill-creator-optimize <skill-dir>` | Optimize existing skill |
