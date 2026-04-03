---
name: repo-analysis
description: Analyze GitHub repositories for architecture, patterns, and code quality using gh CLI. Keywords - repo, github, analyze, architecture, review, structure, code quality.
allowed-tools: Bash Read
---

# Repository Analysis

**REPO ANALYSIS** - Clone and analyze GitHub repositories for architecture, patterns, and quality.

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Analyseer de repo van X" | Full repository analysis |
| "How does project Y work?" | Architecture deep dive |
| "What's the structure of Z?" | Structure overview |
| "Is library X suitable?" | Quality + suitability assessment |
| "Review the code of X" | Code quality analysis |
| "What do you think of project X?" | Comprehensive review |
| "owner/repo" mention | Repository analysis |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| Local codebase analysis | `/skill:systematic-debugging` |
| Single file review | `read` tool directly |
| Pi documentation Q&A | `/skill:pi-encyclopedia` |
| Find Pi packages | `/skill:pi-ecosystem` |
| Web content (non-GitHub) | `curl` or browser |
| Private repo without access | Ask user for access first |

## The Iron Law

```
ALWAYS START WITH GH CLONE, NEVER SKIP CLEANUP
```

## Workflow

### Phase 1: Clone & Initial Analysis

```bash
# Clone repository (shallow for speed)
gh repo clone owner/repo /tmp/repo-analysis -- --depth 1

# Quick structure overview
cd /tmp/repo-analysis && ls -la
cd /tmp/repo-analysis && find . -maxdepth 2 -type d | head -20

# Identify languages and package manager
cd /tmp/repo-analysis && cat package.json 2>/dev/null || cat Cargo.toml 2>/dev/null || cat pyproject.toml 2>/dev/null
```

### Phase 2: Deep Dive (based on user intent)

**Architecture Analysis:**

```bash
# Entry points
grep -r "export.*main\|export.*App\|createServer" /tmp/repo-analysis/src/

# Dependencies
cat /tmp/repo-analysis/package.json | grep -A 50 "dependencies"

# Module structure
find /tmp/repo-analysis/src -type d | head -20
```

**Pattern Discovery:**

```bash
# Design patterns
grep -r "Factory\|Singleton\|Observer\|Strategy" /tmp/repo-analysis/src/

# Code conventions
cat /tmp/repo-analysis/.prettierrc 2>/dev/null
cat /tmp/repo-analysis/eslint.config.* 2>/dev/null
```

**Quality Assessment:**

```bash
# Test coverage indicators
find /tmp/repo-analysis -name "*.test.*" -o -name "*.spec.*" | wc -l

# TypeScript strictness
cat /tmp/repo-analysis/tsconfig.json | grep "strict"

# Documentation
find /tmp/repo-analysis -name "*.md" | head -10
```

**History & Contributors:**

```bash
# Recent activity
cd /tmp/repo-analysis && git log --oneline -20

# Top contributors
cd /tmp/repo-analysis && git shortlog -sn | head -10

# Commit patterns (conventional commits?)
cd /tmp/repo-analysis && git log --format="%s" -50 | grep -E "^[a-z]+:"
```

### Phase 3: Reporting

Structure your analysis:

```markdown
## Repository Analysis: owner/repo

### Overview
- **Description**: [from README]
- **Stars/Forks**: [counts]
- **Primary Language**: [language]
- **Package Manager**: [manager]

### Architecture
- **Structure**: [key directories and purposes]
- **Entry Points**: [main files/modules]
- **Patterns Used**: [identified patterns]

### Quality Indicators
- **Tests**: [framework + coverage estimate]
- **Linting/Formatting**: [tools used]
- **TypeScript**: [strictness level]
- **Documentation**: [quality assessment]

### Key Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

### Recommendations
- [If user asked for recommendations]

### Permalinks
- Key files: https://github.com/owner/repo/blob/[sha]/path
```

### Phase 4: Cleanup

```bash
# ALWAYS cleanup when done
rm -rf /tmp/repo-analysis
```

## Analysis Types

| Type | Depth | Focus | Time |
|------|-------|-------|------|
| **Quick Overview** | 1 | README, package.json, structure | 2-5 min |
| **Architecture Deep Dive** | 1-3 | Entry points, modules, patterns | 10-20 min |
| **Quality Assessment** | 1 | Tests, linting, types, docs | 5-10 min |
| **Full Analysis** | 3-5 | Comprehensive review | 20-30 min |

## Tips

1. **Start with shallow clone** - `--depth 1` for speed
2. **Keep cloned repo** until analysis complete
3. **Use permalinks** in reports for reference
4. **Focus on user's question** - don't over-analyze
5. **Always cleanup** - `rm -rf /tmp/repo-analysis`

## Error Handling

| Situation | Response |
|-----------|----------|
| Repo not found | Check owner/repo spelling, verify exists |
| Private repo | Ask user for access or SSH key setup |
| Large repo | Use `--depth 1` and focus on specific directories |
| Rate limited | Wait or use authenticated gh CLI |
| Clone fails | Check network, try HTTPS instead of SSH |

## Quick Tests

**Should trigger:**

- "Analyseer de repo van sveltejs/svelte"
- "How does React work internally?"
- "Is zod geschikt voor form validatie?"
- "Review the pi-mono codebase"
- "What's the architecture of effect-ts?"

**Should not trigger:**

- "How do I create an extension?" → `/skill:pi-encyclopedia`
- "Debug this local file" → Direct debugging
- "Find a package for web scraping" → `/skill:pi-ecosystem`

## Anti-patterns

| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Clone without cleanup | Fills /tmp over time | Always `rm -rf` when done |
| Over-analyze simple question | Wastes time | Match depth to question |
| Clone local project | Unnecessary | Analyze local files directly |
| Ignore user intent | Wrong focus | Address specific question |
| Deep clone for quick check | Slow | Use `--depth 1` |

## References

- `references/analysis-templates.md` - Report templates by analysis type
- `references/quality-checklist.md` - Quality assessment checklist

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **pi-ecosystem** | Find Pi packages | Discovering npm packages |
| **pi-encyclopedia** | Pi documentation | Learning Pi features |
| **systematic-debugging** | Debug local code | Local codebase issues |
| **bowser** | Web automation | Testing web UIs |
