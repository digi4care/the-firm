# The Firm Pi Config Policy v0

## Purpose

This document defines how The Firm relates to `pi` runtime configuration.

The Firm does not treat `config.yaml` as mere tooling trivia. Pi runtime settings materially affect:

- model behavior
- context compaction
- delegation patterns
- safety of parallel work
- memory usage
- task routing
- visibility of workflow signals

Therefore, The Firm must explicitly state which configuration choices:

- align with doctrine
- require caution
- vary by lane or engagement mode
- should eventually be set by a future installer or bootstrap process

## Governance principle

Pi is the runtime substrate. The Firm is the governing layer.

That means:

- Pi config is not allowed to silently undermine The Firm doctrine
- The Firm should not ignore runtime behavior just because it is configurable
- project settings and The Firm policy must be read together

## Policy categories

The Firm classifies Pi settings into four categories:

### 1. Preferred

Settings that align strongly with The Firm doctrine and should be used by default where possible.

### 2. Accepted

Settings that are compatible with The Firm, but are not critical to its identity.

### 3. Conditional

Settings that may be valid in some lanes or engagement modes, but risky or suboptimal in others.

### 4. Discouraged

Settings that are likely to undermine role separation, verification, issue-first execution, or anti-drift discipline.

## Model role policy

### Why it matters

The Firm already differentiates roles such as planning, architecture, delivery, QA, and client-facing coordination. Pi model-role routing should reinforce that rather than flatten it.

### The Firm stance

`modelRoles` is a strategic capability, not a cosmetic preference.

### Preferred interpretation

- `plan` should support design lock, architecture work, and verification planning
- `task` should support specialist execution and scoped delegated work
- `slow` should support deep analysis, governance review, and difficult council work
- `smol` may support lightweight routing, narrow supportive tasks, or low-risk utility work
- `vision` may support image/UI or multi-modal needs when relevant

### Policy

- role-sensitive model routing is preferred
- critical or high-ambiguity work should not silently degrade to lightweight models without explicit intent
- the same model need not power every office

### Lane guidance

- fast lane may use lower-cost roles where risk is genuinely bounded
- standard lane should use balanced planning and task roles
- critical lane should prefer stronger planning/review models over cheaper convenience

## Thinking-level policy

### Why it matters

The Firm is not a speed-only operating model. Under-thinking increases drift, hidden assumptions, and false confidence.

### Policy

- a high default thinking level is compatible with The Firm
- specialist, architecture, QA, governance, and council work should prefer medium-to-high reasoning depth
- lightweight or repetitive support tasks may use reduced thinking only when risk and scope are bounded

### Discouraged pattern

A low default thinking level combined with broad autonomy is discouraged because it amplifies plausible-but-wrong execution.

## Compaction policy

### Why it matters

The Firm depends on handoffs, artifact-based transfer, and anti-drift context discipline.

### Preferred

`compaction.strategy: handoff`

This aligns strongly with The Firm because:

- handoffs are already canonical workflow objects
- downstream agents should not inherit uncontrolled history
- context should be compacted around artifacts and packets, not raw chat accumulation

### Policy

- handoff-based compaction is preferred
- compaction should preserve issue, artifact, and verification truth
- compaction settings must not destroy traceability that the workflow still depends on

### Conditional concern

If handoff material is not persisted in workflow artifacts, then aggressive compaction risks dropping important state. The correct fix is to improve artifact discipline, not to abandon compaction discipline.

## Task eagerness policy

### Why it matters

The Firm uses specialist roles and expects delegation. But it does not permit delegation to replace intake, issue discipline, or design lock.

### Policy

`task.eager: true` is acceptable and often desirable under The Firm, provided that:

- delegation remains issue-driven
- delegated tasks stay inside role boundaries
- eager subagent use does not bypass governance or handoff expectations

### Discouraged pattern

Using eager task delegation as a substitute for:

- issue decomposition
- verification planning
- staffing logic
- design authority

is discouraged.

## Task isolation policy

### Why it matters

