---
status: active
description: "Protocol for starting a new session: discover context, find active work, resume or begin."
owner: The Firm Architecture Team
created: 2026-04-09
review-cadence: quarterly
---

# Session Start Protocol

## Purpose

Every session begins by understanding the current state. This protocol ensures
no context is lost between sessions and the agent picks up exactly where the
last session left off.

## Steps

### 1. Load Project Context

Check for `.firm/navigation.md` and read the index. Load relevant knowledge
areas based on the task at hand (max 3-5 files).

### 2. Discover Active Work

Check `.firm/operations/workflows/instances/` for any workflow instances with
status `in-progress`. These represent active work streams.

For each active instance:
- Run `kb-workflow resume <name>` to get a cross-session continuity summary
- Note the current phase and its status
- Review completed decisions from prior phases
- Check for deferred backlog items that are due for the current phase
- Review gate criteria for the current phase

If stale instances are found (run `kb-workflow stale`), report them to the user.
### 3. Check Pending Items

- Look for `.firm/specs/` with status `active` — these may need implementation
- Check `.firm/errors/` for any known issues
- Review any `TODO` markers in recent `.firm/` content

### 4. Resume or Begin

**If active work exists:** Resume the highest-priority active workflow instance.
Confirm with the user before proceeding.

**If no active work:** Ask the user what they want to work on. Suggest
available specs or known gaps based on the discovery above.

### 5. Establish Tracking

For any new work, create a workflow instance via `kb-workflow create` if a
suitable template exists. Otherwise, proceed ad-hoc but capture decisions in
`.firm/` as they happen.

## Error Handling

- If `.firm/` does not exist, run `kb-init` first
- If navigation.md is missing, run `kb-setup` to regenerate
- If workflow instances are corrupt, report the error and suggest `kb-compact`

## Notes

This is a protocol, not a workflow. It has no phases that complete over time.
It executes once at session start and informs what happens next.
