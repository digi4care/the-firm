---
name: pi-kb-generator
description: SETUP tool for Pi knowledge base. Fetches documentation from GitHub (pi-mono) and npm registry (343 packages). Use ONLY for initial setup, updates, or when knowledge base is missing/corrupted. Do NOT use for reading docs, searching packages, or learning about Pi features. Keywords - setup, install, update, refresh, fetch, generate, knowledge base, sync.
allowed-tools: Bash
disable-model-invocation: true
---

# Pi Knowledge Base Generator

**SETUP tool** - Fetches and maintains the Pi knowledge base.

## Output Location

```
┌─────────────────────────────────────────────────────────────┐
│  This skill creates the cache at:                           │
│  ~/.ai_docs/                                                │
│                                                             │
│  After running, other skills can read from this cache      │
└─────────────────────────────────────────────────────────────┘
```

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Set up Pi docs" | First-time setup |
| "Update the knowledge base" | Periodic refresh |
| "Refresh Pi documentation" | Get latest from GitHub |
| "Knowledge base missing/corrupted" | Rebuild from scratch |
| After `/skill:pi-encyclopedia` reports missing docs | Run to fix |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "How do I create an extension?" | `/skill:pi-encyclopedia` |
| "Find me a package for X" | `/skill:pi-ecosystem` |
| "What is the ExtensionAPI?" | `/skill:pi-encyclopedia` |
| "What does pi-subagents do?" | `/skill:pi-ecosystem` |

## Commands

Find shared scripts from package installation:

```bash
# Find openpi-library package location
find_shared() {
  for dir in \
    "node_modules/openpi-library/src/shared" \
    "$(npm root -g 2>/dev/null)/openpi-library/src/shared" \
    "$HOME/.pi/packages/openpi-library/src/shared" \
    ".pi/shared"
  do
    [[ -d "$dir" ]] && echo "$dir" && return 0
  done
  echo "Error: openpi-library not found. Install with: pi install npm:openpi-library" >&2
  return 1
}
SHARED=$(find_shared) || exit 1
```

| Command | Description |
|---------|-------------|
| `$SHARED/update-all.sh --global` | Full setup to `~/.ai_docs/` (recommended) |
| `$SHARED/update-all.sh --local` | Full setup to `.ai_docs/` |
| `$SHARED/update-docs.sh --global` | GitHub docs only to `~/.ai_docs/` |
| `$SHARED/update-ecosystem.sh` | npm packages only |

## Workflow

### Step 1: Verify Prerequisites

```bash
gh auth status || { echo "Run: gh auth login"; exit 1; }
which jq || { echo "Install jq"; exit 1; }
which curl || { echo "Install curl"; exit 1; }
```

### Step 2: Run Update

```bash
$SHARED/update-all.sh --global
```

### Step 3: Verify

```bash
ls ~/.ai_docs/KNOWLEDGE_BASE.md
```

## Output Structure

After successful run:

```
~/.ai_docs/
├── KNOWLEDGE_BASE.md           # Navigation (START HERE)
├── INDEX.md                    # Quick access
├── openpi-mastery-config.json  # Config & cache registry
├── npm-ecosystem.md            # 343 packages table
├── packages/                   # 7 package READMEs
├── coding-agent/
│   ├── docs/                   # 22 documentation files
│   └── examples/               # 65+ extension + 12 SDK examples
├── mom/docs/                   # 6 Slack bot docs
├── pods/docs/                  # 7 GPU deployment docs
└── package-cache/              # Cached npm packages
```

## Error Handling

| Error | Resolution |
|-------|------------|
| **gh CLI not authenticated** | Run `gh auth login` |
| **Network timeout** | Retry, check internet |
| **Rate limited (npm)** | Wait 1 minute, retry |
| **Disk full** | Free disk space |
| **Permission denied** | Check folder permissions |
| **Partial fetch** | Re-run (idempotent) |

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **pi-encyclopedia** | Read docs | Learning about Pi features |
| **pi-ecosystem** | Search packages | Finding npm packages |
