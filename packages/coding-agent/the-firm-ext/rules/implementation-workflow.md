---
alwaysApply: true
---

# Rule: Implementation Planning Workflow

When a task requires 3+ steps or involves multi-file changes:

For any complex implementation:
- Phase 1: Design first (architecture, types, patterns)
- Phase 2: Write executable plan with `writing-plans` skill (per phase, TDD, bite-sized)
- Phase 3: Execute with `planning-with-files` skill (track on filesystem)
- One phase at a time. Don't plan phase 2 until phase 1 is built and tested.

## Beads + Git

Per task:
1. `bd create "[phase-N] Task description" --type task --priority 2`
2. Build, test, commit
3. `bd close <id>`

After each phase:
1. `git pull --rebase`
2. `bd dolt push`
3. `git push`

Rules:
- Only add your own files (no `git add .`)
- Work is NOT complete until `git push` succeeds
- File issues for remaining work at session end

For simple tasks (single file, <5 steps): skip the workflow, just do it.
