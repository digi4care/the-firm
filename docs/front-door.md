# Front Door

The Firm should not treat raw client conversation as direct execution by
default.

Its front door is responsible for turning client entropy into governed
work.

## What the front door emits

The front door is a downstream consumer of the lifecycle-owned routing
contract.

A routed request should produce the following metadata shape:

- `intent_class`
- `orchestrator_owner`
- `why`
- `allowed_next_roles`
- `blocked_roles`
- `requires_issue_graph_update`
- `requires_design_lock`
- `requires_engagement_steering`
- `requires_governance_check`
- `next_artifact_or_template`
- `next_governed_step`
- `helper_command` when relevant
- `delegation_rule` when relevant
- `parallelization_allowed`
- `parallelization_preconditions`

## Why this matters

A professional software firm does not let every new thought become ad hoc
execution.

It classifies, routes, and records work before serious delivery
continues.

## Runtime support

This repo now includes:

- the `firm-front-desk` skill
- `.omp/templates/request-routing.md`
- `.omp/commands/front-desk/` generated from `src/commands/front-desk/`
- `.omp/extensions/the-firm-runtime-router.ts` generated from `src/extensions/the-firm-runtime-router.ts`

> `omp run front-desk [--engagement=<id>] [--active-issue=<id>] <request>`
> Current routing rule: the authoritative hardcoded routing contract lives
> in English inside `resolveLifecycleRouting()` in
> `.omp/extensions/the-firm-runtime.ts`, while raw client request text
> may be in any language.
> Current guardrail: no planning, research, design, or implementation
> may proceed until a governed issue exists; direct continuation remains
> guarded even when an active issue is supplied.
> Current issue-action rule: after routing, the front door must tell the
> operator whether to attach to an active issue or create or attach the
> next governed Beads work item before delivery expands.
> Current helper-linkage rule: active governed continuation should point to
> `omp run link-artifact <issue-id> --type=engagement --engagement=<id>` so
> the active governed issue gets explicit engagement-artifact traceability.
> Current issue-path rule: execution-structuring, active-engagement work without
> an issue, or intake-first routing may point to `omp run issue-tree <engagement-id>`
> so the next governed issue path is created before delivery expands.
> Current consumer rule: `.omp/commands/front-desk/` and
> `.omp/templates/request-routing.md` consume lifecycle routing truth; they
> must not invent alternate routing categories or ownership rules.

These are early runtime assets for The Firm's front-door behavior.
