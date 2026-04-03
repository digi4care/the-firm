# The Firm Install Layout v0

## Purpose
This document defines how The Firm should land physically inside a repository.

The design stack is only useful if it can be installed as a repeatable repository footprint. This document describes that footprint: what files belong where, which parts are normative, which parts are templates, and how the runtime should discover them.

## Install goals
A repository with The Firm installed should make all of the following true:
- The Firm doctrine is discoverable by runtime agents
- The Firm operating documents are present and versioned
- The Firm agent catalog can be implemented through project-local agent definitions
- intake and engagement artifacts have a standard home
- issue-driven execution is visibly anchored in the repo
- greenfield and brownfield projects can share one recognizable structure

## Top-level layout
Recommended repository structure:

```text
.
├── AGENTS.md
├── .omp/
│   ├── internal/
│   │   └── the-firm/
│   │   ├── README.md
│   │   ├── THE_FIRM_VISION.md
│   │   ├── THE_FIRM_PHILOSOPHY.md
│   │   ├── THE_FIRM_DOCTRINE.md
│   │   ├── THE_FIRM_OPERATING_MODEL.md
│   │   ├── THE_FIRM_WORKFLOW_ARCHITECTURE.md
│   │   ├── THE_FIRM_CONTROL_PLANE.md
│   │   ├── THE_FIRM_ISSUE_TRACKER_MODEL.md
│   │   ├── THE_FIRM_VERIFICATION_POLICY.md
│   │   ├── THE_FIRM_OMP_OVERRIDE_MODEL.md
│   │   ├── THE_FIRM_GREENFIELD_BOOTSTRAP.md
│   │   ├── THE_FIRM_BROWNFIELD_ADOPTION.md
│   │   ├── THE_FIRM_AGENT_CATALOG.md
│   │   ├── THE_FIRM_CLIENT_ENGAGEMENT_MODEL.md
│   │   ├── THE_FIRM_CONTEXT_MODEL.md
│   │   ├── THE_FIRM_OPERATIONAL_CONSTRAINTS.md
│   │   ├── THE_FIRM_GOVERNANCE_AND_COUNCIL_MODEL.md
│   │   └── THE_FIRM_INSTALL_LAYOUT.md
├── ai_docs/
│   └── principles/
├── .omp/
│   ├── agents/
│   ├── commands/
│   ├── extensions/
│   ├── skills/
│   └── templates/
├── .firm/
│   ├── intake/
│   ├── engagements/
│   ├── artifacts/
│   ├── templates/
│   ├── run-state.yml
│   └── state/
└── .beads/
```

This is the conceptual target. Individual repos may not need every directory on day one, but the structure should converge toward this shape.

## Normative vs generated vs working files
The Firm should distinguish three classes of files.

### 1. Normative docs
These define how the system is supposed to work.

Location:
- `.omp/internal/the-firm/`

Examples:
- doctrine
- workflow architecture
- verification policy
- install layout

These should be versioned and reviewable like any other architecture docs.

### 2. Runtime/project assets
These shape actual runtime behavior.

Location:
- `AGENTS.md`
- `AGENTS.md`
- `.omp/agents/`
- `.omp/commands/`
- `.omp/extensions/`
- `.omp/skills/`
- `.omp/templates/`

The control plane lives across `.omp/extensions/` and `.firm/run-state.yml`: runtime code derives and dispatches the active governed unit, while run-state persists the current execution position on disk.

These are the concrete translation layer between The Firm design and OMP behavior.

### 3. Engagement/working artifacts
These track live work.

Location:
- `.firm/intake/`
- `.firm/engagements/`
- `.firm/artifacts/`
- `.firm/state/`

These may be partially generated, partially maintained, and partially linked from Beads or other workflow systems.

## `AGENTS.md`
`AGENTS.md` is the repo-front doctrine surface for runtime agents.

It should not duplicate the full design stack, but it should summarize the highest-priority operational truths:
- The Firm is the governing workflow
- issue-first execution is mandatory
- handoffs and QA are required
- closure in chat is not closure in workflow
- role specialization must be respected
- work must tie back to issue state and artifacts

`AGENTS.md` should act as the runtime summary of the design stack, not the sole source of policy truth.

## `.omp/agents/`
This directory is the project-local home for The Firm agent implementations or overrides.

Expected contents over time:
- office leads
- specialist agents
- client-facing roles
- workflow operations roles
- council-support or governance agents where needed

Naming should follow role semantics rather than internal experiments.

Examples:
- `.omp/agents/client_partner.md`
- `.omp/agents/intake_orchestrator.md`
- `.omp/agents/solution_architect.md`
- `.omp/agents/qa_verifier.md`

## `.omp/commands/`
This directory should contain The Firm-specific workflow entry points and helper commands.

Examples:
- engagement intake helpers
- staffing or review commands
- issue-sync helpers
- handoff or artifact generation commands

Commands should not bypass The Firm governance. They should make it easier to follow.

## `.omp/skills/`
This directory is for reusable knowledge packs that operationalize The Firm in context-sensitive ways.

Examples:
- The Firm verification skill
- The Firm handoff skill
- The Firm issue-state discipline skill
- project-specific brownfield assessment skill

Skills should reinforce doctrine and context discipline, not create a shadow governance layer.

## `.omp/templates/`
The Firm will likely need standard templates for recurring structured artifacts.

