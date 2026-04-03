---
description: Optimize an existing skill with structured updates
agent: general
---

# Skill Creator: Optimize

Update an existing SKILL.md with structured inputs and dry-run by default.

## Usage

```
/skill-creator-optimize <skill-dir>
/skill-creator-optimize --confirm
/skill-creator-optimize --help
```

## Instructions

**FIRST**: If `$ARGUMENTS` contains `--help` or `-h`, show only the Usage section and stop.

1. Treat `$ARGUMENTS` as the skill directory (relative path).
2. Ask the user which fields to update (description, workflow, error handling, tests, references).
3. Call the plugin tool `skill-creator-optimize` (not the slash command) with the provided updates and `dryRun: true`.
4. If `--confirm` is present, set `confirm: true` and `dryRun: false`.
5. Return planned writes and confirm before applying.

## Output

- Show planned changes and affected files.
- Confirm before writing changes.
