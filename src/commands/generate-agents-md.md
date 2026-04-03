---
description: Generate a project-specific AGENTS.md file based on the project's stack, conventions, and requirements. Analyzes project structure and creates timeless guidelines for AI agents.
---

# /generate-agents-md

Generate a project-specific AGENTS.md file based on the project's stack, conventions, and requirements.

## When to Use

- Creating AGENTS.md for new projects
- Setting up agent guidelines
- Generating project context documentation

## When NOT to Use

- Updating existing AGENTS.md (edit manually)
- Creating skills or extensions (use skill-creator)

## Instructions

1. **Analyze project structure:**
   - Read `package.json`, `Cargo.toml`, `go.mod`, etc.
   - Check README.md, existing docs
   - Look at directory structure and config files

2. **Identify stack:**
   - Language, runtime, framework
   - Package manager (npm, bun, yarn, pnpm, cargo)
   - Build tools and task runners

3. **Generate AGENTS.md sections:**
   - Project overview
   - Stack table
   - CRITICAL rules (compact bullet format)
   - File locations
   - Development workflow
   - Commands reference
   - NOOIT DOEN section

## Template Structure

```markdown
# AGENTS.md

**Agent Guidelines** for [Project]

[Brief description]

---

## IMPORTANT: TIMELESS INFO ONLY

- NO current bugs
- NO temporary workarounds
- ONLY permanent truths

---

## Project Stack

| Component | Technology |
|-----------|------------|
| ... | ... |

---

## CRITICAL Rules

### Tool Usage
- NEVER use sed/cat
- MUST read files before editing
- ...

### Git
- ONLY commit YOUR changes
- NEVER `git add -A`
- ...

---

## Key File Locations

```

project/
├── ...

```

---

## Development Workflow

1. Make changes
2. Test locally
3. Create changeset
4. Commit
5. Build & pack

---

## NOOIT DOEN

- DO NOT ...
```

## Output

Write AGENTS.md to project root with analyzed content.
