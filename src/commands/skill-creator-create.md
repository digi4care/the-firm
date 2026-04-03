---
description: Create a new skill skeleton with dry-run support
---

# Skill Creator: Create

Create a new skill skeleton (SKILL.md + references) with dry-run by default.

## Usage

```
/skill-creator-create <request>
/skill-creator-create --confirm
/skill-creator-create --help
```

## Instructions

**FIRST**: If `$ARGUMENTS` contains `--help` or `-h`, show only the Usage section and stop.

1. Parse `$ARGUMENTS` as the request text (or ask user if empty)
2. Extract any provided fields from the request or ask user for:
   - triggers, workflow, error handling, tests, references
3. Call the plugin tool `skill-creator-create` with:
   - `request`: The skill request/description
   - `name`: (optional) Skill name (kebab-case)
   - `purpose`: (optional) Skill purpose
   - `triggers`: (optional) Array of trigger phrases
   - `negativeTriggers`: (optional) Array of negative triggers
   - `workflow`: (optional) Array of workflow steps
   - `errorHandling`: (optional) Array of error handling steps
   - `tests`: (optional) Object with test arrays
   - `references`: (optional) Array of reference files
   - `author`: (optional) Author name
   - `version`: (optional) Version (default 0.1.0)
   - `license`: (optional) License (default MIT)
   - `baseDir`: (optional) Base directory (default .pi/skills)
   - `dryRun`: (optional) Default true - set to false to actually write
   - `confirm`: (optional) Set to true to confirm and write
   - `overwrite`: (optional) Allow overwriting existing files

## Output

- Show planned files (paths + actions)
- If dryRun=false or confirm=true, actually create the files
- Return JSON with:
  - `dryRun`: Whether files were actually written
  - `skillDir`: Path to created skill directory
  - `plan`: The skill plan
  - `writes`: List of files to be/were created
