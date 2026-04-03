# Issue Workflow

The Firm is issue-first.

That means serious work should begin from a governed work item, not from chat momentum alone.

## Core systems
- Git tracks files and code history
- Beads tracks work items, dependencies, readiness, blockers, and closure state
- `.firm/` stores structured engagement, design, handoff, QA, and release artifacts

## Typical flow
1. Intake creates the first engagement context
2. Issue control is initialized or verified
3. The first initiative and feature work items are created
4. Design and delivery artifacts are linked to those work items
5. QA and release decisions are reflected back into issue state

## Lifecycle thinking
The exact issue states may vary by work item type, but the core pattern is:
- proposed
- triaged
- ready
- claimed
- in_progress
- review_pending
- qa_pending
- blocked
- verified
- closed

## Handoffs Matter

A downstream office should not inherit an ambiguous state. Use artifacts and issue transitions together:

- **Handoff artifact** explains what changed (the context)
- **Issue state** explains what is now legally true (the contract)

Artifacts under `.firm/` carry the work; Beads issues track state. This section explains the **artifact-to-issue contract**: which artifacts link to which issue stages, and why.

| Artifact Path | Purpose | Linked Issue Stage | How to Link |
|--------------|---------|-------------------|-------------|
| `intake/<eng>/intake.yml` | Intake classification record | `triaged` → `ready` | Add `issue_id` field to intake record |
| `intake/<eng>/staffing-decision.md` | Who works on this | `ready` | Reference engagement and planned issue IDs |
| `engagements/<eng>/engagement.yml` | Engagement state | `claimed` → `in_progress` | List `active_work_items` with issue IDs |
| `engagements/<eng>/current-work.md` | What is being worked now | `in_progress` | Reference current issue ID at top of document |
| `artifacts/<eng>/technical-design.md` | Design lock artifact | `ready` (before claim) | Include design issue ID in frontmatter or header |
| `artifacts/<eng>/delivery-plan.md` | Delivery planning | `ready` | Reference implementation issue IDs |
| `artifacts/<eng>/verification-plan.md` | How to verify | `review_pending` → `qa_pending` | Link to verification issue |
| `artifacts/<eng>/qa-verdict.md` | QA decision | `qa_pending` → `verified`/`blocked` | Include verdict outcome and linked issue IDs |
| `artifacts/<eng>/release-readiness.md` | Release decision | `verified` → `closed` | Reference all closed issue IDs |

### Why This Contract Exists

- **Artifacts explain context**: A design document explains *why* a decision was made
- **Issues explain state**: An issue in `qa_pending` tells you *what* is legally true now
- **Links enable traceability**: Without explicit links, you cannot reconstruct what artifact produced what state change

### File Naming Conventions

- Use kebab-case: `technical-design.md`, not `technicalDesign.md`
- Include engagement ID in path: `artifacts/eng-001/`
- Use descriptive prefixes for multiple artifacts: `api-design.md`, `db-design.md`
## Minimal Bootstrap Issue Tree vs. Governed Operations

The bootstrap can optionally seed a minimal issue tree: one initiative and one feature. This is **intentional minimalism**—the bootstrap creates the minimum governed work structure, not your entire roadmap.

```bash
# Bootstrap with minimal issue tree
.omp/scripts/the-firm-bootstrap.sh greenfield --engagement-id eng-001 --init-beads --seed-issues
```

After bootstrap, use governed operations to expand:

- Use `/skill:backlog-distillation` to structure multiple workstreams
- Use `bd create` directly for single well-understood items
- Always link new issues to parent initiatives or features

## Helper Path for Issue Tree Creation

### Option 1: Bootstrap with `--seed-issues` (Recommended for new repos)

Creates the minimal pair during bootstrap:

1. One initiative: the first governed engagement workstream
2. One feature: child of that initiative

### Option 2: Manual Creation with Beads

```bash
# Create initiative
bd create "Build Authentication System" --type epic --priority P0 --labels the-firm,security

# Create child feature
bd create "Implement OAuth2 Login" --type feature --priority P1 --parent <initiative-id> --labels the-firm,backend
```

### Option 3: Helper Command

Use `omp run issue-tree <engagement-id> [--initiative-title=...] [--feature-title=...]` when you want the concrete command sequence for the first governed pair, including the required `active_work_items` update in `engagement.yml`.

### Option 4: Backlog Distillation Skill

Use `/skill:backlog-distillation` when the client provides multiple asks or the scope is unclear. This produces a structured backlog with explicit priorities and dependencies before any issues are created.

## Intake State vs Engagement State

The Firm treats intake state and engagement state as related but different things.

- Intake state governs qualification: `new`, `clarifying`, `classified`, `staffing_pending`, `approved`, `in_delivery`, `paused`, `closed`
- Engagement state governs the longer-lived delivery object once intake has been approved and handed into active work

This prevents the intake record from becoming the only long-term state object for delivery work.

## Handoff-Aware Issue State Updates

When work moves between offices (Product → Architecture → Engineering → QA), both artifacts and issue state must be updated together.

### The Handoff Pattern

1. **Create the handoff artifact** documenting what changed and why
   - Recommended helper path: `omp run handoff-state <issue-id> --to=<state> --from=<role> --to-role=<role> --engagement=<engagement-id>`
   - This copies `.omp/templates/handoff.yml` into `.firm/artifacts/<engagement-id>/handoff-<issue>-<from>-to-<to>.yml`
   - Include: before/after state, delivered artifacts, decisions made, known limitations

2. **Update the issue state** to reflect what is now legally true
   - Use `bd update <issue-id> --status <state> --append-notes ...`
   - Do not move state first and invent the artifact later

3. **Reference the artifact** in the issue or engagement state
   - Use `bd update <issue-id> --append-notes "Artifact: <path>" --set-metadata artifact=<path>`
   - Keep `engagement.yml` / `current-work.md` aligned when active work changes

### Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Correct Approach |
|--------------|--------------|------------------|
| Update issue state with no artifact | No explanation for why state changed | Create artifact first, then update state |
| Create artifact but don't update issue | State is a lie | Always update issue state to match reality |
| Put full implementation detail in issue | Issues track state, not content | Keep details in artifacts, state in issues |
| Link to artifact without reading it | Links don't substitute for review | Read artifact before approving state change |

### Office-to-Office Handoffs

| From | To | Artifact Created | Issue Transition |
|------|-----|------------------|------------------|
| Product | Architecture | `technical-design.md` | `proposed` → `ready` |
| Architecture | Engineering | `delivery-plan.md` | `ready` → `claimed` |
| Engineering | QA | `handoff-<issue>-engineering-to-qa.yml` | `in_progress` → `review_pending` |
| QA | Release | `qa-verdict.md` | `qa_pending` → `verified`/`blocked` |

Each handoff requires both: the artifact (what changed) and the issue transition (what is now true).

### Beads Synchronization Notes

Beads is the issue control plane; `.firm/` artifacts are the engagement record. The Firm does **not** provide automatic synchronization between them—you must:

1. Create/update artifacts explicitly
2. Update Beads issue state explicitly
3. Maintain links between them explicitly

This is intentional. Automatic synchronization would hide important handoff decisions. The explicit step ensures someone has reviewed and approved each state change.