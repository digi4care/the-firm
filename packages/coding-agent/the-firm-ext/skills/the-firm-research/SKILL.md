---
name: the-firm-research
description: Research skill for systematic investigation. Triggers on research requests, "find out how X works", "onderzoek Y", "how does Z work", "wat is de werking van", "explain how", "document how", technical deep-dives, architecture questions, mechanism queries, and discovery tasks.
triggers:
  - research
  - onderzoek
  - find out how
  - how does
  - wat is de werking van
  - hoe werkt
  - explain how
  - document how
  - technical deep-dive
  - architecture question
  - mechanism
  - discovery
  - analyze how
  - investigate
  - understand how
  - learn how
negativeTriggers:
  - simple lookup
  - quick check
  - just tell me
  - implementation task
  - code generation
  - write code for me
workflow:
  - Check .firm/concepts/patterns/ for existing docs
  - Determine source type (GitHub, docs, local, web)
  - Execute research using appropriate tools
  - Synthesize findings into structured markdown with YAML frontmatter
  - Use firm_create OMP tool (type: concept) to generate file from template
  - Update .firm/concepts/patterns/navigation.md
  - Run /firm-validate or firm_validate tool to verify integrity
  - Commit changes
errorHandling:
  - If research exists: show summary, ask if update needed
  - If source not accessible: note in Open Questions
  - If topic unclear: ask 2-3 clarifying questions
  - If too broad: propose narrowing scope
references:
  - .firm/AGENTS.md
  - .firm/navigation.md
  - .firm/templates/concept-template.md
domains: [research, process]
concerns: [systematic-investigation, technical-deep-dive, architecture-research, discovery, documentation]
priority: 6
---

# Research Skill

## When to Use

**Trigger:** Research requests, systematic investigation, technical deep-dives, architecture questions, mechanism queries, discovery tasks.

Specific patterns that trigger this skill:
- "Research [topic]" / "onderzoek [onderwerp]"
- "Find out how [X] works" / "hoe werkt [X]"
- "How does [Z] work" / "wat is de werking van"
- "Explain how [system] works"
- "Document how [mechanism] functions"
- "I want to know more about [topic]"
- "Can you investigate [subject]"
- Technical architecture questions
- "What are the internals of [system]"
- "Discovery: how is [X] implemented"
- "Analyze the [mechanism] behind"
- Understanding complex systems
- "Can you research [topic] for me"

**NOT for:**
- Implementation tasks (use specific skills)
- Code generation (use coding skills)
- Simple lookups (use direct tool calls)
- Yes/no questions
- Quick factual queries

---

## Tool Hierarchy (Use in Order)

When researching, try tools in this priority:

```
1. Local Knowledge (.firm/concepts/patterns/)
   └─ Check if research already exists

2. GitHub CLI (gh)
   └─ For GitHub repos, issues, PRs, source code
   
3. MCP Tools
   └─ Domain-specific: Context7, GitHub MCP, etc.
   
4. Git (local)
   └─ For local repo history, branches
   
5. Fetch/Web Search
   └─ General web content, docs, articles
   
6. Read Tool
   └─ Direct file reading when path known
```

---

## Research Process

### Step 1: Check Existing Knowledge

```bash
# Search .firm/concepts/patterns/ for existing docs
find .firm/concepts/patterns/ -name "*.md" | xargs grep -l "<topic>" 2>/dev/null
```

If found: Reference existing research, ask if update needed.

### Step 2: Determine Source Type

| If topic involves... | Use... |
|---------------------|--------|
| GitHub repo | `gh repo view`, `gh api`, clone + explore |
| NPM/package | `gh search`, npm registry, source fetch |
| Framework/SDK docs | Context7 MCP, fetch docs site |
| Local codebase | `git log`, `find`, `grep` |
| Best practices | Web search, aggregators |

### Step 3: Execute Research

**For GitHub repos:**
```bash
gh repo view owner/repo --json name,description,primaryLanguage,defaultBranch
gh api repos/owner/repo/contents/path
```

