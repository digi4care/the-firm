# Workflow Playbook

This playbook defines the execution order for skill creation and optimization.

## Modes

| Mode | Purpose |
|------|---------|
| `plan` | Produce structured plan without writing files |
| `audit` | Evaluate skill against required sections and quality signals |
| `create` | Generate new skill skeleton with references |
| `optimize` | Improve existing skill with merge-first updates |

## Standard Flow

```
1. Intake request → determine mode
2. Validate required input fields
3. Run dry-run preview
4. Show planned writes and quality impact
5. Apply only after explicit confirmation
6. Re-audit and summarize outcomes
```

## Plan Flow

1. Parse request for:
   - Skill purpose
   - Trigger phrases
   - Workflow steps
   - Error handling needs
   - Test cases

2. Generate plan structure:

   ```
   {
     name: "skill-name",
     description: "...",
     triggers: [...],
     workflow: [...],
     errorHandling: [...],
     tests: { shouldTrigger: [...], shouldNotTrigger: [...] }
   }
   ```

3. Return plan without writing

## Create Flow

1. Build from plan:
   - `SKILL.md` with frontmatter
   - Required sections populated
   - `references/` directory if needed

2. Generate structure:

   ```
   .pi/skills/<name>/
   ├── SKILL.md
   └── references/
       ├── <topic>.md
       └── registry.json
   ```

3. Dry-run by default
4. Show planned file list
5. Await confirmation

## Audit Flow

1. Read existing `SKILL.md`
2. Check required sections:
   - [ ] Frontmatter (name, description, allowed-tools)
   - [ ] When to Use
   - [ ] When NOT to Use
   - [ ] Workflow
   - [ ] Error Handling
   - [ ] Quick Tests
   - [ ] References
   - [ ] Related Skills

3. Score each dimension:
   - Trigger quality (0-10)
   - Structure quality (0-10)
   - Workflow specificity (0-10)
   - Error handling (0-10)
   - Test readiness (0-10)

4. Return diagnostics with scores

## Optimize Flow

1. Read existing `SKILL.md`
2. Merge updates into sections:
   - Preserve existing high-quality content
   - Add missing sections
   - Improve weak sections
   - Never destructive replacement

3. Compute quality metrics:

   ```
   before_score = audit(current)
   after_score = audit(proposed)
   delta = after_score - before_score
   ```

4. Gate decision:
   - `delta >= 0`: Apply can proceed
   - `delta < 0`: Block and show diagnostics

5. Return planned writes with deltas

## Quality Safeguards

| Safeguard | Behavior |
|-----------|----------|
| Dry-run | Default true, show changes without writing |
| Quality gate | Block if score regresses |
| Confirm | Require explicit approval before apply |
| Path safety | Only write within `.pi/skills/` |

## Execution Checklist

Before applying changes:

- [ ] Dry-run completed
- [ ] Quality score computed
- [ ] User confirmed apply
- [ ] Path validated as safe
- [ ] References registry consistent
