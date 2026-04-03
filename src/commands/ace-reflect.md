---
description: Analyze sessions and generate improvement suggestions using ACE framework. Uses Pi's built-in session system.
---

# /ace-reflect

Analyze sessions and generate improvement suggestions using ACE (Agentic Context Engineering) framework.

## When to Use This Command

| Trigger | Action |
|---------|--------|
| "Analyze this session" | Run ACE reflection on current session |
| "Session review" | Run ACE reflection |
| "Improve my prompts" | Run ACE reflection with suggestions |
| "Reflect on session" | Run ACE reflection |

## When NOT to Use This Command

| Trigger | Route To |
|---------|----------|
| "Create a new skill" | Use `/skill-creator-create` |
| "Audit a skill" | Use `/skill-creator-audit` |
| "Debug code" | Direct debugging |

## Usage

```
/ace-reflect                    Default: analyze current session
/ace-reflect --verbose          Deeper analysis, more findings
/ace-reflect --technical        Include IDs, timestamps, tool stats
/ace-reflect --full             Complete analysis with all metadata
/ace-reflect session:<id>      Analyze specific session
/ace-reflect last:N             Analyze last N sessions
```

## Workflow

1. **Get Session Data:**
   - Current session: Use `ctx.sessionManager.getBranch()` from extension context
   - Other sessions: Read JSONL files from `~/.pi/agent/sessions/`

2. **List Available Sessions:**

   ```bash
   ls ~/.pi/agent/sessions/
   ls ~/.pi/agent/sessions/<session-folder>/
   ```

3. **Load Session Content:**
   - Read JSONL files to get all messages
   - Extract tool calls, user prompts, assistant responses

4. **Analyze with ACE Framework:**
   - Evaluate Completeness, Accuracy, Efficiency, Clarity, Relevance
   - Identify patterns (not individual mistakes)
   - Generate actionable suggestions

5. **Return Report:** Present formal ACE Reflection Report

## Flags

| Flag | Effect |
|------|--------|
| `--verbose` | More findings, deeper analysis |
| `--technical` | Include session IDs, timestamps, tool usage |
| `--full` | Complete analysis with all metadata |

## Output

Returns formal `ACE Reflection Report` with:

- Session summary (message count, tool usage, duration)
- Scores (Completeness, Accuracy, Efficiency, Clarity, Relevance)
- Findings (patterns, not individual mistakes)
- Suggestions (specific, actionable)
- Decision (no changes / review / changes recommended)

## Session Access in Extensions

```typescript
// Get current session branch
const branch = ctx.sessionManager.getBranch();

// Iterate through entries
for (const entry of branch) {
  if (entry.type === "message") {
    const msg = entry.message;
    // Process message...
  }
}
```

## Error Handling

| Situation | Response |
|-----------|----------|
| No session data available | Show message, suggest using current session |
| Analysis fails | Return error with troubleshooting steps |
| Invalid session ID | Show error with available session IDs |

## References

- `~/.pi/agent/sessions/` - Session file storage
- `references/session-format.md` - Session JSONL format documentation
- `skill:ace-analysis` - ACE analysis framework skill
