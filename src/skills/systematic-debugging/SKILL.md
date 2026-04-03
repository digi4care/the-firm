---
name: systematic-debugging
description: Systematic root-cause debugging workflow. Use when users ask to debug/fix bugs, crashes, failing tests, errors, stack traces, regressions, or Dutch prompts like debuggen/fout/bug/crash. Always investigate before fixing; prevents random symptom patches. Do not use for TDD or when root cause is already known.
allowed-tools: Bash Read
---

# Systematic Debugging

**ROOT CAUSE discipline** - Investigate first, fix at source, never patch symptoms.

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Fix this bug" | Start Phase 1 investigation |
| "Tests are failing" | Read errors, reproduce, trace |
| "Getting this error" | Gather evidence systematically |
| "Debug why login fails" | Four-phase process |
| "Why isn't this working" | Trace data flow to source |
| "Trace this issue" | Root cause analysis |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "Write a test for this feature" | `/skill:test-driven-development` |
| "Refactor this code" | Direct refactoring |
| "Add documentation" | Documentation task |
| "I already found the root cause" | Proceed with fix |
| "Just change X and see" | Still need Phase 1 |
| "General programming question" | Direct help |

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

If you haven't completed Phase 1, you cannot propose fixes.

## Workflow

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read Error Messages Carefully**
   - Don't skip past errors or warnings
   - Read stack traces completely
   - Note line numbers, file paths, error codes

2. **Reproduce Consistently**
   - Can you trigger it reliably?
   - What are the exact steps?
   - If not reproducible → gather more data, don't guess

3. **Check Recent Changes**
   - Git diff, recent commits
   - New dependencies, config changes
   - Environmental differences

4. **Gather Evidence in Multi-Component Systems**

   ```bash
   # For EACH component boundary:
   # - Log what data enters component
   # - Log what data exits component
   # - Verify environment/config propagation
   ```

5. **Trace Data Flow**
   - Where does bad value originate?
   - What called this with bad value?
   - Fix at source, not at symptom

### Phase 2: Pattern Analysis

1. **Find Working Examples** - Locate similar working code
2. **Compare Against References** - Read reference implementations completely
3. **Identify Differences** - List every difference, however small
4. **Understand Dependencies** - What settings, config, environment?

### Phase 3: Hypothesis and Testing

1. **Form Single Hypothesis** - "I think X is the root cause because Y"
2. **Test Minimally** - Smallest possible change, one variable at a time
3. **Verify Before Continuing** - Did it work? Yes → Phase 4, No → new hypothesis

### Phase 4: Implementation

1. **Create Failing Test Case** - Use `/skill:test-driven-development`
2. **Implement Single Fix** - Address root cause, ONE change at a time
3. **Verify Fix** - Test passes? No other tests broken?
4. **If Fix Doesn't Work:**
   - < 3 fixes: Return to Phase 1
   - ≥ 3 fixes: **STOP and question architecture**

## Error Handling

| Situation | Response |
|-----------|----------|
| "Quick fix for now" | STOP, return to Phase 1 |
| "Just try changing X" | STOP, require hypothesis first |
| "Multiple changes at once" | STOP, require single change |
| "Skip the test" | STOP, require failing test |
| "One more fix attempt" (after 2+) | STOP, question architecture |
| "I see the problem" | STOP, seeing ≠ understanding |

## Red Flags - STOP and Follow Process

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- Proposing solutions before tracing data flow
- "One more fix attempt" (when already tried 2+)

**ALL of these mean: STOP. Return to Phase 1.**

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|----------------|------------------|
| **1. Investigation** | Read errors, reproduce, check changes | Understand WHAT and WHY |
| **2. Pattern Analysis** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/find-polluter.sh` | Find tests that pollute global state |
| `scripts/condition-based-waiting-example.ts` | Wait for conditions, not timing |

## Quick Tests

**Should trigger:**

- "Fix this bug"
- "Tests are failing"
- "Debug why login fails"
- "Why isn't this working"
- "Trace this issue"

**Should not trigger:**

- "Write a test for this feature"
- "Refactor this code"
- "I already found the root cause"
- "Just change X and see"

## References

- `references/workflow-playbook.md` - Complete 4-phase debugging process
- `references/root-cause-tracing.md` - Trace bugs backward through call stack
- `references/defense-in-depth.md` - Multi-layer validation
- `references/condition-based-waiting.md` - Wait for conditions, not timing
- `references/visual-web-debugging.md` - Visual debugging with Playwright

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **test-driven-development** | Write tests first | After finding root cause, before fixing |
| **bowser** | Browser automation | For web UI debugging |