Parallel execution without isolation can damage traceability, create merge ambiguity, and weaken causality.

### Policy

`task.isolation.mode: none` is conditionally accepted, not universally preferred.

### Accepted use

- intake work
- advisory work
- planning and design work
- narrow sequential execution
- low-risk supportive tasks

### Higher-risk concern

For serious parallel implementation, refactor, or critical-lane work, no isolation increases risk of:

- overlapping edits
- blame ambiguity
- weak auditability
- difficult rollback or replay reasoning

### The Firm stance

- no-isolation may be tolerated in lighter lanes
- stronger isolation should be preferred for higher-risk parallel execution
- a future installer may recommend lane-sensitive isolation defaults

## Memory policy

### Why it matters

The Firm values memory as a convenience, but does not allow memory to become the canonical source of workflow truth.

### Policy

`memories.enabled: true` is accepted only as a supporting aid.

### Canonical truth remains

- Beads issue state
- linked artifacts
- Dolt-backed workflow state
- structured packets and verdicts

### Discouraged pattern

Relying on agent memory to substitute for:

- handoff artifacts
- issue updates
- verification records
- intake and engagement state

## Todo policy

### Why it matters

The Firm is primarily issue-first, not todo-first.

### Policy

Todo features may be used as local support mechanisms, but they are secondary to:

- issue graph
- engagement state
- work-item lifecycle
- verification and closure rules

### Implication

Settings like `todo.eager` or reminder toggles are operationally minor compared to the canonical issue graph, run-state, and workflow enforcement layers.

## Edit mode policy

### Why it matters

Precise edits reinforce traceability and reduce accidental drift.

### Policy

A precise, line-aware edit mode such as `hashline` is well aligned with The Firm.

### Preferred outcome

Edits should be attributable, reviewable, and minimally destructive.

## Startup and display policy

### Why it matters

These settings are not core doctrine, but visibility and quiet-start behavior can affect operator trust.

### Policy

- `startup.quiet: true` is accepted if workflow truth remains visible elsewhere
- token usage visibility is beneficial because The Firm explicitly cares about cost-aware verification and context discipline

## Commands and extension policy

### Why it matters

The Firm intends to be the governing layer. Competing command ecosystems can dilute or conflict with doctrine.

### Policy

Disabling unrelated or conflicting external command layers is often appropriate when they would introduce competing workflow assumptions.

## Secrets policy

### Why it matters

The Firm assumes real delivery work. Access to secrets may be necessary, but should always respect role boundaries and lane/risk sensitivity.

### Policy

Secret access is accepted where needed, but should remain bounded by role and not be treated as generic permission.

## Lane-sensitive config policy

The Firm should eventually support lane-aware config guidance.

### Fast lane

May tolerate:

- lower-cost model roles
- reduced isolation
- lighter verification routing

### Standard lane

Should use:

- balanced role models
- strong handoff compaction
- normal issue and verification discipline

### Critical lane

Should prefer:

- stronger plan/review model roles
- stricter isolation when parallel work occurs
- higher reasoning depth
- stronger visibility and traceability settings

## Compatibility reading of the provided config shape

Settings of this general shape are mostly compatible with The Firm:

- strong role-based models
- high default thinking
- handoff compaction
- eager tasking
- precise edit mode
- visible token usage

Main area of caution:

- `task.isolation.mode: none` for higher-risk parallel implementation

Secondary caution:

- memory must not become workflow truth

## Future installer implications

A future The Firm installer should likely do one of the following:

- validate current Pi config against The Firm policy
- suggest lane-sensitive adjustments
- write recommended defaults where the user opts in

It should not blindly overwrite all runtime preferences. But it should be able to say:

- this setting is aligned
- this setting is tolerated
- this setting is risky for your current lane or engagement mode

## Summary

The Firm must read Pi config as part of runtime governance, not as an implementation afterthought.

A setting is acceptable only insofar as it does not undermine:

- issue-first execution
- role specialization
- handoff-based context discipline
- verification integrity
- governance clarity
- anti-drift behavior
