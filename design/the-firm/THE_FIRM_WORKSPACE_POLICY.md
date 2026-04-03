# The Firm Workspace Policy v0

## Purpose

This document defines how The Firm binds work to a concrete repository workspace so path resolution, parallel execution, and artifact placement remain stable even when operator context or provider behavior is imperfect.

The Firm must not rely on transient shell cwd as its primary execution anchor. It needs an explicit workspace model.

## Core principle

The Firm separates:

- canonical repository identity
- active execution root

This allows the firm to preserve one logical repository while executing work in a safe, explicit workspace.

## Definitions

### Canonical repository root

The canonical repository root is the authoritative root of the repository itself.

This is the home of:

- the git repository
- public repo docs
- canonical runtime assets
- the primary Beads project identity

### Execution root

The execution root is the concrete workspace from which a specific engagement or workstream runs.

It may be:

- the canonical repository root
- or a dedicated worktree bound to the engagement

## Default rule

The Firm should prefer an explicit execution root for every active engagement.

If no execution root is bound, the system must not quietly treat the operator’s transient cwd as authoritative.

## Workspace modes

### 1. Canonical-root mode

Use the canonical repository root directly as execution root.

Appropriate for:

- small sequential work
- lightweight advisory work
- low-risk repo-local updates
- early bootstrap before multiple parallel streams exist

### 2. Worktree mode

Use a dedicated git worktree as execution root.

Appropriate for:

- parallel workstreams
- risky implementation work
- scoped engagements with strong isolation needs
- brownfield pilot streams
- work that would otherwise be vulnerable to path confusion or edit collisions

## The Firm preference

For serious multi-step or parallel work, The Firm should prefer worktree mode.

## Path resolution policy

### Rule 1

All internal relative paths are resolved against the active execution root, not against the transient shell cwd.

### Rule 2

The active execution root must itself belong to one canonical repository identity.

### Rule 3

If a request references a different repository than the currently bound execution root, execution must stop until repo binding is updated explicitly.

### Rule 4

Bare paths are assumed to be repository-internal and execution-root-relative unless explicitly marked otherwise.

### Rule 5

External paths must be explicit.
Examples:

- absolute paths
- explicit external repo references
- explicit non-project system locations

## Repository binding

The Firm should record repository binding in engagement state.

### Recommended fields

```yaml
repository:
  repo_name: the-firm
  canonical_repo_root: /absolute/path/to/repo
  execution_root: /absolute/path/to/repo/.worktrees/eng-001
  workspace_mode: worktree
  path_mode: repo-relative
  artifact_root: .firm
  runtime_root: .pi
```

For canonical-root execution:

```yaml
repository:
  repo_name: the-firm
  canonical_repo_root: /absolute/path/to/repo
  execution_root: /absolute/path/to/repo
  workspace_mode: canonical-root
  path_mode: repo-relative
  artifact_root: .firm
  runtime_root: .pi
```

## Worktree directory guidance

A repository may choose its own worktree placement, but The Firm should prefer a clear, discoverable convention.

### Suggested convention

```text
.worktrees/
  eng-001/
  eng-002/
  feature-auth-refactor/
```

The key is not the exact name. The key is that execution roots are:

- explicit
- stable
- engagement- or workstream-bound
- discoverable from state

## Artifact placement under worktrees

The Firm still treats artifact families as repository-relative concepts.

That means:

- `.firm/`
- `.pi/`
- `AGENTS.md`

remain logically repository-rooted structures, even if execution happens in a worktree.

In practice, the execution root should expose those paths as if working in the repo, because the worktree is a projection of the same repository.

## Interaction with issue tracker

Beads tracks work items for the canonical repository identity.

The workspace policy does not create separate issue graphs per worktree by default.
Instead:

- issues remain attached to the repository/project
- engagements and work items may store their active execution root
- the worktree is an execution binding, not a separate project identity

## Interaction with Dolt-backed workflow state

Structured workflow state should record:

- canonical repo identity
- current execution root
- workspace mode

This ensures that audit history can explain where work actually happened, not only what issue state changed.

## Runtime expectations for agents

Before reading or writing project files, a The Firm agent should know:

- what repository it is operating on
- what the current execution root is
- whether that execution root is canonical or a worktree

### Agent rule

If repo binding or execution root is ambiguous, stop and escalate rather than guessing from cwd.

## Anti-drift benefits

The workspace policy protects against:

- path drift from shell cwd changes
- provider-specific workspace assumptions
- accidental writes into the wrong repo root
- edit collisions during parallel work
- hidden ambiguity about where artifacts belong

## When worktrees are strongly recommended

Use worktrees by default for:

- multi-agent implementation waves
- critical-lane work
- brownfield pilot streams
- concurrent feature work
- installer and bootstrap development alongside ongoing runtime work

## When canonical-root mode is acceptable

Canonical-root mode is acceptable for:

- low-risk repo-local changes
- intake and planning work
- small doctrine or documentation updates
- early bootstrap while the repo is still single-threaded

## Relationship to install layout

The install layout defines where files live in the repository.
The workspace policy defines where a specific piece of work executes.

Those are related but not identical concerns.

## Relationship to context model

The context model says internal paths are role-scoped and packetized.
The workspace policy adds the execution anchor that those paths resolve against.

Without the workspace policy, context packets still risk drifting when the runtime cwd is unstable.

## Summary

The Firm should not trust implicit cwd behavior.

It should bind each engagement to:

- one canonical repository
- one explicit execution root
- one path-resolution policy

For simple work, that execution root may be the canonical repo root.
For serious or parallel work, it should usually be a dedicated worktree.
