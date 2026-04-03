# Intake

The Firm should not treat raw client conversation as direct execution by
default.

Its intake department is responsible for turning client entropy into governed
work.

## What the intake emits

The intake is a downstream consumer of the lifecycle-owned routing
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

For the detailed intake department design, see
`design/the-firm/THE_FIRM_DEPARTMENT_INTAKE.md`.
