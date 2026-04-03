---
description: Audit a SKILL.md for best-practice signals
---

# Skill Creator: Audit

Audit a SKILL.md for best-practice sections and calculate quality score.

## Usage

```
/skill-creator-audit <path-to-SKILL.md>
/skill-creator-audit --help
```

## Instructions

**FIRST**: If `$ARGUMENTS` contains `--help` or `-h`, show only the Usage section and stop.

1. Parse `$ARGUMENTS` to extract the path to SKILL.md (e.g., `.pi/skills/my-skill/SKILL.md`)
2. Read the file content using the Read tool
3. Call the plugin tool `skill-creator-audit` with:
   - `skillContent`: The full SKILL.md content
   - `description`: (optional) Additional context
   - `maxWords`: (optional) Default 2000
4. Parse the JSON response from the tool
5. Show the audit results including:
   - Word count and warnings
   - Quality score breakdown
   - Missing sections

## Output

- Show the audit JSON (formatted)
- Highlight missing sections (When to Use, Error Handling, Quick Tests, References)
- Show quality score and any warnings
- Suggest improvements for missing sections
