---
name: planning-with-beads
description: Plan and track work through Beads. The canonical skill for breaking down work into bd issues, tracking progress, and knowing where artifacts go. Beads is always the tracker — files are only for ephemeral scratch. Use when starting multi-step work, research, or anything needing >5 tool calls. Keywords - plan, beads, track, scratch, findings, progress, bd.
---

# Planning with Beads

**Beads is the canonical tracker. This skill is a scratchpad, not a replacement.**

Everything that constitutes tracked work (tasks, plans, blockers, progress) goes through Beads (`bd`). This skill handles only ephemeral working memory — the notes, discoveries, and intermediate findings that happen during a session but don't warrant their own issue.

## The One Rule

> If it's trackable work, it belongs in Beads. If it's a finding, discovery, or note that helps you think — write it to the scratchpad.

## Where Things Go

| What | Where | Why |
|------|-------|-----|
| Work items, tasks, plans | **Beads** (`bd create`) | Doctrine #12: no classified work outside Beads |
| Blockers | **Beads** (`bd create --type blocker`) | Doctrine #6: traceability is mandatory |
| Progress tracking | **Beads** (`bd update`) | Beads is the source of truth |
| Gate artifacts | **`.pi/firm/artifacts/`** | Formal workflow documents |
| Implementation plans | **`.pi/firm/plans/`** | Runtime artifacts, linked to Beads issue |
| Ephemeral research notes | **`.pi/firm/scratch.md`** | Session scratchpad |
| Session handoff | **`.pi/firm/handoff.md`** | Between-session context |

## What Goes in the Scratchpad

The scratchpad (`.pi/firm/scratch.md`) is for things that:
- Help you think through a problem
- Capture intermediate research results
- Store links, references, or discoveries found during exploration
- Are useful NOW but don't need permanent tracking

**Examples:**
- "Tried approach X, doesn't work because Y"
- "Found relevant code in src/lib/auth.ts:45-60"
- "Dependency Z has known issue, see https://..."
- "Three possible approaches: A (fast), B (safe), C (balanced)"

## The 2-Action Rule

> After every 2 significant view/search operations, save key findings.

This prevents information loss during context compaction. Write findings to:
- **Beads** if they represent trackable work
- **Scratchpad** if they're ephemeral notes

## The 3-Strike Error Protocol

```
ATTEMPT 1: Diagnose & Fix
  → Read error carefully
  → Identify root cause
  → Apply targeted fix

ATTEMPT 2: Alternative Approach
  → Same error? Try different method
  → NEVER repeat exact same failing action

ATTEMPT 3: Broader Rethink
  → Question assumptions
  → Search for solutions

AFTER 3 FAILURES: Escalate
  → bd create --type blocker
  → Explain what you tried, share the error, ask for guidance
```

## When to Use This Skill

**Use for:**
- Research that produces intermediate findings
- Exploratory work with discoveries worth capturing
- Sessions where context compaction is a risk
- Multi-step work that needs breaking down into Beads issues

**Do NOT use for:**
- Tracking work → use `bd create`
- Writing implementation plans → use `writing-plans`
- Executing plans → use `executing-plans` or `subagent-driven-development`
- Tracking progress → use `bd update`
- Logging blockers → use `bd create --type blocker`
- Single quick changes → just do it

## Error Handling

| Situation | Response |
|-----------|----------|
| Scratchpad corrupted | Recreate it — it's ephemeral, nothing critical lost |
| Context lost mid-task | `bd show <id>` to recover, scratchpad for re-orienting |
| Scope changes mid-work | Update Beads issue, scratchpad captures the why |
| Can't decide if something is trackable | When in doubt, `bd create` — Beads is cheap |

## Quick Tests

**Should trigger:**
- "Plan out this feature"
- "Break down this task"
- "I need to track progress"
- "Organize this research"
- "Where does this artifact go"

**Should not trigger:**
- "Fix this bug" → `systematic-debugging`
- "Write a test" → `test-driven-development`
- "Quick one-line change" → just do it
- "Write an implementation plan" → `writing-plans`

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Create task_plan.md / findings.md / progress.md | Use `bd` for tracking |
| Shadow-track work in files | Beads is the only tracker |
| Use TodoWrite for persistence | Use `bd` |
| Start work without a Beads issue | `bd create` first |
| Store plans in `.local/` or project root | Use `.pi/firm/plans/` |
| Treat scratchpad as permanent storage | It's ephemeral — important stuff goes to Beads |
| Create files in the skill directory | Create files in project `.pi/firm/` |

## References

- `design/the-firm/THE_FIRM_DOCTRINE.md` — Doctrine rules referenced in this skill
- `design/the-firm/THE_FIRM_ISSUE_TRACKER_MODEL.md` — Beads taxonomy and lifecycle

## Related Skills

| Skill | Purpose |
|-------|---------|
| **beads** | Issue tracking — the canonical system |
| **writing-plans** | Create implementation plans (`.pi/firm/plans/`) |
| **executing-plans** | Execute plans step by step |
| **subagent-driven-development** | Execute plans with subagents |
| **verification-before-completion** | Evidence before claims |
