# Quality Rubric

Use this rubric to validate skill quality before applying changes.

## Scoring Dimensions

| Dimension | Weight | Criteria |
|-----------|--------|----------|
| **Trigger Quality** | 20% | Clear WHAT + WHEN, specific phrases, negative triggers |
| **Structure Quality** | 15% | All required sections present, concise |
| **Workflow Specificity** | 25% | Explicit ordered steps, actionable |
| **Error Handling** | 20% | Concrete failure cases, clear responses |
| **Test Readiness** | 10% | should-trigger, should-not-trigger, functional tests |
| **Progressive Disclosure** | 10% | Deep content in references/, SKILL.md concise |

## Required Sections

Every SKILL.md must have:

| Section | Required | Points |
|---------|----------|--------|
| Frontmatter (name, description) | ✓ | 15 |
| When to Use | ✓ | 10 |
| When NOT to Use | ✓ | 10 |
| Workflow | ✓ | 15 |
| Error Handling | ✓ | 10 |
| Quick Tests | ✓ | 10 |
| References | Optional | 5 |
| Related Skills | Optional | 5 |

**Minimum passing score:** 60/100

---

## Pi SDK Frontmatter Validation

### Name Validation

| Rule | Valid | Invalid |
|------|-------|---------|
| Only `[a-z0-9-]` | `code-review` | `Code_Review` |
| Must match directory | `src/skills/code-review/` → `name: code-review` | `name: codereview` |
| 1-64 characters | `a` to 64 chars | Empty or >64 |
| No leading/trailing hyphens | `my-skill` | `-skill`, `skill-` |
| No consecutive hyphens | `my-skill` | `my--skill` |

**Auto-fix:** Convert to lowercase, replace invalid chars with hyphens, collapse consecutive hyphens.

### Description Validation

| Rule | Requirement |
|------|-------------|
| Max length | 1024 characters |
| Content | What + When + Keywords |
| Keywords | Include matching terms |

**Good:** `Analyze AI agent sessions using ACE framework. Keywords - session, analysis, ace, reflect.`

**Bad:** `Analyzes stuff.` (too vague, no keywords)

### Allowed-Tools Format

| Format | Example |
|--------|---------|
| ✅ Space-delimited | `allowed-tools: Bash Read Write Edit` |
| ❌ Comma-delimited | `allowed-tools: Bash, Read, Write` |
| ❌ Array | `allowed-tools: [Bash, Read]` |

---

## Trigger Quality Checklist

- [ ] Description contains keywords for matching
- [ ] "When to Use" has specific trigger phrases
- [ ] "When NOT to Use" has negative triggers
- [ ] Quick Tests cover both should/should-not
- [ ] Triggers are distinct from other skills

## Workflow Quality Checklist

- [ ] Steps are numbered/ordered
- [ ] Each step is actionable
- [ ] Decision points are explicit
- [ ] Error paths are documented
- [ ] Success criteria are clear

## Error Handling Quality Checklist

- [ ] Common failure modes listed
- [ ] Recovery actions specified
- [ ] User-facing messages defined
- [ ] Graceful degradation described

## Progressive Disclosure Checklist

- [ ] SKILL.md is concise (200-400 lines)
- [ ] Deep content in `references/` directory
- [ ] Reference files exist for mentioned topics
- [ ] `registry.json` indexes references (if applicable)

---

## Gate Policy

```
IF after_score >= before_score:
  ALLOW apply
ELSE:
  BLOCK apply
  RETURN before/after diagnostics
  REQUIRE explicit override
```

### Override Conditions

Quality gate can be overridden when:

1. User explicitly requests: "apply anyway"
2. Score drop is due to section reorganization (not content loss)
3. Temporary regression with documented fix plan

---

## Scoring Example

| Dimension | Before | After | Delta |
|-----------|--------|-------|-------|
| Trigger Quality | 6/10 | 8/10 | +2 |
| Structure Quality | 7/10 | 8/10 | +1 |
| Workflow Specificity | 5/10 | 7/10 | +2 |
| Error Handling | 4/10 | 7/10 | +3 |
| Test Readiness | 6/10 | 8/10 | +2 |
| Progressive Disclosure | 3/10 | 6/10 | +3 |
| **Total** | **31/60** | **44/60** | **+13** |

**Result:** Apply allowed (positive delta)

---

## Word Count Guidelines

| Component | Target | Maximum |
|-----------|--------|---------|
| SKILL.md | 200-400 lines | 500 lines |
| Description | 1-2 sentences | 1024 chars |
| Each reference file | 100-200 lines | 300 lines |

---

## Common Quality Issues

| Issue | Fix |
|-------|-----|
| Vague triggers | Add specific phrases users would say |
| Missing negative triggers | Add "When NOT to Use" table |
| Shallow workflow | Add step-by-step with decisions |
| No error handling | Add table of situations/responses |
| No tests | Add Quick Tests section |
| SKILL.md too long | Move deep content to references/ |
| Name mismatch | Ensure `name` matches directory |
| Invalid name chars | Convert to lowercase + hyphens |
| Missing keywords | Add "Keywords - ..." to description |
| Wrong section names | Use "When to Use" not "When to Use Me" |

---

## Related References

- [Pi SDK Reference](./pi-sdk-reference.md) - Frontmatter spec and patterns
- [Templates](./templates.md) - Skill skeleton templates
- [Workflow Playbook](./workflow-playbook.md) - Execution flow for each mode
