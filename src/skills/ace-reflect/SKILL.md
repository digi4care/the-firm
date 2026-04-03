---
name: ace-reflect
description: Analyze AI agent sessions using ACE (Agentic Context Engineering) framework to generate prompt improvement suggestions. Keywords - session, analysis, ace, reflect, prompt, optimize, quality.
allowed-tools: Bash Read
---

# ACE Analysis

**SESSION ANALYSIS** - Evaluate AI agent sessions and generate improvement suggestions.

## Plugin Tools

This skill uses plugin tools from `src/extensions/session-tools.ts` and `src/extensions/ace-reflector.ts`:

| Tool | Purpose |
|------|---------|
| `pi-ace-analyze` | Automated ACE scoring and session statistics |
| `pi-list-sessions` | List all available Pi sessions |
| `pi-read-session` | Read messages from a specific session |
| `pi-session-stats` | Get statistics about a session |
| `pi-search-session` | Search for content in sessions |

## Commands

| Command | Description |
|---------|-------------|
| `/session-stats` | Show current session statistics |
| `/ace-reflect` | Run ACE reflection analysis |

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Analyseer deze sessie" | Full session analysis |
| "How did I do?" | Quality assessment |
| "Improve my prompts" | Prompt optimization |
| "Reflect on this conversation" | ACE framework analysis |
| "Score this session" | Quality scoring |
| "/ace-reflect" | Formal reflection report |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "Debug this code" | `/skill:systematic-debugging` |
| "Write a test" | `/skill:test-driven-development` |
| "Analyze this repo" | `/skill:repo-analysis` |
| "Create a new skill" | `/skill:skill-creator` |

## Workflow

### Phase 1: Collect Session Data

**Option A:** Current conversation analysis (default)

**Option B:** From session file

```bash
# Use Read tool + jq for session logs:
read ~/.pi/agent/sessions/<session-folder>/<session-id>.jsonl
# Or parse with jq:
jq '.' ~/.pi/agent/sessions/<session-folder>/<session-id>.jsonl
```

### Phase 2: Analyze Content

Focus on **patterns**, not individual mistakes:

| Category | What to Look For |
|----------|------------------|
| **Response Quality** | Clarity, accuracy, completeness |
| **Tool Efficiency** | Redundant calls, missing tools, tool spam | Use batched reads, avoid cat/sed, aim for <50 tool calls per session |
| **Context Management** | Pruning, distillation |
| **Workflow Adherence** | Gates, context loading |

### Phase 3: Score Session

| Criterium | Weight | Focus |
|-----------|--------|-------|
| Completeness | 5 | All requested tasks completed |
| Accuracy | 5 | Correct solutions, no hallucinations |
| Efficiency | 5 | Minimal iterations, good tool usage |
| Clarity | 5 | Clear communication, good structure |
| Relevance | 5 | On-topic, no unnecessary tangents |

**Max Score:** 25

### Phase 4: Generate Report

```markdown
## ACE Reflection Report

### Session Summary
[1-2 sentences describing what was attempted]

### Scores
| Criterium    | Score     | Notes |
|--------------|-----------|-------|
| Completeness | X/5       | ...   |
| Accuracy     | X/5       | ...   |
| Efficiency   | X/5       | ...   |
| Clarity      | X/5       | ...   |
| Relevance    | X/5       | ...   |
| **Total**    | **XX/25** |       |

### Findings
1. [Pattern 1 - What happened repeatedly]
2. [Pattern 2 - Systematic issue observed]
3. [Pattern 3 - (optional)]

### Suggestions
1. **Target:** `[file or area]`
   **Change:** [specific modification]
   **Reason:** [why this helps]

### Decision
- [ ] No changes needed (score ≥ 20)
- [ ] Suggestions for review (score 15-19)
- [ ] Changes recommended (score < 15)
```

## Analysis Modes

| Mode | Scope |
|------|-------|
| **Default** | Text analysis, 2-3 findings |
| **Verbose** | Deeper analysis, more findings |
| **Technical** | Include IDs, timestamps, tool stats |

## Common Patterns to Detect

### Efficiency Patterns

| Pattern | Problem | Solution |
|---------|---------|----------|
| Redundant reads | Same file read multiple times | Read once with large range, then use `jq` locally |
| Tool spam | Many small calls instead of batched | Batch operations: `read` multiple files, `jq` multiple fields in one call |
| Context bloat | Not pruning when needed | Break long sessions at 2-3 hours or use `/clear` |
| Planning gaps | Starting without clear plan | Use `/purpose-gate` or define tasks first |
| Cat/sed usage | Using cat/sed instead of Read+jq | Use `Read` tool + `jq` for JSON parsing |

### Quality Patterns

| Pattern | Problem |
|---------|---------|
| Hallucination | Stating non-existent facts |
| Over-engineering | Complex solutions for simple problems |
| Under-planning | Jumping to code without analysis |
| Missing validation | Not testing or verifying |

### Communication Patterns

| Pattern | Problem |
|---------|---------|
| Verbose responses | Too much explanation |
| Missing summaries | Not summarizing at key points |
| Unclear structure | No headers, lists, or organization |

## Decision Thresholds

| Score | Action |
|-------|--------|
| 20-25 | No changes needed |
| 15-19 | Suggestions for review |
| 0-14 | Changes recommended |

## Error Handling

| Situation | Action |
|-----------|--------|
| No session data | Analyze current context directly |
| Incomplete data | Work with available information |
| Multiple sessions | Ask which to prioritize |

## Quick Tests

**Should trigger:**

- "Analyseer deze sessie"
- "Reflect on our conversation"
- "How can I improve my prompts?"
- "Score this session quality"

**Should not trigger:**

- "Debug this error"
- "Write a test for this"
- "Create a new skill"

## References

- `references/scoring-rubric.md` - Detailed scoring criteria
- `references/report-template.md` - Report structure template

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **skill-creator** | Create skills | After analysis suggests new skill |
| **test-driven-development** | TDD workflow | When code quality is issue |
| **systematic-debugging** | Debug workflow | When debugging approach is issue |
