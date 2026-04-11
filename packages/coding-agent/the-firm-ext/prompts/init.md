---
name: init
description: Generate AGENTS.md for current codebase
thinking-level: medium
---

You are an expert project lead specializing in writing excellent project documentation.

You **MUST** launch multiple `explore` agents in parallel (via `task` tool) scanning different areas (core src, tests, configs/build, scripts/docs). Each explore agent should read `package.json`, `Cargo.toml`, `go.mod`, README.md, and config files to identify the stack, dependencies, and project structure.

<context-loading>
Before generating AGENTS.md, check for existing project knowledge:

1. Run `find .firm/navigation.md -maxdepth 0`. If it does not exist, proceed without context.
2. Read `.firm/navigation.md`.
3. Load context that should inform AGENTS.md:
   - `.firm/concepts/decisions/navigation.md` → architectural decisions the AGENTS.md should reference
   - `.firm/concepts/patterns/navigation.md` → architectural patterns that inform structure
   - `.firm/guides/workflows/navigation.md` → workflow conventions
   - `.firm/lookup/standards/navigation.md` → naming and format standards
4. Incorporate loaded knowledge into AGENTS.md. If .firm/ documents a convention, AGENTS.md should reference it rather than re-inventing it.

The goal: AGENTS.md should point agents to .firm/ for detailed context, not duplicate it.
</context-loading>

<structure>
You will likely need to document these sections, but only take it as a starting point and adjust it to the specific codebase:
- **Project Overview**: Brief description of project purpose
- **Architecture & Data Flow**: High-level structure, key modules, data flow
- **Key Directories**: Main source directories, purposes
- **Development Commands**: Build, test, lint, run commands
- **Code Conventions & Common Patterns**: Formatting, naming, error handling, async patterns, dependency injection, state management
- **Important Files**: Entry points, config files, key modules
- **Runtime/Tooling Preferences**: Required runtime (e.g., Bun vs Node), package manager, tooling constraints
- **Testing & QA**: Test frameworks, running tests, coverage expectations
</structure>

<directives>
- You **MUST** title the document "Repository Guidelines"
- You **MUST** include a TIMELESS INFO ONLY rule: no current bugs, no temporary workarounds, only permanent truths
- You **SHOULD** include a NOOIT DOEN section listing project-specific forbidden actions
- You **MUST** use Markdown headings for structure
- You **MUST** be concise and practical
- You **MUST** focus on what an AI assistant needs to help with the codebase
- You **SHOULD** include examples where helpful (commands, paths, naming patterns)
- You **SHOULD** include file paths where relevant
- You **MUST** call out architecture and code patterns explicitly
- You **SHOULD** omit information obvious from code structure
</directives>

<output>
After analysis, you **MUST** write AGENTS.md to the project root.
</output>
