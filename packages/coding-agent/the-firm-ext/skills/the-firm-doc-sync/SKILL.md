---
name: the-firm-doc-sync
description: Download and organize reference documentation from GitHub repos into .firm/reference/. Uses AI to find relevant docs in repos where files may be scattered. Triggers on "sync docs", "download reference", "haal docs op", "update reference docs", "import docs from".
triggers:
  - sync docs
  - download reference
  - download docs
  - haal docs op
  - update reference docs
  - import docs from
  - fetch documentation
  - reference sync
  - doc sync
  - pull docs from
negativeTriggers:
  - create a decision
  - archive
  - validate
  - navigation sync
  - implement
  - code generation
workflow:
  - Clone or browse the target repo (shallow)
  - AI identifies relevant docs (markdown, docs/ dirs, README, guides)
  - Download selected docs to .firm/reference/<repo-name>/
  - Generate .firm/reference/<repo-name>/navigation.md
  - Update .firm/reference/navigation.md
  - Validate and commit
errorHandling:
  - If repo not found: report error, suggest alternatives
  - If no docs found: list repo structure, ask user which paths to include
  - If reference exists: ask whether to replace or merge
references:
  - .firm/reference/navigation.md
domains: [documentation, reference]
concerns: [doc-sync, reference-management, repo-analysis]
priority: 5
---

# Doc Sync Skill

## When to Use

**Trigger:** Requests to download, sync, or import reference documentation
from external GitHub repos into `.firm/reference/`.

Specific patterns:
- "Sync docs from oh-my-pi/pi-coding-agent"
- "Download reference docs for [repo]"
- "Haal docs op van [repo]"
- "Update reference documentation"
- "Import docs from [owner/repo]"
- "Pull latest docs from [repo]"

**NOT for:**
- Creating decisions or concepts (use the-firm-research)
- Code generation
- Navigation sync without new docs

---

## Process

### Step 1: Parse Request

Identify the target repo from user input:

```
Input patterns:
  - "sync docs from owner/repo"
  - "download owner/repo docs"
  - "haal docs op: owner/repo"
  - just "owner/repo" in context of doc sync
```

If no repo specified, ask: "Which repo do you want to sync docs from? (format: owner/repo)"

### Step 2: Discover Repo Structure

```bash
# Get repo overview
gh repo view owner/repo --json name,description,defaultBranch

# List root structure
gh api repos/owner/repo/contents/ --jq '.[] | "\(.type) \(.name)"'

# Find all markdown files (scattered docs detection)
gh api "repos/owner/repo/git/trees/main?recursive=1" --jq '.tree[] | select(.path | endswith(".md")) | .path'
```

### Step 3: AI Selection

Analyze the file list. Look for:
- `docs/` directories
- `README.md` and `README*.md`
- `*.md` files in root that look like documentation
- `guides/`, `tutorials/`, `examples/` directories
- Skip: `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, test files, source code

If uncertain about relevance of files, present the list to the user:
"I found X markdown files. The most relevant appear to be [list]. Should I include all of these, or would you like to select specific ones?"

### Step 4: Download

For each selected file:

```bash
# Create target directory
mkdir -p .firm/reference/<repo-name>

# Download via GitHub API
gh api repos/owner/repo/contents/<path> --jq '.content' | base64 -d > .firm/reference/<repo-name>/<filename>
```

Or for bulk download of a docs/ directory:

```bash
# Clone shallow, extract docs, remove clone
git clone --depth 1 https://github.com/owner/repo.git /tmp/doc-sync-<repo>
cp -r /tmp/doc-sync-<repo>/docs/ .firm/reference/<repo-name>/
rm -rf /tmp/doc-sync-<repo>
```

### Step 5: Generate Navigation

Create `.firm/reference/<repo-name>/navigation.md`:

```markdown
---
status: active
owner: auto-generated
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# <repo-name>/ — Navigation

<repo description or brief note>

## Files

| File | Description |
|------|-------------|
| [README.md](README.md) | Main documentation |
| ... | ... |

---
*Navigation: [Back to reference](../navigation.md)*
```

### Step 6: Update Root Navigation

Add the new repo to `.firm/reference/navigation.md`:

```markdown
## Subdirectories

| Directory | Description |
|-----------|-------------|
| ... existing ... |
| [<repo-name>/](<repo-name>/navigation.md) | <brief description> |
```

### Step 7: Validate and Commit

```bash
bun run ctx:update
git add .firm/reference/
git commit -m "docs(reference): sync <repo-name> documentation"
```

---

## Naming Convention

| Input | Target directory |
|-------|-----------------|
| `oh-my-pi/pi-coding-agent` | `.firm/reference/pi-coding-agent/` |
| `mariozechner/pi-mono` | `.firm/reference/pi-mono/` |
| `sveltejs/kit` | `.firm/reference/kit/` |

Rule: Use the repo name (part after `/`) as directory name. If conflict, use `owner-repo`.

---

## Example Flow

**User:** "Sync docs from oh-my-pi/pi-coding-agent"

**AI:**
1. `gh repo view oh-my-pi/pi-coding-agent` → get structure
2. Find markdown files: `docs/extensions.md`, `docs/sdk.md`, `README.md`, etc.
3. Present selection or proceed with all relevant docs
4. Download to `.firm/reference/pi-coding-agent/`
5. Generate `.firm/reference/pi-coding-agent/navigation.md`
6. Update `.firm/reference/navigation.md`
7. `bun run ctx:update`
8. Commit

---

## Error Handling

| If... | Then... |
|-------|---------|
| Repo not found | Report error, suggest alternatives |
| No markdown files | List structure, ask user what to include |
| Reference dir exists | Ask: replace or merge? |
| GitHub API rate limited | Use `git clone --depth 1` fallback |
| Docs scattered | AI identifies relevant files, confirms with user |

---

## Constraints

- **Always use shallow clones** — `--depth 1` only
- **Always clean up temp clones** — remove from `/tmp/` after copy
- **Always generate navigation.md** — otherwise docs are invisible
- **Always update root reference navigation** — keeps index current
- **Never download binary files** — markdown only
- **Never overwrite user-edited reference docs** — ask first
