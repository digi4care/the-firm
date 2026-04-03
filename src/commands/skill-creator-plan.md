---
description: Draft a skill plan without writing files
---

# Skill Creator: Plan

Draft a structured skill plan from a request. No files are written.

## Usage

```
/skill-creator-plan <request>
/skill-creator-plan --help
```

## Instructions

**FIRST**: If `$ARGUMENTS` contains `--help` or `-h`, show only the Usage section and stop.

1. If `$ARGUMENTS` is empty, ask user for a one-line request
2. Call the plugin tool `skill-creator-plan` with:
   - `request`: The user's request text
   - `name`: (optional) Skill name in kebab-case
   - `purpose`: (optional) Skill purpose/goal
   - `triggers`: (optional) Array of trigger phrases
   - `negativeTriggers`: (optional) Array of negative triggers
   - `workflow`: (optional) Array of workflow steps
   - `errorHandling`: (optional) Array of error handling steps
   - `tests`: (optional) Object with shouldTrigger, shouldNotTrigger, functional arrays
   - `references`: (optional) Array of reference file names
3. Parse the JSON response
4. Present the plan output

## Output

- Return the plan JSON with:
  - `name`: Proposed skill name
  - `purpose`: Skill purpose
  - `descriptionDraft`: Generated description
  - `triggers`, `negativeTriggers`: Trigger lists
  - `workflow`: Workflow steps
  - `errorHandling`: Error handling steps
  - `tests`: Test phrases
  - `references`: Reference files
  - `missing`: List of required fields not provided
  - `defaultsApplied`: Fields filled with defaults
