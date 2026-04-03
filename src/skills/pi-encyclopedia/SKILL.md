---
name: pi-encyclopedia
description: Pi Coding Agent documentation reader. Answers questions about extensions, TUI, sessions, providers, models, SDK, RPC, skills, themes, and core concepts. Use for LEARNING about Pi features and APIs. Do NOT use for npm package discovery or setup/updates. Keywords - extension, TUI, session, provider, model, SDK, RPC, skill, theme, API, how to, documentation.
allowed-tools: Bash Read
---

# Pi Encyclopedia

**DOCUMENTATION reader** - Answers questions about Pi Coding Agent features.

## CRITICAL: Cached Docs Only

```
┌─────────────────────────────────────────────────────────────┐
│  ONLY use cached documentation at ~/.ai_docs/              │
│                                                             │
│  DO NOT use node_modules - cache must be created first     │
│                                                             │
│  If cache missing → tell user to run:                      │
│  /skill:pi-kb-generator                                     │
│                                                             │
│  Then retry after cache is created                         │
└─────────────────────────────────────────────────────────────┘
```

## Cached Documentation Paths

| What | Absolute Path |
| ---- | ------------- |
| **Navigation (START HERE)** | `~/.ai_docs/KNOWLEDGE_BASE.md` |
| **Extensions API** | `~/.ai_docs/coding-agent/docs/extensions.md` |
| **TUI Components** | `~/.ai_docs/coding-agent/docs/tui.md` |
| **Skills Guide** | `~/.ai_docs/coding-agent/docs/skills.md` |
| **Providers** | `~/.ai_docs/coding-agent/docs/providers.md` |
| **Models** | `~/.ai_docs/coding-agent/docs/models.md` |
| **Sessions** | `~/.ai_docs/coding-agent/docs/session.md` |
| **SDK** | `~/.ai_docs/coding-agent/docs/sdk.md` |
| **RPC** | `~/.ai_docs/coding-agent/docs/rpc.md` |
| **Themes** | `~/.ai_docs/coding-agent/docs/themes.md` |
| **Keybindings** | `~/.ai_docs/coding-agent/docs/keybindings.md` |
| **Settings** | `~/.ai_docs/coding-agent/docs/settings.md` |
| **Examples** | `~/.ai_docs/coding-agent/examples/` |
| **Package READMEs** | `~/.ai_docs/packages/` |
| **Config file** | `~/.ai_docs/openpi-mastery-config.json` |

## When to Use This Skill

| Topic | Examples |
|-------|----------|
| **Extensions** | "How do I create an extension?", "What is ExtensionAPI?", "registerTool" |
| **TUI** | "How do TUI components work?", "Create a widget", "overlays" |
| **Sessions** | "How do sessions work?", "session tree", "compaction" |
| **Providers** | "Configure OpenAI provider", "Add custom provider", "OAuth" |
| **Models** | "Switch models", "thinking levels", "model selector" |
| **SDK** | "Embed Pi in my app", "SDK usage", "programmatic access" |
| **RPC** | "RPC protocol", "integrate with Pi" |
| **Skills** | "Create a skill", "SKILL.md format", "Agent Skills standard" |
| **Themes** | "Create a theme", "colors", "keybindings" |
| **Core** | "settings.json", "AGENTS.md", "context files" |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "Find me a package for X" | `/skill:pi-ecosystem` |
| "What does pi-subagents do?" | `/skill:pi-ecosystem` |
| "Install npm package" | `/skill:pi-ecosystem` |
| "Update the knowledge base" | `/skill:pi-kb-generator` |
| "Set up Pi docs" | `/skill:pi-kb-generator` |

## Workflow

### Step 1: Read Navigation File

```
Read: ~/.ai_docs/KNOWLEDGE_BASE.md
```

This tells you which specific doc file to read.

### Step 2: Read Specific Documentation

Use the table in "Cached Documentation Paths" above to find the absolute path.

Example: For TUI questions → `Read: ~/.ai_docs/coding-agent/docs/tui.md`

### Step 3: Answer with Code Examples

Extract relevant info and provide working code examples from the docs.

### Step 4: Suggest Next Steps

- Point to related documentation files
- Suggest relevant npm packages via `/skill:pi-ecosystem`
- Offer to update docs via `/skill:pi-kb-generator` if outdated

## Error Handling

| Error | Resolution |
|-------|------------|
| **Cache not found at ~/.ai_docs/** | Run `/skill:pi-kb-generator` first |
| **Specific doc file missing** | Run `/skill:pi-kb-generator` to refresh |
| **Topic not covered** | Check `~/.ai_docs/KNOWLEDGE_BASE.md` for alternatives |

## Quick Tests

**Should trigger:**

- "How do I create a Pi extension?"
- "What is the ExtensionAPI?"
- "Explain TUI components"
- "How do sessions work?"
- "Configure a custom provider"
- "What thinking levels exist?"
- "Create a skill for Pi"
- "How does compaction work?"

**Should not trigger:**

- "Find me a package for subagents" → `/skill:pi-ecosystem`
- "What npm packages are available?" → `/skill:pi-ecosystem`
- "Update the knowledge base" → `/skill:pi-kb-generator`
- "Install pi-subagents" → `/skill:pi-ecosystem`

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **pi-kb-generator** | Setup/update | Installing or refreshing docs |
| **pi-ecosystem** | Packages | Finding npm packages |