**For source analysis:**
```bash
# Clone to temp, analyze structure
git clone --depth 1 https://github.com/owner/repo.git /tmp/repo-analysis
find /tmp/repo-analysis -type f -name "*.ts" | head -20
```

**For documentation:**
- Use Context7 MCP for library docs
- Use fetch for README, API docs
- Use web search for tutorials, articles

### Step 4: Synthesize Findings

Structure with YAML frontmatter:

```markdown
---
status: active
owner: Researcher Name
created: YYYY-MM-DD
updated: YYYY-MM-DD
review-cadence: quarterly
---

# [Topic]

Brief one-line summary.

## Core Concept

1-3 sentences explaining what this is and why it matters.

## Key Points

- Critical point 1: Brief explanation
- Critical point 2: Brief explanation
- Critical point 3: Brief explanation

## References

- [Related decision](../decisions/adr-XXX.md)
- [External resource](url)

---
*Navigation: [Back to patterns](../navigation.md)*
```

### Step 5: Create with firm_create

Generate using the OMP extension tool:

```
firm_create(type: concept, name: <topic-name>)
```

This creates: `.firm/concepts/patterns/<topic>-YYYY-MM-DD.md`

Examples:
- `firm_create(type: concept, name: omp-agent-override)`
- `firm_create(type: concept, name: react-server-components)`

### Step 6: Update Navigation

Add to `.firm/concepts/patterns/navigation.md` index table.

### Step 7: Validate

```bash
/firm-validate
```

### Step 8: Commit

```bash
git add .firm/concepts/patterns/
git commit -m "docs(patterns): add [topic] research findings"
```

---

## Naming Convention Helper

| Topic Pattern | Filename Pattern |
|--------------|------------------|
| General topic | `topic-descriptive-name-YYYY-MM-DD.md` |
| With subtype | `topic-subtype-name-YYYY-MM-DD.md` |
| Multiple words | `react-server-components-2026-04-06.md` |

Rules:
- Lowercase only
- Hyphens as separators
- No underscores, no camelCase
- Date required: YYYY-MM-DD

Use `firm_create` OMP tool with type `concept` - it handles naming automatically.

---

## Example Flow

**User:** "Research how agent override works in oh-my-pi"

**AI:**
1. Check `.firm/concepts/patterns/` → not found
2. Use `gh repo view can1357/oh-my-pi`
3. Search for "agent" in docs: `find docs -name "*.md" | xargs grep -l agent`
4. Read `task-agent-discovery.md`
5. Synthesize findings
6. Call firm_create(type: concept, name: omp-agent-override)
7. Update navigation
8. Run /firm-validate
9. Commit

---

## Constraints

- **Always check existing research first** — don't duplicate
- **Always use `firm_create` tool** — don't create files manually
- **Always update navigation** — or the research is invisible
- **Always run `firm_validate` or `/firm-validate`** — ensure integrity
- **Always cite sources** — gh:repo, docs.url, etc.
- **Use `kb-extract` or `kb-capture` from the-firm-runtime** — research findings can be captured to .firm/ using `kb-extract` (for external docs) or `kb-capture` (for patterns/errors)
- **Commit immediately** — don't leave unstaged research

---

## Error Handling

| If... | Then... |
|-------|---------|
| Research already exists | Show summary, ask if update needed |
| Source not accessible | Note in "Open Questions", commit what you have |
| Unclear topic | Ask 2-3 clarifying questions first |
| Too broad | Propose narrowing scope |

---

## References

- `.firm/AGENTS.md` — Agent operating manual
- `.firm/navigation.md` — Root index
- `.firm/concepts/patterns/` — Existing patterns
- `.firm/templates/concept-template.md` — Template for new concepts

---

**Rule:** Research is complete only when created with `firm_create`, validated, navigation updated, AND committed.

**Rule:** If you don't know which tool to use, ask: "Should I search GitHub, docs, or web?"

**Rule:** Never overwrite existing patterns — use `firm_create` with a new name.
