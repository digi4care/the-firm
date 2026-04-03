# Troubleshooting

Common issues and fixes when creating or optimizing Pi skills.

## Skill Does Not Trigger

**Symptoms:**

- User says trigger phrase but skill doesn't load
- Skill is ignored in favor of direct response

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Description lacks keywords | Add keywords to description field |
| Trigger phrase not in "When to Use" | Add specific trigger phrase to table |
| Another skill has higher priority | Make triggers more specific |
| Skill directory name mismatch | Ensure directory name matches skill name |

**Debug:**

```bash
# Check skill structure
ls -la .pi/skills/<skill-name>/

# Verify SKILL.md exists
cat .pi/skills/<skill-name>/SKILL.md | head -20
```

## Dry-Run Shows Changes But Nothing Written

**Cause:** This is expected behavior. Dry-run only previews.

**Fix:**

1. Review planned changes
2. Confirm with user
3. Set `confirm: true` to apply

## Quality Gate Blocks Apply

**Symptoms:**

- "Quality score regressed, apply blocked"
- Optimization rejected

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Removed required section | Restore section or merge content |
| Triggers made less specific | Add more trigger phrases |
| Error handling removed | Add back error cases |
| Tests removed | Restore Quick Tests |

**Debug:**

1. Review before/after diagnostics
2. Identify which dimension dropped
3. Fix that specific area
4. Re-run optimize in dry-run

## References Not Loading

**Symptoms:**

- "Reference file not found"
- Links in SKILL.md don't resolve

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| File extension wrong | Use `.md` not `.mdx` |
| Path incorrect | Use relative path from SKILL.md |
| File not in registry | Add entry to registry.json |
| Case sensitivity | Match exact filename case |

**Debug:**

```bash
# Check references exist
ls -la .pi/skills/<skill-name>/references/

# Verify paths in SKILL.md
grep "references/" .pi/skills/<skill-name>/SKILL.md
```

## Frontmatter Parse Error

**Symptoms:**

- "Invalid frontmatter"
- Skill fails to load

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Missing closing `---` | Add closing delimiter |
| Invalid YAML syntax | Check indentation, quotes |
| Unknown field | Remove or comment out |
| Missing required field | Add name, description, allowed-tools |

**Valid Frontmatter:**

```yaml
---
name: skill-name
description: One-line description with keywords.
allowed-tools: Bash Read
---
```

## Cross-Skill Handoff Fails

**Symptoms:**

- "Skill not found: /skill:other-skill"
- Handoff goes to wrong skill

**Causes & Fixes:**

| Cause | Fix |
|-------|-----|
| Skill doesn't exist | Create the target skill first |
| Wrong skill name | Use exact skill name from frontmatter |
| Circular reference | Remove circular handoff |

## Skill Directory Structure Issues

**Symptoms:**

- "SKILL.md not found"
- References don't load

**Correct Structure:**

```
.pi/skills/
└── my-skill/              # lowercase, kebab-case
    ├── SKILL.md           # uppercase SKILL.md
    └── references/        # optional
        ├── topic.md       # lowercase .md
        └── registry.json  # optional
```

**Common Mistakes:**

- `skill.md` instead of `SKILL.md`
- `My-Skill/` instead of `my-skill/`
- `.MD` instead of `.md`

## Content Too Long

**Symptoms:**

- SKILL.md exceeds 500 lines
- Skill loads slowly

**Fix:**

1. Identify deep content that can move to references
2. Create `references/<topic>.md`
3. Replace content in SKILL.md with summary + link
4. Update registry.json if needed

**Example:**

```markdown
# Before (in SKILL.md)
## Detailed Workflow
<100 lines of detailed steps>

# After
## Workflow
See `references/workflow-details.md` for complete step-by-step guide.
```