Likely candidates:
- intake template
- handoff template
- QA verdict template
- release readiness template
- council decision template

This directory is the natural place for those runtime-ready templates.

## `.firm/`
The `.firm/` directory should be reserved for engagement-local artifacts that are useful to humans and agents but are not themselves the core issue graph.

### `.firm/intake/`
Purpose:
- store intake artifacts such as `intake.yml` and `intake-summary.md`

Typical files:
- `.firm/intake/<engagement-id>/intake.yml`
- `.firm/intake/<engagement-id>/intake-summary.md`
- `.firm/intake/<engagement-id>/staffing-decision.md`

### `.firm/engagements/`
Purpose:
- store engagement-level plans and summaries

Typical files:
- engagement-plan
- review-point summaries
- change-request logs

### `.firm/artifacts/`
Purpose:
- store or index formal artifacts produced during delivery

Typical artifact families:
- design
- delivery plan
- implementation notes
- QA verdict
- release readiness
- council decision

### `.firm/templates/`
Purpose:
- repo-local artifact templates that are more engagement-facing than OMP runtime-facing

### `.firm/run-state.yml`
Purpose:
- hold the active execution state for the control plane

Typical contents:
- active engagement id
- active phase
- current unit
- owning office
- next step
- blockers
- transition history

### `.firm/state/`
Purpose:
- hold supplementary local state if needed for repository-local workflows beyond the canonical run-state file

This should not replace Beads, Dolt, or the canonical run-state file. It is for supporting local coordination, snapshots, or exports where needed.

## Beads and `.beads/`
Beads remains the canonical issue graph and readiness layer.

The repository should treat `.beads/` as the home of the issue tracker’s local data according to Beads conventions. The Firm does not redefine that storage. Instead, it treats it as the canonical work graph layer.

The Firm’s install layout should therefore coexist with `.beads/`, not try to absorb it into `.firm/`.

## Greenfield install expectation
A greenfield repo should install:
- `AGENTS.md`
- the full `.omp/internal/the-firm/` stack, including the control plane doc
- `.omp/agents/` for the initial core roles
- `.omp/extensions/` for runtime enforcement and dispatch
- `.omp/templates/` for key handoff/intake/verdict templates
- `.firm/intake/` and `.firm/artifacts/` structure
- `.firm/run-state.yml` for persisted execution state
- Beads initialized

This is the clean default footprint.

## Brownfield install expectation
A brownfield repo may start with a thinner footprint.

Recommended early footprint:
- `AGENTS.md`
- `.omp/internal/the-firm/` stack
- minimal `.omp/agents/` set for intake, architecture, QA, and workflow ops
- `.firm/intake/` for engagement setup
- `.firm/artifacts/` for pilot workstream handoffs and verdicts
- Beads initialized or connected for scoped adoption area

Brownfield repos should converge toward the full layout over time rather than require it all immediately.

## Minimal viable installation
A repo should not be called "The Firm-enabled" unless it has at least:
- `AGENTS.md`
- `.omp/internal/the-firm/README.md`
- the doctrine doc
- the workflow architecture doc
- the issue tracker model
- the verification policy
- a minimal `.omp/agents/` directory or clear plan for it
- a place for intake and handoff artifacts
- Beads initialized or the issue-control plan explicitly staged

## File ownership expectations
The Firm should make ownership of file classes legible.

### Product / governance owned
- vision
- philosophy
- doctrine
- governance docs

### Architecture / workflow owned
- workflow architecture
- issue tracker model
- context model
- operational constraints
- install layout

### Runtime implementation owned
- `.omp/agents/`
- `.omp/commands/`
- `.omp/skills/`
- `.omp/templates/`

### Engagement owned
- `.firm/intake/`
- `.firm/engagements/`
- `.firm/artifacts/`

This does not prevent collaboration, but it clarifies default stewardship.

## Artifact naming guidance
Artifacts should be named for their business function, not for the temporary agent that produced them.

Good examples:
- `intake-summary.md`
- `technical-design.md`
- `qa-verdict.md`
- `release-readiness.md`

Avoid:
- `architect-output-v2.md`
- `qa-agent-latest.md`
- `temp-plan-final-final.md`

The Firm should produce artifacts legible to humans, not only to the generating agent.

## Install anti-patterns
### 1. Putting all policy into `AGENTS.md`
This makes the runtime summary too heavy and hides the actual design stack.

### 2. Treating `.firm/` as a second issue tracker
The issue graph belongs in Beads. `.firm/` should support the workflow, not replace it.

### 3. Mixing live artifacts and permanent doctrine without structure
This creates confusion between what the firm believes and what one engagement produced.

### 4. Installing every possible agent before staffing rules exist
That invites undisciplined runtime use.

### 5. Using tool names as the only organizing principle
The structure should reflect function first, implementation second.

## Future implementation notes
This document is still structural, not procedural. Later implementation work may define:
- bootstrap scripts
- repo templates
- `.omp/agents/` starter packs
- `intake.yml` templates
- issue synchronization helpers

Those should conform to this layout rather than invent a competing one.

## Summary
The Firm install layout gives the operating model a physical home in the repository.

It separates:
- normative design documents
- runtime behavior assets
- live engagement artifacts
- issue-control state

That separation is what makes The Firm both portable and governable.
