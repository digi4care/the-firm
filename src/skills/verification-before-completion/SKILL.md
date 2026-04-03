---
name: verification-before-completion
description: Self-enforcement skill - when AI claims work is complete, fixed, or passing, it MUST run verification commands first; evidence before assertions always; prevents AI from falsely claiming completion
allowed-tools: Bash Read Write Edit
---

# Verification Before Completion

**VERIFICATION discipline** - Evidence before claims, always.

## When to Use This Skill

**SELF-ENFORCEMENT** - This skill triggers when YOU (the AI) are about to claim work is complete.

| Before You Say | Action |
|----------------|--------|
| "Done" | Run verification first |
| "It's fixed" | Reproduce and verify the fix |
| "All tests pass" | Run tests, show output |
| "Build works" | Run build, check exit code |
| "Complete" | Verify all requirements |
| "Fixed the bug" | Confirm original issue is resolved |
| "Ready" | Run all verification commands |
| "Everything works" | Show proof with fresh output |

**This skill activates when your internal monologue considers expressing satisfaction or completion.**

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "Debug this bug" | `/skill:systematic-debugging` |
| "Write a test first" | `/skill:test-driven-development` |
| "How do I verify X?" | Answer directly (this is the skill) |
| "Just checking" | No action needed |

## The Iron Law (Self-Enforcement)

```
BEFORE YOU CLAIM COMPLETION, YOU MUST VERIFY
```

You cannot claim work is done unless you have run verification commands in THIS session.

## The Gate Function (Self-Check)

```
BEFORE EXPRESSING SATISFACTION OR COMPLETION:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Express satisfaction or claim completion

Skip any step =dishonesty
```

## Common Verification Patterns

| Claim | Required Verification | Not Sufficient |
|-------|----------------------|----------------|
| Tests pass | `bun test` or `just test` - exit 0, 0 failures | Previous run, "should pass" |
| Linter clean | `bun lint` or `just lint` - 0 errors | Partial check, extrapolation |
| Build succeeds | Build command - exit 0 | Linter passing, logs "look good" |
| Bug fixed | Original symptom - now passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle: fail → pass → fail → pass | Test passes once |
| Extension works | Run with `just ext-<name>` | Agent reports "success" |
| Requirements met | Line-by-line checklist verified | Tests passing alone |

## Red Flags - STOP Before Claiming Completion

- You want to say "Done", "Fixed", "Complete", or express satisfaction
- You catch yourself using "should", "probably", "seems to"
- You feel tempted to express "Great!", "Perfect!" before verification
- You're about to commit/push/PR without verification
- You're about to report success to the user
- You're tired and want to wrap up
- **ANY internal thought suggesting work is done without verification**

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter ≠ compiler |
| "Agent said success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

## Key Patterns

**Tests:**

```
✅ [Run test command] [See: 34/34 pass] "All tests pass"
❌ "Should pass now" / "Looks correct"
```

**Regression tests (TDD Red-Green):**

```
✅ Write → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
❌ "I've written a regression test" (without red-green verification)
```

**Build:**

```
✅ [Run build] [See: exit 0] "Build passes"
❌ "Linter passed" (linter doesn't check compilation)
```

**Requirements:**

```
✅ Re-read plan → Create checklist → Verify each → Report gaps or completion
❌ "Tests pass, phase complete"
```

**Agent delegation:**

```
✅ Agent reports success → Check VCS diff → Verify changes → Report actual state
❌ Trust agent report
```

## Pi-Specific Verification

| Claim | Verification Command |
|-------|---------------------|
| Extension works | `just ext-<name>` - check for errors |
| Default Pi runs | `just pi` - starts without crash |
| Theme works | Visual verification or screenshot |
| Skill triggers | Test with trigger phrase |

## Workflow

1. ### Before ANY completion claim
2. **Identify the proof** - What command proves this?
3. **Execute fresh** - Run the complete command
4. **Read full output** - Check exit codes, counts
5. **Compare against claim** - Does evidence match?
6. **Report with evidence** - "X passes (see: 34/34)
7. ### Before commit/PR
8. Run all verification commands
9. Show all passing outputs
10. If any fail: fix first, verify again
11. Only then: commit with confidence
12. Identify what claim needs verification (tests, lint, build, behavior)
13. Select the right verification command for the stack (see references/verification-commands.md)
14. Execute the FULL command fresh — no cached results, no partial runs
15. Read full output — check exit codes, count failures, note warnings
16. Compare evidence against claim — does output confirm it?
17. If YES: state claim WITH evidence (see references/verification-commands.md evidence format)
18. If NO: report actual status, fix issues, re-verify
19. Only then: express satisfaction or claim completion

## Error Handling

| Situation | Response |
|-----------|----------|
| Verification fails | Report actual status, fix issues |
| Partial output | Run full command, get complete output |
| Unsure what to verify | Ask user what proves completion |
| Tired, want to skip | STOP - exhaustion is not an exception |

## Why This Matters

From failure memories:

- Human partner said "I don't believe you" - trust broken
- Undefined functions shipped - would crash
- Missing requirements shipped - incomplete features
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value. If you lie, you'll be replaced."

## Quick Tests

Should trigger:

- Self-check before claiming done
- Verify my changes work
- Run all checks before commit

Should not trigger:

- Debug this failing test
- Write a test first
- How do I set up CI?

Functional:

- Verify all changes before commit: run tests, lint, build
- I think I'm done — verify everything passes

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **systematic-debugging** | Root cause investigation | Before fixing bugs |
| **test-driven-development** | TDD discipline | Writing tests |
| **bowser** | Visual verification | Need screenshots/visual proof |
| **skill-creator** | Skill creation | Creating new skills |

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.

## When to Use Me

Use me when:

- verify before completion
- evidence before claims
- run all checks
- prove it works
- confirm everything passes
- self-enforcement

Do not use me for:

- <add negative triggers>

## References

- `references/references-verification-commands.md`
