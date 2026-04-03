# Planning with Files

Manus-style file-based planning for complex tasks in oh-my-pi.

## Overview

Use persistent markdown files as your "working memory on disk." This skill implements the context engineering principles from Manus to organize and track progress on complex tasks.

## The Core Pattern

```
Context Window = RAM (volatile, limited)
Filesystem     = Disk (persistent, unlimited)

→ Anything important gets written to disk.
```

## Quick Start

### 1. Initialize Planning Files

```bash
# Using the init script
~/.pi/agent/skills/planning-with-files/scripts/init-session.sh "my-project"

# Or manually copy templates
cp ~/.pi/agent/skills/planning-with-files/templates/*.md ./
```

This creates three files:
- `task_plan.md` - Phases, progress, decisions
- `findings.md` - Research, discoveries
- `progress.md` - Session log, test results

### 2. Check for Previous Session (Optional but Recommended)

**Option A: TypeScript (Recommended for oh-my-pi)**

```bash
# Using tsx
npx tsx ~/.pi/agent/skills/planning-with-files/scripts/session-catchup.ts "$(pwd)"
```

**Option B: Python (Cross-platform)**

```bash
python3 ~/.pi/agent/skills/planning-with-files/scripts/session-catchup.py "$(pwd)"
```

### 3. Enable Automation Hook (Optional)
python3 ~/.pi/agent/skills/planning-with-files/scripts/session-catchup.py "$(pwd)"
```

```bash
python3 ~/.pi/agent/skills/planning-with-files/scripts/session-catchup.py "$(pwd)"
```

### 3. Enable Automation Hook (Optional)

```bash
mkdir -p ~/.pi/agent/hooks/post
cp ~/.pi/agent/skills/planning-with-files/hooks/planning-automation.ts \
   ~/.pi/agent/hooks/post/
```

The hook provides:
- Automatic session catchup on startup
- Progress notifications when planning files are updated
- Completion check when session ends

## Critical Rules

1. **Create Plan First** - Never start without `task_plan.md`
2. **The 2-Action Rule** - After 2 view/browser/search ops, write findings
3. **Read Before Decide** - Re-read plan before major decisions
4. **Update After Act** - Mark phases complete, log errors
5. **Log ALL Errors** - Build knowledge, prevent repetition
6. **Never Repeat Failures** - Track attempts, mutate approach

## The 3-Strike Error Protocol

```
ATTEMPT 1: Diagnose & Fix
  → Identify root cause
  → Apply targeted fix

ATTEMPT 2: Alternative Approach
  → Try different method/tool
  → NEVER repeat exact same action

ATTEMPT 3: Broader Rethink
  → Question assumptions
  → Consider updating plan

AFTER 3 FAILURES: Escalate to User
```

## The 5-Question Reboot Test

| Question | Answer Source |
|----------|---------------|
| Where am I? | Current phase in task_plan.md |
| Where am I going? | Remaining phases |
| What's the goal? | Goal statement in plan |
| What have I learned? | findings.md |
| What have I done? | progress.md |

## Files

| File | Purpose | When to Update |
|------|---------|----------------|
| `task_plan.md` | Phases, progress, decisions | After each phase |
| `findings.md` | Research, discoveries | After ANY discovery |
| `progress.md` | Session log, test results | Throughout session |

## Scripts

- `init-session.sh` - Initialize all planning files
- `check-complete.sh` - Verify all phases complete
- `session-catchup.py` - Recover context from previous session

## Hook (oh-my-pi Native)

`planning-automation.ts` provides:
- **session_start** → Automatic catchup
- **tool_result** → Progress notifications
- **agent_end** → Completion check

## When to Use

**Use for:**
- Multi-step tasks (3+ steps)
- Research tasks
- Building/creating projects
- Tasks spanning many tool calls

**Skip for:**
- Simple questions
- Single-file edits
- Quick lookups

## Integration with oh-my-pi

- Session storage: `~/.pi/agent/sessions/*.jsonl`
- Hook directory: `~/.pi/agent/hooks/post/`
- Skill location: `~/.pi/agent/skills/planning-with-files/`

## Version History

- **v2.0.0** - Migrated to oh-my-pi, added native hook
- **v1.0.0** - Original OpenCode version

## License

ISC - Part of omp-library

## See Also

- [Manus Context Engineering Principles](references/manus-principles.md)
- [Real Examples](references/examples.md)
- [oh-my-pi Documentation](https://github.com/can1357/oh-my-pi)
