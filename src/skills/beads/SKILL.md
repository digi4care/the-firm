---
name: beads
description: >
  Dolt-powered issue tracker for multi-session work with dependencies and persistent
  memory across conversation compaction. Use when work spans sessions, has blockers,
  or needs context recovery after compaction. Trigger with "create task", "what's
  ready", "track this work", "resume after compaction".
allowed-tools: Bash Read Write Edit
version: "0.62.0"
author: "Steve Yegge <steve.yegge@gmail.com>"
license: "MIT"
tags: [issue-tracking, task-management, multi-session, dependencies]
---

# Beads - Persistent Task Memory for AI Agents

Graph-based issue tracker that survives conversation compaction. Provides persistent memory for multi-session work with complex dependencies.

## When to Use Me

Use me when:

- work spans multiple sessions or conversation compaction cycles
- tasks have complex dependencies (blocks, depends-on, related-to)
- context recovery is needed after compaction — `bd list --status in_progress` then `bd show <id> --long`
- multi-session feature development needs persistent state
- work needs to survive agent restarts, context resets, or session boundaries
- The Firm requires issue-first execution with traceable state
- create task
- what's ready
- track this work
- resume after compaction
- create issue
- bd create
- bd ready
- track dependencies
- claim work

Do not use me for:

- <add negative triggers>

## When NOT to Use Me

Do not use me for:
- single-session linear tasks — use the built-in `todo_write` tool instead
- ephemeral checklists that do not need to survive compaction
- simple file edits with no workflow state
- direct implementation work that does not require tracking or dependency management

**Decision test**: "Will I need this context in 2 weeks?" YES = bd, NO = `todo_write`.

## Workflow

1. ### Step 1: Verify Prerequisites
2. ```bash
3. bd --version  # Requires v0.60.0+
4. If `bd` is not found, it needs to be installed first. If `database not found`, run `bd init <prefix>` in project root (humans do this, not agents).
5. ### Step 2: Find Unblocked Work
6. bd ready --json
7. Returns work items that are unblocked and ready to start.
8. ### Step 3: Claim and Start Work
9. bd show <id> --long    # Get full context before starting
10. bd update <id> --claim --json  # Claim atomically
11. ### Step 4: Work and Add Notes
12. Add notes as you work — this is critical for compaction survival. Write notes as if explaining to a future agent with zero context:
13. bd update <id> --notes "COMPLETED: JWT auth with RS256
14. KEY DECISION: RS256 over HS256 for key rotation
15. IN PROGRESS: Password reset flow
16. NEXT: Implement rate limiting
17. ### Step 5: Complete Work
18. bd close <id> --reason "Implemented with refresh tokens" --json
19. ### Step 6: Sync State
20. bd dolt push  # Push to Dolt remote (if configured)
21. ### CLI Reference
22. **Run `bd prime`** for AI-optimized workflow context (auto-loaded by hooks).
23. **Run `bd <command> --help`** for specific command usage.
24. Essential commands: `bd ready`, `bd create`, `bd show`, `bd update`, `bd close`, `bd dolt push`
25. Append `--json` to any command for structured output. Use `bd show <id> --long` for extended metadata.
26. Status icons: `○` open `◐` in_progress `●` blocked `✓` closed `❄` deferred
27. ### Common Patterns
28. **Track a multi-session feature:**
29. bd create "OAuth integration" -t epic -p 1 --json
30. bd create "Token storage" -t task --deps blocks:oauth-id --json
31. **Recover after compaction:**
32. bd list --status in_progress --json
33. **Discover work mid-task:**
34. bd create "Found bug" -t bug -p 1 --deps discovered-from:<current-id> --json
35. Verify prerequisites: bd --version (requires v0.60.0+)
36. Claim and start: bd show <id> --long then bd update <id> --claim --json
37. Work and add notes for compaction survival: bd update <id> --notes
38. Complete work: bd close <id> --reason
39. Sync state: bd dolt push

## Error Handling

| Error | Fix |
|-------|-----|
| `database not found` | `bd init <prefix>` in project root |
| `not in a git repository` | `git init` first, or use `BEADS_DIR` + `--stealth` for git-free operation |
| `disk I/O error (522)` | Move `.beads/` off cloud-synced filesystem |
| Status updates lag | Use server mode: `bd dolt start` |

See `resources/TROUBLESHOOTING.md` for full details.

## Quick Tests

Should trigger:

- Create a task for this feature and track it across sessions.
- What work is ready to start?
- I need to resume this work after compaction.
- Track dependencies between these issues.
- I need persistent context that survives context resets.
- bd ready

Should not trigger:

- Add a quick checklist for this single edit.
- Just fix this one bug, no tracking needed.
- Remind me about this in 5 minutes.

Functional:

- Creates issues with `bd create` and returns structured JSON.
- Finds unblocked work with `bd ready`.
- Claims work atomically with `bd update --claim`.
- Writes compaction-surviving notes with `bd update --notes`.
- Closes issues with reasons for audit trail.
- Syncs to Dolt remote with `bd dolt push`.
- Creates issues with bd create and returns structured JSON
- Finds unblocked work with bd ready
- Claims work atomically with bd update --claim

## Advanced Features

| Feature | CLI | Resource |
|---------|-----|----------|
| Molecules (templates) | `bd mol --help` | `resources/MOLECULES.md` |
| Chemistry (pour/wisp) | `bd pour`, `bd wisp` | `resources/CHEMISTRY_PATTERNS.md` |
| Agent beads | `bd agent --help` | `resources/AGENTS.md` |
| Async gates | `bd gate --help` | `resources/ASYNC_GATES.md` |
| Worktrees | `bd worktree --help` | `resources/WORKTREES.md` |

## References

- `references/references-boundaries.md`
- `references/references-cli-reference.md`
- `references/references-workflows.md`
- `references/references-dependencies.md`
- `references/references-issue-creation.md`
- `references/references-patterns.md`
- `references/references-resumability.md`
- `references/references-troubleshooting.md`
- `references/references-molecules.md`
- `references/references-chemistry-patterns.md`
- `references/references-agents.md`
- `references/references-async-gates.md`
- `references/references-worktrees.md`
- `references/references-static-data.md`
- `references/references-integration-patterns.md`

## Operational Notes

### Version Compatibility

If `bd --version` reports newer than the skill version, the skill may be stale. Run `bd prime` for current CLI guidance — it auto-updates with each bd release and is the canonical source of truth.

### DRY via bd prime

Never duplicate CLI documentation in this skill. `bd prime` outputs AI-optimized workflow context and `bd <command> --help` provides specific usage. Both auto-update with bd releases. This skill should only contain decision frameworks, prerequisites, resource indices, and pointers to `bd prime` and `--help`.

### The Firm Integration

Beads is the canonical issue tracker for The Firm. All serious work must be tied to a Beads issue. Issue state outranks chat momentum — never infer completion from conversation alone.

Resumable notes are for legitimate session boundaries, not permission to stop while the next governed step is still actionable in the current session. If `NEXT` can be executed now from tools and repo context, continue working now and update Beads at the next truthful stopping point.
