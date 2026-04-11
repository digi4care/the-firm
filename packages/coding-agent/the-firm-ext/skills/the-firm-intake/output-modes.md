# Output Modes

Defines the contract for compact and full routing response modes.

## Compact Mode

**Purpose:** Quick routing decisions for experienced users, continuation prompts, and low-context requests.

**Trigger conditions:**
- No arguments provided to router
- Explicit `--compact` flag
- User preference for brevity
- Low-complexity requests

### Required fields

| Field | Description | Example |
|-------|-------------|---------|
| Work type | Primary (and secondary if relevant) classification | "Bug fix" or "Feature / Testing" |
| Primary workflow | The main workflow to follow | "Bug investigation workflow" |
| Why this route | One plain-language reason for the classification | "Broken login flow means bug-first routing" |
| Next bounded step | Exactly one concrete action | "Create reproduction case in test file" |

### Conditional fields

| Field | Include when | Example |
|-------|--------------|---------|
| Stop signs | Implementation would be premature | "Do not code yet: root cause not established" |
| Also read | Secondary workflow significantly different | "Also: test verification workflow" |

### Compact mode safety requirements

Compact mode must remain safe despite brevity. Minimum safety content:

1. **Always include work type** - Ensures classification is explicit
2. **Always include primary workflow** - Establishes the path
3. **Always include why this route** - Keeps terse output understandable
4. **Always include bounded step** - Enables immediate action
5. **Include stop signs when:**
   - Design is unclear but implementation implied
   - Bug root cause not established
   - Completion claimed without evidence
   - Required prerequisites not met

### Compact mode template

```
Work type: [Primary] / [Secondary if relevant]
Workflow: [Primary workflow name]
Why: [One plain-language reason]

Next: [One bounded step]

[Stop signs if needed]
```

### Compact mode example

```
Work type: Bug investigation
Workflow: Bug investigation and fix workflow
Why: Broken auth behavior means bug-first routing before any code change

Next: Create minimal reproduction case in test suite

Stop: Do not implement fix yet — confirm root cause first
```

## Full Mode

**Purpose:** Comprehensive routing guidance for new team members, complex requests, audit trails, and governance requirements.

**Trigger conditions:**
- Explicit `--full` flag
- High-complexity requests
- Multi-workflow routing
- Onboarding or training context

### Required sections

1. **Work type**
   - Primary classification
   - Secondary classification (if applicable)

2. **Primary workflow**
   - Workflow name and path
   - Why this workflow applies

3. **Also read next**
   - Secondary workflow if applicable
   - Deep-dive docs for affected area
   - Testing/verification requirements

4. **Why this route**
   - Plain language explanation
   - Classification signals that led here
   - Ambiguity resolution if applied

5. **Must happen before implementation**
   - Numbered list of prerequisites
   - Gate checks that must pass
   - Required evidence or decisions

6. **Must happen before completion**
   - Numbered list of proving checks
   - Verification requirements
   - Sign-off requirements

7. **Next bounded step**
   - Exactly one concrete action
   - Specific enough to start immediately

8. **Stop signs**
   - Explicit "do not code yet" conditions
   - Required actions before proceeding

### Full mode template

```
### Work type
- Primary: [classification]
- Secondary: [classification if relevant]

### Primary workflow
- [Workflow name]

### Also read next
- [Secondary workflow]
- [Relevant deep-dive doc]

### Why this route
[Explanation of classification and routing decision]

### Must happen before implementation
1. [Prerequisite]
2. [Prerequisite]
3. [Prerequisite]

### Must happen before completion
1. [Proving check]
2. [Proving check]
3. [Proving check]

### Next bounded step
- [One concrete action]

### Stop signs
- [Condition that blocks coding]
```

### Full mode example

```
### Work type
- Primary: Bug report
- Secondary: Fix request

### Primary workflow
- Bug investigation and fix workflow

### Also read next
- Test execution and verification workflow
- Auth/2FA testing protocols

### Why this route
Request describes a failure in 2FA code validation with specific
error behavior. Classified as bug first to confirm root cause before
applying fix.

### Must happen before implementation
1. Create minimal reproduction case
2. Establish evidence packet (logs, error traces)
3. Separate facts from hypotheses
4. Identify root cause

### Must happen before completion
1. Regression test for this failure
2. Verification in staging
3. Edge case testing

### Next bounded step
- Create reproduction case in test/auth-2fa.spec.ts

### Stop signs
- Do not modify 2FA validation until root cause confirmed
```

## Mode Selection Decision Tree

```
Input: request + flags

Has --full flag?
    └─> Full mode

Has --compact flag?
    └─> Compact mode

No arguments?
    └─> Compact mode (default for continuation)

Arguments provided, no flag?
    └─> Compact for simple requests
    └─> Full for complex requests (multi-workflow, high risk)
```

## Mode Compatibility

Commands may support both modes. The skill provides templates for each.

- Commands default to compact for brevity
- Commands honor `--full` for completeness
- Commands may override defaults for local policy
- Mode selection is command responsibility; mode structure is skill responsibility

## Anti-patterns

**Unsafe compact mode:**
- Omitting stop signs when implementation is premature
- Vague bounded steps ("investigate the issue")
- Missing primary workflow reference

**Bloated compact mode:**
- Turning the short "why" line into a paragraph
- Including all full mode sections
- Listing multiple next steps

**Incomplete full mode:**
- Missing "must happen before completion"
- Omitting stop signs
- Unclear bounded step
