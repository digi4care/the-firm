# Templates

Use these templates for consistent skill creation and optimization.

## Plan Input Template

When gathering requirements for a new skill:

```json
{
  "request": "Create a skill for <purpose>",
  "triggers": [
    "<phrase that should trigger>",
    "<another trigger phrase>"
  ],
  "workflow": [
    "Step 1: <action>",
    "Step 2: <action>",
    "Step 3: <action>"
  ],
  "errorHandling": [
    "If <condition>, then <response>",
    "If <condition>, then <response>"
  ],
  "tests": {
    "shouldTrigger": [
      "User prompt that should trigger skill",
      "Another triggering prompt"
    ],
    "shouldNotTrigger": [
      "User prompt that should NOT trigger",
      "Another non-triggering prompt"
    ],
    "functional": [
      "Full workflow test prompt"
    ]
  },
  "references": [
    "<topic-for-references>"
  ]
}
```

## SKILL.md Template

```markdown
---
name: <skill-name>
description: <One-line description with keywords for matching>
allowed-tools: <Bash Read Write Edit>
---

# <Skill Title>

**<ONE-LINE PURPOSE>** - <Brief explanation>.

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "<trigger phrase>" | <what to do> |
| "<trigger phrase>" | <what to do> |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "<non-trigger>" | <where to route> |
| "<non-trigger>" | <where to route> |

## Workflow

### Step 1: <Name>

1. <action>
2. <action>
3. <decision point>

### Step 2: <Name>

1. <action>
2. <action>

## Error Handling

| Situation | Response |
|-----------|----------|
| <failure case> | <how to handle> |
| <failure case> | <how to handle> |

## Quick Tests

**Should trigger:**
- "<triggering prompt>"
- "<triggering prompt>"

**Should not trigger:**
- "<non-triggering prompt>"
- "<non-triggering prompt>"

**Functional:**
- "<full workflow test>"

## References

- `references/<topic>.md` - <description>
- `references/<topic>.md` - <description>

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **<skill-name>** | <purpose> | <when> |
```

## Optimize Input Template

```json
{
  "skillDir": ".pi/skills/<skill-name>",
  "description": "Improve <aspect> of the skill",
  "workflow": [
    "Updated step 1",
    "Updated step 2"
  ],
  "errorHandling": [
    "New error case: <case>"
  ],
  "dryRun": true,
  "confirm": false,
  "enforceQualityGate": true
}
```

## References Registry Template

```json
{
  "version": "1.0.0",
  "created": "<ISO-8601-date>",
  "last_updated": "<ISO-8601-date>",
  "registry_type": "reference_documents",
  "entries": [
    {
      "id": "<kebab-case-id>",
      "title": "<Human Readable Title>",
      "filename": "<filename>.md",
      "category": "<category>",
      "description": "<Brief description>",
      "keywords": ["keyword1", "keyword2"],
      "topics": ["topic1", "topic2"],
      "language": "en",
      "created": "<ISO-8601-date>",
      "last_updated": "<ISO-8601-date>"
    }
  ]
}
```

## Frontmatter Options

### allowed-tools Values

| Value | Tools Permitted |
|-------|-----------------|
| `Bash` | Shell commands only |
| `Read` | Read files only |
| `Write` | Write/create files |
| `Edit` | Edit existing files |
| `Bash Read` | Shell + read |
| `Bash Read Write Edit` | Full file access |

### Description Best Practices

```yaml
# Good: Specific with keywords
description: Design, create, audit, and optimize Pi skills using quality-first workflow. Keywords - skill, create, audit, optimize, template.

# Bad: Too vague
description: Helps with skills.
```

## Example: Complete Skill Creation

**Request:**

```
Create a skill for writing commit messages following conventional commits
```

**Plan Output:**

```json
{
  "name": "conventional-commits",
  "description": "Write conventional commit messages with proper format and scope. Keywords - commit, conventional, message, git, format.",
  "triggers": [
    "write a commit message",
    "help me commit",
    "conventional commit"
  ],
  "workflow": [
    "Analyze staged changes",
    "Determine type (feat/fix/docs/etc)",
    "Identify scope",
    "Write subject line",
    "Add body if needed"
  ],
  "errorHandling": [
    "No staged changes: ask what to commit",
    "Multiple unrelated changes: suggest splitting"
  ]
}
```

**Generated SKILL.md:**
(See full template above, filled in with plan values)
