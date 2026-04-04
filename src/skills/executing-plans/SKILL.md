---
name: executing-plans
description: "Execute a written implementation plan task by task with verification checkpoints. Use when you have a plan file to work through, need to implement step-by-step, or are resuming planned work. Keywords - execute plan, implement plan, follow plan, resume plan, plan execution."
allowed-tools: Bash Read Write Edit
---

# Executing Plans

Load a plan, review critically, execute task by task, verify each step, report when complete.

## When to Use

Use me when:
- you have a written implementation plan (markdown, issue body, or design doc) and need to execute it
- resuming work from a previous session where a plan was created
- converting a design doc or spec into working code step-by-step
- someone says "execute this plan", "implement this plan", "follow the plan"

Do not use me for:
- creating a new plan from scratch → use `writing-plans`
- brainstorming or designing → use `brainstorming`
- debugging issues found during execution → use `systematic-debugging`
- reviewing code quality → use `review`

## Workflow

### Step 1: Load and Review Plan

1. **Read the plan file** — locate it:
   - **Beads issue body** (preferred — plan is tracked, traceable)
   - **`.pi/firm/plans/YYYY-MM-DD-<feature>.md`** (runtime artifact, linked to issue)
   - Conversation context (ephemeral, avoid for multi-session work)
2. **Review critically** — identify concerns, gaps, or ambiguities
3. **If concerns:** raise them with your partner BEFORE starting any work
4. **If no concerns:** proceed to execution

### Step 2: Setup

1. **Check git state** — are we on the right branch? Is the working directory clean?
2. **Read relevant code** — understand the current state of files you'll be changing
3. **Create a bd issue** for tracking: `bd create --title "Execute: [plan name]" --body "[summary]"`

### Step 3: Execute Tasks

For each task in the plan:

1. **Claim** — `bd update <id> --notes "STARTED: [task description]"`
2. **Implement** — follow the plan steps exactly
3. **Verify** — run tests, linters, or other checks as specified in the plan
4. **If verification fails:** stop, fix, re-verify. Do not skip.
5. **If blocked:** stop and ask. Do not guess.
6. **Mark done** — `bd update <id> --notes "COMPLETED: [task description]"`

### Step 4: Finalize

After all tasks complete and verified:

1. **Run full verification** — `bun test`, `bun run lint`, check build
2. **Review your changes** — `git diff` to confirm scope matches plan
3. **Commit** — specific files only, descriptive message referencing the plan
4. **Push** — `git push` to get changes to remote
5. **Close bd issue** — `bd close <id>`

## Error Handling

| Situation | Action |
|-----------|--------|
| Plan step is unclear | Stop. Ask for clarification. Do not guess intent. |
| Verification fails repeatedly | Stop. Debug with `systematic-debugging`. Do not skip. |
| Missing dependency or blocker | Stop. Report blocker. Ask how to proceed. |
| Plan references files that don't exist | Check if they need to be created. If unclear, ask. |
| Scope creep — find extra work needed | Note it, but don't execute it. Create a bd issue for follow-up. |
| Tests don't exist for the area | Note it. Consider writing tests first (TDD). Ask if unsure. |
| Git conflicts | Stop. Resolve conflicts carefully. Ask if unsure. |

## Rules

- **Follow the plan** — don't improvise. If the plan is wrong, fix the plan first.
- **Don't skip verification** — every check in the plan exists for a reason.
- **Stop when blocked** — asking for help is faster than guessing wrong.
- **No implementation on main** without explicit consent — use a branch.
- **Track progress** — use bd notes so context survives compaction.
- **Commit only your changes** — `git add <specific files>`, never `git add .`

## Quick Tests

Should trigger:
- "Execute this plan: [plan file or content]"
- "Implement the design we discussed"
- "Resume the plan from yesterday"
- "Follow the implementation steps in this issue"
- "Work through this checklist"

Should not trigger:
- "Write me a plan for this feature"
- "Brainstorm how to build this"
- "Debug why this test fails"
- "Review my code"

Functional:
- Loads a plan, creates tracking issue, executes task by task with verification
