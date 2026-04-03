---
name: planning-with-files
description: File-based planning for complex tasks. Creates task_plan.md, findings.md, and progress.md as persistent working memory. Use when planning multi-step work, research tasks, or anything requiring >5 tool calls. Integrates with The Firm's .pi/firm/ artifact structure and Beads issue tracking.
---

# Planning with Files

Use persistent markdown files as your "working memory on disk."

The Firm requires explicit artifacts in `.pi/firm/` for handoffs and gate progression. This skill provides the planning infrastructure that makes those artifacts trustworthy.

## FIRST: Check for Previous Session

**Before starting work**, check for unsynced context from a previous session:

```bash
# Session recovery
python3 .pi/skills/planning-with-files/scripts/session-catchup.py "$(pwd)"
```

If catchup report shows unsynced context:
1. Run `git diff --stat` to see actual code changes
2. Read current planning files
3. Update planning files based on catchup + git diff
4. Then proceed with task

## Where Files Go

| Location | What Goes There |
|----------|-----------------|
| `.pi/firm/artifacts/` | The Firm gate artifacts (design docs, verification plans) |
| `.pi/firm/engagements/<id>/` | Engagement-specific planning |
| Project root (or `.pi/firm/`) | `task_plan.md`, `findings.md`, `progress.md` |

The planning files and The Firm artifacts are complementary — planning files track your thinking, `.pi/firm/` artifacts track the formal workflow state.

## Quick Start

Before ANY complex task:

1. **Create `task_plan.md`** — Use `templates/task_plan.md` as reference
2. **Create `findings.md`** — Use `templates/findings.md` as reference
3. **Create `progress.md`** — Use `templates/progress.md` as reference
4. **Re-read plan before decisions** — Refreshes goals in attention window
5. **Update after each phase** — Mark complete, log errors

## The Core Pattern

```
Context Window = RAM (volatile, limited)
Filesystem = Disk (persistent, unlimited)

→ Anything important gets written to disk.
```

## File Purposes

| File | Purpose | When to Update |
|------|---------|----------------|
| `task_plan.md` | Phases, progress, decisions | After each phase |
| `findings.md` | Research, discoveries | After ANY discovery |
| `progress.md` | Session log, test results | Throughout session |

## Critical Rules

### 1. Create Plan First

Never start a complex task without `task_plan.md`. Non-negotiable.

### 2. The 2-Action Rule

> "After every 2 view/browser/search operations, IMMEDIATELY save key findings to text files."

This prevents visual/multimodal information from being lost.

### 3. Read Before Decide

Before major decisions, read the plan file. This keeps goals in your attention window.

### 4. Update After Act

After completing any phase:
- Mark phase status: `in_progress` → `complete`
- Log any errors encountered
- Note files created/modified

### 5. Log ALL Errors

Every error goes in the plan file. This builds knowledge and prevents repetition.

```markdown
## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| FileNotFoundError | 1 | Created default config |
| API timeout | 2 | Added retry logic |
```

### 6. Never Repeat Failures

```
if action_failed:
    next_action != same_action
```

Track what you tried. Mutate the approach.

## The 3-Strike Error Protocol

```
ATTEMPT 1: Diagnose & Fix
  → Read error carefully
  → Identify root cause
  → Apply targeted fix

ATTEMPT 2: Alternative Approach
  → Same error? Try different method
  → Different tool? Different library?
  → NEVER repeat exact same failing action

ATTEMPT 3: Broader Rethink
  → Question assumptions
  → Search for solutions
  → Consider updating the plan

AFTER 3 FAILURES: Escalate
  → The Firm: Engineering → Architecture escalation
  → Create Beads item documenting the blocker
  → Explain what you tried, share the error, ask for guidance
```

## Beads Integration

Planning files are personal working memory. Beads are the canonical issue tracker.

| Activity | Planning File | Beads |
|----------|--------------|-------|
| Breaking down work | `task_plan.md` phases | `bd create` for each phase |
| Tracking progress | `progress.md` status | `bd update --status` |
| Logging blockers | `progress.md` errors | `bd create --type blocker` |
| Completing work | Mark phase complete | `bd update --status done` |

### Sync Pattern

```bash
# After updating task_plan.md with phases:
for phase in phases; do
  bd create "<phase title>" --description "<phase details>" --type task
done

# After completing a phase:
bd update <id> --status done --evidence "$(tail -5 progress.md)"
```

## Read vs Write Decision Matrix

| Situation | Action | Reason |
|-----------|--------|--------|
| Just wrote a file | DON'T read | Content still in context |
| Viewed image/PDF | Write findings NOW | Multimodal → text before lost |
| Browser returned data | Write to file | Screenshots don't persist |
| Starting new phase | Read plan/findings | Re-orient if context stale |
| Error occurred | Read relevant file | Need current state to fix |
| Resuming after gap | Read all planning files | Recover state |

## The 5-Question Reboot Test

If you can answer these, your context management is solid:

| Question | Answer Source |
|----------|---------------|
| Where am I? | Current phase in task_plan.md |
| Where am I going? | Remaining phases |
| What's the goal? | Goal statement in plan |
| What have I learned? | findings.md |
| What have I done? | progress.md |

## When to Use This Pattern

**Use for:**
- Multi-step tasks (3+ steps)
- Research tasks
- Building/creating projects
- Tasks spanning many tool calls
- Anything requiring organization

**Skip for:**
- Simple questions
- Single-file edits
- Quick lookups

## Templates

Copy these templates to start:

- `templates/task_plan.md` — Phase tracking
- `templates/findings.md` — Research storage
- `templates/progress.md` — Session logging

## Scripts

Helper scripts for automation:

- `scripts/init-session.sh` — Initialize all planning files
- `scripts/check-complete.sh` — Verify all phases complete
- `scripts/session-catchup.py` — Recover context from previous session

## Advanced Topics

- **Manus Principles:** See `references/manus-principles.md`
- **Real Examples:** See `references/examples.md`


## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "Fix this bug" | `systematic-debugging` |
| "Write a test" | `test-driven-development` |
| "Implement this feature" | TDD + implementation |
| "Single quick change" | Direct edit |
| "General question" | Direct answer |

## Error Handling

| Situation | Response |
|-----------|----------|
| Planning files corrupted | Re-create from templates, recover from git |
| Session catchup fails | Manual recovery: read git log + recent files |
| Context lost mid-task | Run 5-Question Reboot Test, re-read all files |
| Scope changes mid-plan | Update task_plan.md, sync Beads items |
| Phase blocked | Log in progress.md, create Beads blocker, escalate |

## Quick Tests

**Should trigger:**

- "Plan out this feature"
- "Break down this task"
- "Organize this research"
- "Multi-step project planning"
- "I need to track progress on this"

**Should not trigger:**

- "Fix this bug"
- "Write a test for X"
- "Quick one-line change"
- "What does this function do?"

## Anti-Patterns

| Don't | Do Instead |
|-------|------------|
| Use TodoWrite for persistence | Create task_plan.md file |
| State goals once and forget | Re-read plan before decisions |
| Hide errors and retry silently | Log errors to plan file |
| Stuff everything in context | Store large content in files |
| Start executing immediately | Create plan file FIRST |
| Repeat failed actions | Track attempts, mutate approach |
| Create files in skill directory | Create files in your project |

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **beads** | Issue tracking | Syncing plans to work items |
| **verification-before-completion** | Evidence before claims | Before marking phases done |
| **firm-front-desk** | Client routing | Before planning begins |
