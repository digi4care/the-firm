---
name: pi-ecosystem
description: Pi npm package discovery and caching. Searches 343 community packages, fetches package info from npm/GitHub, caches for offline use. Use for FINDING and LEARNING about npm packages. Do NOT use for Pi core documentation or setup. Keywords - package, npm, install, ecosystem, community, search, find, cache, registry.
allowed-tools: Bash Read
---

# Pi Ecosystem

**PACKAGE discovery** - Search, fetch, and cache Pi npm packages.

## CRITICAL: Use Cached Data Only

```
┌─────────────────────────────────────────────────────────────┐
│  ONLY use cached data at ~/.ai_docs/                       │
│                                                             │
│  Package list: ~/.ai_docs/npm-ecosystem.md (343 packages)  │
│  Package cache: ~/.ai_docs/package-cache/<name>/            │
│                                                             │
│  If cache missing → tell user to run:                      │
│  /skill:pi-kb-generator                                     │
└─────────────────────────────────────────────────────────────┘
```

## Cached Data Paths

| What | Absolute Path |
| ---- | ------------- |
| **Package list (343 packages)** | `~/.ai_docs/npm-ecosystem.md` |
| **Package cache** | `~/.ai_docs/package-cache/<package-name>/` |
| **Cached README** | `~/.ai_docs/package-cache/<package-name>/README.md` |
| **Cached metadata** | `~/.ai_docs/package-cache/<package-name>/metadata.json` |
| **Cached package.json** | `~/.ai_docs/package-cache/<package-name>/package.json` |
| **Config** | `~/.ai_docs/openpi-mastery-config.json` |

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Find me a package for X" | Search ecosystem |
| "What does pi-subagents do?" | Fetch package info |
| "Is there a package for web scraping?" | Search by functionality |
| "Install pi-subagents" | Provide install command |
| "What npm packages are available?" | List ecosystem |
| "Show me subagent packages" | Filtered search |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "How do I create an extension?" | `/skill:pi-encyclopedia` |
| "What is the ExtensionAPI?" | `/skill:pi-encyclopedia` |
| "How do TUI components work?" | `/skill:pi-encyclopedia` |
| "Update the knowledge base" | `/skill:pi-kb-generator` |
| "Set up Pi docs" | `/skill:pi-kb-generator` |

## Workflow

### Step 1: Check Cache Exists

```
Check: ~/.ai_docs/npm-ecosystem.md exists?
If NO → Tell user: "Run /skill:pi-kb-generator first"
```

### Step 2: Search Packages

Read `~/.ai_docs/npm-ecosystem.md` and search for relevant packages.

Or use npm API for live search (online only):

```bash
curl -s "https://registry.npmjs.org/-/v1/search?text=keywords:pi-package%20<term>&size=20"
```

### Step 3: Read Cached Package Info

If package is already cached:

```
Read: ~/.ai_docs/package-cache/<package-name>/README.md
Read: ~/.ai_docs/package-cache/<package-name>/metadata.json
```

### Step 4: Fetch New Package (if not cached)

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

# Fetch package
$SHARED/fetch-package.sh <package-name>
```

Then read from cache.

### Step 5: Summarize & Recommend

1. Read the README from cache
2. Summarize what the package does
3. List key features
4. Provide install command: `pi install npm:<package-name>`

## Error Handling

| Error | Resolution |
|-------|------------|
| **Cache not found at ~/.ai_docs/** | Tell user: "Run /skill:pi-kb-generator first" |
| **Package not in ecosystem list** | Search npm API directly |
| **npm API timeout** | Use cached version if available |
| **GitHub README fetch fails** | Use npm README as fallback |
| **Rate limited** | Wait, use cache |

## Package Categories

| Category | Example Packages |
|----------|------------------|
| **Subagents** | pi-subagents, pi-interactive-shell, pi-finder-subagent |
| **Web/Search** | pi-web-access, pi-super-curl, @aliou/pi-linkup |
| **UI/Widgets** | pi-powerline-footer, pi-fzf, pi-annotate |
| **Providers** | pi-nvidia-nim, @aliou/pi-synthetic |
| **Safety** | @aliou/pi-guardrails, permission-gate |
| **Process** | @aliou/pi-processes, holdpty |
| **Memory** | @askjo/pi-mem, @e9n/pi-memory |
| **Notifications** | pi-notify, claudemon |

## Response Template

```markdown
## Package: <name>

**Description:** <from README>

**Key Features:**
- Feature 1
- Feature 2

**Install:**
\`\`\`bash
pi install npm:<package-name>
\`\`\`

**Try without installing:**
\`\`\`bash
pi -e npm:<package-name>
\`\`\`

**Related packages:** <similar packages>

**Documentation:** <link to npm/GitHub>
```

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **pi-encyclopedia** | Core docs | Learning about Pi features/APIs |
| **pi-kb-generator** | Setup | Installing or refreshing docs |
