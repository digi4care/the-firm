# Pi SDK Reference for Skill Creators

> **Source:** `ai_docs/pi-frontmatter-reference.md` and `ai_docs/pi-sdk-architecture.md`

Essential Pi SDK knowledge for creating high-quality skills.

---

## Frontmatter Specification

### Required Keys

| Key | Type | Constraint | Description |
|-----|------|------------|-------------|
| `name` | `string` | 1-64 chars, `[a-z0-9-]`, must match dir | Skill identifier |
| `description` | `string` | Max 1024 chars | What the skill does and when to use |

### Optional Keys

| Key | Type | Description |
|-----|------|-------------|
| `license` | `string` | License name or path |
| `compatibility` | `string` | Max 500 chars, environment requirements |
| `metadata` | `object` | Arbitrary key-value mapping |
| `allowed-tools` | `string` | Space-delimited list of pre-approved tools |
| `disable-model-invocation` | `boolean` | Hide from system prompt, require `/skill:name` |

### Name Rules

**Allowed:** lowercase letters (`a-z`), digits (`0-9`), hyphens (`-`)

**NOT allowed:**

- Uppercase letters
- Underscores
- Spaces
- Leading/trailing hyphens
- Consecutive hyphens

| Valid | Invalid |
|-------|---------|
| `pdf-processing` | `PDF-Processing` |
| `data-analysis` | `data_analysis` |
| `code-review` | `-code` |
| `api-client` | `api--client` |

### Description Best Practices

- First sentence: what the skill does
- Include keywords for matching
- Mention when to use
- Stay under 1024 chars

```yaml
---
description: Web search via Brave Search API. Use for finding documentation, facts, or any web content. Keywords - search, web, documentation, brave.
---
```

### Allowed Tools

Space-delimited list of pre-approved tools:

```yaml
---
allowed-tools: Bash Read Write Edit
---
```

Common combinations:

- **Read-only:** `Bash Read`
- **Code modification:** `Bash Read Write Edit`
- **Full access:** `Bash Read Write Edit` (default if omitted)

---

## Standard Section Names

Use these section names for consistency with Pi ecosystem:

| Section | Purpose |
|---------|---------|
| `## When to Use` | Trigger phrases and actions |
| `## When NOT to Use` | Negative triggers, route to |
| `## Workflow` | Ordered execution steps |
| `## Error Handling` | Failure cases and responses |
| `## Quick Tests` | should/should-not trigger tests |
| `## References` | Links to deep content |
| `## Related Skills` | Cross-skill handoffs |

---

## Tool Registration (for Extensions)

Skills that need plugin tools must have a companion extension:

```typescript
// src/extensions/my-skill.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "my-skill-action",
    label: "My Skill: Action",
    description: "Does something useful",
    parameters: Type.Object({
      input: Type.String({ description: "Input value" }),
    }),
    execute: async (toolCallId, params, signal, onUpdate, ctx) => {
      // Check abort
      if (signal.aborted) throw new Error("Aborted");

      // Stream progress (optional)
      onUpdate?.({ content: [{ type: "text", text: "Processing..." }] });

      // Do work
      const result = await doWork(params);

      // Return (throw errors, don't return error content)
      return {
        content: [{ type: "text", text: result }],
        details: { input: params.input },
      };
    },
  });
}
```

### Tool Best Practices

1. **Throw errors** - Don't return error content
2. **Respect AbortSignal** - Check `signal.aborted`
3. **Stream progress** - Use `onUpdate` for long operations
4. **Use TypeBox** - `@sinclair/typebox` for schemas
5. **Return details** - Include metadata in `details` object

---

## Skill + Extension Bundle Pattern

When a skill needs plugin tools:

```
src/
├── extensions/
│   └── my-skill.ts          # Registers plugin tools
└── skills/
    └── my-skill/
        ├── SKILL.md         # Describes tool usage
        └── references/
            └── deep-content.md
```

In `openpi-manifest.json`:

```json
{
  "bundles": {
    "my-skill": {
      "description": "My skill with plugin tools",
      "resources": {
        "extensions": ["src/extensions/my-skill.ts"],
        "skill": "src/skills/my-skill"
      }
    }
  }
}
```

---

## Common Patterns

### Read-Only Skill

```yaml
---
name: documentation-lookup
description: Look up documentation for libraries. Keywords - docs, documentation, lookup, api.
allowed-tools: Bash Read
---

## When to Use
- "Look up docs for React"
- "What's the API for fetch?"

## Workflow
1. Search cached docs in ~/.ai_docs/
2. Return relevant sections
```

### Code Modification Skill

```yaml
---
name: code-refactor
description: Refactor code with safety checks. Use when restructuring code without changing behavior. Keywords - refactor, restructure, clean.
allowed-tools: Bash Read Write Edit
---

## When to Use
- "Refactor this function"
- "Clean up this module"
```

### Plugin Tool Skill

```yaml
---
name: skill-creator
description: Create, audit, and optimize Pi skills. Uses skill-creator-plan, skill-creator-audit, skill-creator-create, skill-creator-optimize plugin tools.
allowed-tools: Bash Read Write Edit
---

## Plugin Tools

| Tool | Purpose |
|------|---------|
| `skill-creator-audit` | Score SKILL.md against quality rubric |
| `skill-creator-create` | Generate new skill skeleton |

## Workflow
1. Call `skill-creator-audit` with skill content
2. Parse quality score
3. Suggest improvements
```

---

## Validation Checklist

Before publishing a skill:

- [ ] `name` matches parent directory
- [ ] `name` uses only `[a-z0-9-]`
- [ ] `name` is 1-64 chars
- [ ] `description` is under 1024 chars
- [ ] `description` includes keywords
- [ ] `allowed-tools` is space-delimited
- [ ] Has `## When to Use` section
- [ ] Has `## When NOT to Use` section
- [ ] Has `## Workflow` section
- [ ] Has `## Error Handling` section
- [ ] Has `## Quick Tests` section
- [ ] Deep content in `references/` directory
- [ ] Extension exists if plugin tools are mentioned

---

## Related Documentation

- [Agent Skills Specification](https://agentskills.io/specification)
- [Pi SDK Docs](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs)
- [Quality Rubric](./quality-rubric.md)
- [Templates](./templates.md)
