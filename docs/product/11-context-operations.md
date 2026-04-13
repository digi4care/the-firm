# Context Operations — The Firm

> Detailed specification of all context operations for The Firm CLI and in-session commands.

---

## Overview

Context operations manage the lifecycle of knowledge in The Firm: from raw input to structured, durable context.

```
Content flows from raw to structured:

extract ──→ new context from external source
harvest ──→ loose notes → structured context
capture ──→ incidental insight → structured capture
compact ──→ too long → MVI-compliant
organize ──→ messy → neatly organized by type

And validate/map are always available to check.
```

---

## Non-AI Operations (mechanical)

### `firm init`
Scaffold `.firm/` with default structure.

```bash
firm init                     # creates .firm/ with type-based directories
firm init --with-templates    # also copies 6 default templates
```

Result:
```
.firm/
├── agents/
├── commands/
├── templates/
├── context/
├── workflows/
├── memory/
└── config/
```

### `firm map`
Show `.firm/` structure — what is there, where is it, how large.

```bash
firm map                      # entire .firm/
firm map context/             # specific folder
firm map --counts             # show file counts per type
```

Output:
```
.firm/
├── agents/          3 files
├── commands/        2 files
├── templates/       6 files
├── context/
│   ├── standards/   4 files
│   └── guides/      2 files
├── workflows/       2 files
├── memory/
│   ├── decisions/   3 files
│   ├── patterns/    1 file
│   └── errors/      2 files
└── config/          2 files

Total: 27 files
```

### `firm validate`
Check rules — do files exist? MVI compliant? navigation.md up-to-date?

```bash
firm validate                 # entire .firm/
firm validate context/        # specific folder
firm validate --strict        # also check unused files
```

Checks:
- [ ] All files <200 lines (MVI)
- [ ] navigation.md exists in each directory
- [ ] navigation.md references match actual files
- [ ] No orphaned files (not in navigation)
- [ ] No broken cross-references
- [ ] Templates linked to workflow nodes exist
- [ ] Agent references in workflows exist

Output:
```
✅ context/standards/ — 4 files, all MVI compliant
⚠️ memory/decisions/ — adr-003.md is 245 lines (exceeds 200)
❌ context/guides/navigation.md — references missing file "hooks.md"
✅ templates/ — 6 files, all linked to workflows
```

---

## AI Operations (requires a model)

### `firm extract`
Extract knowledge from a source → MVI-compliant context file.

```bash
# Sources
firm extract --from docs/api.md
firm extract --from ./src/
firm extract --from https://react.dev/reference/react/hooks
firm extract --from github.com/vercel/next.js
firm extract --from gitlab.com/org/project
firm extract --from github.com/org/repo --focus packages/core

# Options
firm extract --from ... --target context/development/
firm extract --from ... --name nextjs-hooks
firm extract --from ... --dry-run
```

Source behavior:

| Source | What happens |
|--------|--------------|
| Local file | Read, AI distills |
| Local folder | Scan all files, AI distills |
| URL | Fetch page, AI distills |
| GitHub repo | Shallow clone to `.tmp/`, analyze, result in context |
| GitHub + `--focus` | Clone, analyze only specified path |
| GitLab repo | Same as GitHub |

Result: always an MVI-compliant context file in `.firm/context/`:
```
→ Cloning next.js...
→ Analyzing docs/app/...
→ Generated: .firm/context/development/nextjs-app-router.md (142 lines)
→ Updated: .firm/context/navigation.md
```

### `firm harvest`
Collect loose notes/summaries → structured context + cleanup.

```bash
firm harvest                  # scans .tmp/ and workspace
firm harvest .tmp/            # specific folder
firm harvest SESSION-auth.md  # specific file
```

Process:
1. Scan for summaries (OVERVIEW.md, SESSION-*.md, CONTEXT-*.md, .tmp/ files)
2. AI analyzes content
3. Generates MVI-compliant context files in `.firm/context/`
4. Shows preview and asks for approval
5. Removes originals after approval
6. Updates navigation.md

### `firm capture`
Record an error/pattern/decision.

```bash
firm capture error "DB connection timeout under heavy load"
firm capture pattern "Always validate input with Zod"
firm capture decision "RS256 over HS256 for key rotation"
```

Targets:
- `error` → `.firm/memory/errors/`
- `pattern` → `.firm/memory/patterns/`
- `decision` → `.firm/memory/decisions/`

### `firm compact`
Make a long file shorter — preserve core, remove noise.

```bash
firm compact context/long-analysis.md
firm compact context/long-analysis.md --dry-run
firm compact context/              # all files in folder
```

Result: overwrites original with compact MVI-compliant version.

### `firm organize`
Restructure loose files → type-based folders.

```bash
firm organize .tmp/
firm organize .tmp/ --dry-run
```

Process:
1. Scan files
2. AI classifies each file (standard, guide, pattern, etc.)
3. Shows proposed moves
4. After approval: move to correct `.firm/` subdirectory
5. Updates navigation.md

---

## In-Session Commands (slash commands)

The same operations are available as slash commands within a firm session. All commands use the `/firm:` prefix to avoid name collisions with Pi skills and other extensions.

| Slash command | CLI equivalent |
|---------------|---------------|
| `/firm:extract from <source>` | `firm extract --from <source>` |
| `/firm:harvest [path]` | `firm harvest [path]` |
| `/firm:capture <type> <description>` | `firm capture <type> <description>` |
| `/firm:compact <file>` | `firm compact <file>` |
| `/firm:organize <path>` | `firm organize <path>` |
| `/firm:map [path]` | `firm map [path]` |
| `/firm:validate [path]` | `firm validate [path]` |
| `/firm:init` | `firm init` |

---

## Design Principles

1. **MVI always** — every result is <200 lines, <30s scannable
2. **Approval for destructive actions** — always ask before deleting/overwriting
3. **Navigation always up-to-date** — update navigation.md after every operation
4. **Dry-run available** — preview without writing for all AI operations
5. **Multi-source** — extract supports local, URL, GitHub, GitLab
6. **Headless compatible** — CLI commands work without TUI (scriptable)
