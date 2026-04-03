---
name: slides
description: Create strategic HTML presentations with Chart.js, design tokens, responsive layouts, copywriting formulas, and contextual slide strategies.
argument-hint: "[topic] [slide-count]"
metadata:
  author: claudekit
  version: "1.0.0"
---

# Slides

Strategic HTML presentation design with data visualization.

<args>$ARGUMENTS</args>

## When to Use

- Marketing presentations and pitch decks
- Data-driven slides with Chart.js
- Strategic slide design with layout patterns
- Copywriting-optimized presentation content

## When NOT to Use

- Simple text-only slides (use Google Slides/Keynote instead)
- Collaborative real-time editing needed
- Complex animation sequences beyond CSS transitions

## Subcommands

| Subcommand | Description | Reference |
|------------|-------------|-----------|
| `create` | Create strategic presentation slides | `references/create.md` |

## References (Knowledge Base)

| Topic | File |
|-------|------|
| Layout Patterns | `references/layout-patterns.md` |
| HTML Template | `references/html-template.md` |
| Copywriting Formulas | `references/copywriting-formulas.md` |
| Slide Strategies | `references/slide-strategies.md` |

## Routing

1. Parse subcommand from `$ARGUMENTS` (first word)
2. Load corresponding `references/{subcommand}.md`
3. Execute with remaining arguments

## Error Handling

- **Missing subcommand**: Default to `create` with full arguments
- **Unknown subcommand**: List available subcommands and suggest `create`
- **Empty topic**: Prompt user for presentation topic and goal

## Quick Tests

```bash
# Create a pitch deck
slides create "AI Analytics Platform" 10

# Verify references exist
ls references/{create,layout-patterns,html-template,copywriting-formulas,slide-strategies}.md
```
