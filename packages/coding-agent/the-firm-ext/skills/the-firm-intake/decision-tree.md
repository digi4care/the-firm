# Decision Tree

High-level intake routing decisions and workflow selection.

## Top-Level Routing

```
[Client speaks to The Firm]
         |
         v
[Is the request clear and scoped?]
         |
    NO  / \  YES
        |   |
        v   v
[Classification]  [Direct routing]
        |              |
        v              v
[Staff + next step] [Proceed with governed execution]
```

## Preferred Routing Order

1. **Intake classification** if the request is still ambiguous or not yet work-shaped
2. **Backlog distillation** if multiple asks or side-paths are present
3. **Direct routing** only when the request clearly belongs to an already governed run
4. **Escalation** when the request exceeds local authority or creates cross-office conflict

## Hard Rule

Do not allow raw client entropy to become implicit execution just because the conversation is active.

## Complete Decision Sequence

### Phase 1: Intake

```
[Request received]
        |
        v
[Arguments provided?]----NO----> [Route: continue/what-next]
        |                              [Mode: compact]
       YES                             [Use repo state]
        |
        v
[Classify primary type]
```

### Phase 2: Classification

Check in this order (first match wins):

1. **Process correction?**
   - Signals: "we're doing this wrong", "violates policy", "should be using X"
   - Route: appropriate workflow with correction framing
   - Stop sign: address process before proceeding

2. **Completion/verification claim?**
   - Signals: "is this done?", "ready to ship?", "verify this"
   - Route: testing/proof/verification workflow
   - Secondary: originating workflow

3. **Release/urgent?**
   - Signals: "hotfix", "production down", "ship now", "urgent"
   - Route: release/hotfix workflow
   - Required: risk assessment, rollback plan

4. **Bug indicator?**
   - Signals: "broken", "error", "crash", "fails", "wrong result"
   - Route: bug investigation workflow
   - Required: reproduction, root cause before fix

5. **Fix request?**
   - Signals: "fix the...", explicit fix without confirmed bug
   - Route: bug workflow first (confirm before fix)
   - Note: fix requests often imply bugs

6. **Design/brainstorm?**
   - Signals: "brainstorm", "design", "trade-off", "architecture", "model"
   - Route: design/decision workflow
   - Stop sign: no implementation path until shape clear

7. **Feature/task?**
   - Signals: "add", "implement", "create", "build", bounded scope
   - Route: task/implementation workflow
   - Required: clear scope, acceptance criteria

8. **Analysis?**
   - Signals: "understand", "investigate", "how does", "why does"
   - Route: analysis workflow or continue workflow
   - Output: findings, not changes

9. **Default: continue/what-next**
   - Use when request is unclear or absent
   - Derive from repo state

### Phase 3: Ambiguity resolution

If classification yields multiple candidates:

```
Task vs Design?
    └─> Choose Design (shape before build)

Bug vs Fix?
    └─> Choose Bug (confirm before fix)

Done vs Continue?
    └─> Choose Verification (prove before proceed)

Fix vs Feature?
    └─> Choose Bug (regression risk)
```

### Phase 4: Secondary classification

Determine if secondary workflow applies:

| Primary | Secondary trigger | Secondary workflow |
|---------|------------------|-------------------|
| Bug/Fix | Fix will be implemented | Test/verification |
| Task | Implementation starts | Test/verification |
| Design | Shaped and approved | Task/implementation |
| Release | Changes included | Test/verification |
| Completion | Work found incomplete | Originating workflow |

### Phase 5: Output mode

```
No arguments?
    └─> Compact mode

Explicit --full?
    └─> Full mode

Explicit --compact?
    └─> Compact mode

Default (arguments, no flag)?
    └─> Compact (terse) or Full (complex) based on context
```

### Phase 6: Bounded step extraction

Formulate exactly one next step:

- Must be concrete (not "investigate" but "read X and identify Y")
- Must be actionable now
- Must fit within single session
- Must advance workflow state

### Phase 7: Stop sign evaluation

Include stop signs when:

- [ ] Implementation suggested but design unclear
- [ ] Fix requested but bug not confirmed
- [ ] Completion claimed but no verification evidence
- [ ] Required reading not done
- [ ] Workflow prerequisites not met

Stop sign format: "Do not code yet: [specific reason + required action]"

## Verification Checklist

Before emitting response, verify:

- [ ] Primary classification matches request intent
- [ ] Ambiguity resolved using correct precedence
- [ ] Output mode appropriate for context
- [ ] Bounded step is singular and concrete
- [ ] Stop signs included when safety requires
- [ ] No repo-specific assumptions hardcoded
