# Routing Guide

Classification taxonomy, ambiguity resolution, and workflow selection logic.

## Classification Order

Always classify explicit requests in this priority sequence after handling the empty-args fallback:

1. **Process correction** - "we're doing this wrong", workflow violations
2. **Testing/proof/completion** - "is this done?", verification claims
3. **Release/hotfix** - urgent shipping, production issues
4. **Bug report** - something is broken
5. **Fix request** - explicit fix without confirmed bug
6. **Brainstorm/design** - exploration, trade-offs, architecture
7. **Feature/task** - bounded implementation work
8. **Analysis request** - understanding, investigation

## Routing Heuristics

### Ambiguity Resolution

| Ambiguity | Resolution | Rationale |
|-----------|------------|-----------|
| Task vs design | Choose **Design** first | Shape must be clear before implementation |
| Bug vs fix | Choose **Bug** first | Confirm cause before applying fix |
| Done vs continue | Choose **Verification** first | Prove completion before moving on |
| Fix vs feature | Choose **Bug** workflow | Regression risk requires investigation |

### Empty-args Fallback

When no arguments provided:
- Default route: **continue/what-next**
- Use repo state as implicit request
- Output mode: **compact**
- Prefer continuation unless repo state signals urgency

### Completion Claim Routing

When user asks "is this done?" or makes completion claims:
- Primary: **testing/proof/verification** workflow
- Secondary: workflow that produced the work
- Required: evidence of completion, not just assertion
- Slice closeout is not a default stop. When completion evidence exists and the next bounded slice is already clear from repo state, the router should favor immediate continuation over a conversational pause.

## Workflow Process

### 1. Intake Classification

Classify the request using the taxonomy above. Capture both primary and secondary types when relevant.

### 2. Ambiguity Check

If classification is unclear, apply ambiguity resolution rules.

### 3. Output Mode Selection

Choose mode based on:
- No args → compact
- Explicit `--full` → full
- Explicit `--compact` → compact
- Default → compact for brevity, full for complexity

### 4. Route Determination

Select primary workflow based on classification. Add secondary workflow when verification or cross-cutting concerns apply.

### 5. Bounded Step Extraction

Identify exactly one concrete next action. Not a list. Not "investigate." A specific step.

### 6. Stop Sign Evaluation

Determine if implementation should be blocked. Include stop signs when:
- Design is unclear but implementation is suggested
- Bug root cause is not established
- Verification has not occurred
- Required docs have not been read

## Anti-Drift Guidance

When modifying workflow routing behavior, answer first:

**Is this generic routing behavior?**
- Classification taxonomy changes
- Ambiguity resolution rules
- Output mode contracts
- Decision sequence
→ Belongs in this skill

**Is this repo-specific policy?**
- Document paths and filenames
- Local gating rules (HANDOFF, Beads, etc.)
- Repository-specific examples
- Local workflow overrides
→ Belongs in the command

**Never duplicate** the same logic in both places. Each behavior has exactly one owner.

## Error Handling

- Unknown request type: default to continue/what-next with explicit uncertainty note
- Conflicting signals: apply ambiguity resolution, document the conflict
- Missing repo context: state what the command must provide, do not guess

## Examples

### Bug/fix request
**Prompt:** "fix the admin first 2FA code issue"

**Classification:**
- Primary: fix request
- Secondary: bug report (implied by "issue")

**Route:**
- Primary: bug investigation workflow
- Secondary: test/verification workflow
- Mode: compact (or full with --full flag)
- Logic: Bug before fix, verification required

### Design/brainstorm request
**Prompt:** "let's brainstorm the planning conversion model"

**Classification:**
- Primary: brainstorm/design request
- Secondary: none

**Route:**
- Primary: design and decision workflow
- Mode: compact
- Logic: Design before implementation

### Completion/verification request
**Prompt:** "is the archive slice really done?"

**Classification:**
- Primary: testing/proof/completion request
- Secondary: varies (depends on slice origin)

**Route:**
- Primary: test execution and verification workflow
- Secondary: originating workflow for the slice
- Mode: compact (question form implies quick answer)
- Logic: Verify before accepting completion claim
