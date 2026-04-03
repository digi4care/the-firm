# Source of Truth

The Firm maintains truth across multiple systems. Understanding what each system owns prevents confusion about where to look and what to trust.

## The Truth Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Decision Truth                                    │
│  → .firm/artifacts/ — Design, verification, release records │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: State Truth                                       │
│  → Beads/Dolt — Issue state, readiness, blockers            │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Code Truth                                        │
│  → Git — File content, code history                         │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Execution Truth                                   │
│  → AGENTS.md + .pi/ — Runtime behavior, role definitions   │
└─────────────────────────────────────────────────────────────┘
```

## System Responsibilities

### Git: Code and File Truth

Git owns:

- Source code files
- `.firm/` artifact files
- Configuration files
- Script files
- Documentation files

Git does not own:

- Issue state
- Workflow history
- Runtime behavior

**What to look for in Git**:

- What the code does
- What artifacts exist
- What changed and when

### Beads: Issue State Truth

Beads owns:

- Work item existence
- Issue status (proposed, ready, in_progress, etc.)
- Dependencies and blockers
- Readiness criteria
- Priority and assignment

Beads does not own:

- File content
- Design decisions
- Code changes

**What to look for in Beads**:

- What work items exist
- What state they are in
- What blocks what
- What is ready to start

### Dolt: Versioned Workflow History

Dolt owns:

- Historical issue states
- State transitions with timestamps
- Evidence records
- Audit trail

Dolt does not own:

- Current file content
- Design rationale
- Future plans

**What to look for in Dolt**:

- What happened when
- Who changed what (via query)
- Historical patterns

### `.firm/` Artifacts: Decision Truth

`.firm/` owns:

- Design decisions and rationale
- Handoff context and acceptance criteria
- Verification requirements
- Release decisions
- Change request history

`.firm/` does not own:

- Code implementation
- Issue state
- Automatic synchronization

**What to look for in `.firm/`**:

- Why a decision was made
- What was handed off and when
- What proof was required
- What risks were known

### `AGENTS.md` + `.pi/`: Execution Truth

`AGENTS.md` and `.pi/` own:

- How agents behave
- Role boundaries
- Handoff requirements
- Artifact templates

They do not own:

- Specific decisions
- Issue content
- Code logic

**What to look for in `AGENTS.md` + `.pi/`**:

- What a role should do
- How to create an artifact
- What escalation path to use

## Cross-System Contracts

### Artifact-to-Issue Contract

Issues reference artifacts by path. Artifact state drives issue transitions.

| Artifact Path | Purpose | Linked Issue Stage |
|--------------|---------|-------------------|
| `intake/<eng>/intake.yml` | Intake classification | `triaged` → `ready` |
| `artifacts/<eng>/technical-design.md` | Design lock | `ready` (before claim) |
| `artifacts/<eng>/verification-plan.md` | How to verify | `review_pending` → `qa_pending` |
| `artifacts/<eng>/qa-verdict.md` | QA decision | `qa_pending` → `verified`/`blocked` |
| `artifacts/<eng>/release-readiness.md` | Release decision | `verified` → `closed` |

**Rule**: The link must be explicit. An artifact exists but is not linked is invisible to the workflow.

### Code-to-Artifact Contract

Code changes should reference the design artifact that authorized them:

- Commit messages may reference `technical-design.md`
- PR descriptions may link to related issues
- Code comments may reference verification plans

**Rule**: Code explains what. Artifacts explain why.

### State-to-Evidence Contract

Issue state claims must be supported by evidence:

- `verified` requires `qa-verdict.md`
- `ready` requires `technical-design.md`
- `closed` requires `release-readiness.md`

**Rule**: State without evidence is a lie.

## Truth Verification

### Verifying Issue State

```bash
# Check current state
bd show <issue-id>

# Check state history
bd log <issue-id>

# Check what blocks an issue
bd blockers <issue-id>
```

### Verifying Artifacts

```bash
# Check what artifacts exist for an engagement
ls .firm/artifacts/<eng>/

# Check artifact content
cat .firm/artifacts/<eng>/technical-design.md

# Check git history for an artifact
git log .firm/artifacts/<eng>/technical-design.md
```

### Verifying Code

```bash
# Check what code changed
git log --oneline

# Check what issues reference a file
grep -r "<issue-id>" .firm/
```

## Common Confusion Scenarios

### "The issue says verified but I cannot find the QA verdict"

**Problem**: State truth (Beads) and decision truth (artifacts) are out of sync.

**Resolution**:

1. Check if `qa-verdict.md` exists in `.firm/artifacts/<eng>/`
2. If it exists but is not linked, link it
3. If it does not exist, the issue state is wrong—revert to `qa_pending`

### "The design says X but the code does Y"

**Problem**: Decision truth (artifacts) and code truth (Git) are out of sync.

**Resolution**:

1. Check if design was updated after code was written
2. If code is correct, update design artifact
3. If design is correct, create code fix issue

### "The agent did something unexpected"

**Problem**: Execution truth (`AGENTS.md`) and actual behavior differ.

**Resolution**:

1. Check `AGENTS.md` for expected behavior
2. Check agent definition in `.pi/agents/`
3. If agent behavior is wrong, escalate to fix agent
4. If agent behavior is correct but surprising, update documentation

### "I cannot tell when this decision was made"

**Problem**: Dolt history and artifact history are not aligned.

**Resolution**:

1. Check Dolt for workflow state transitions
2. Check Git for artifact file history
3. Cross-reference timestamps to reconstruct timeline

## Maintaining Truth Integrity

### For Operators

- Always update both artifact and issue state together
- Never assume synchronization happens automatically
- Verify state before acting on it
- Document decisions in artifacts, not just in chat

### For Agents

- Read issue state before claiming work
- Read relevant artifacts before starting implementation
- Write artifacts before updating issue state
- Reference artifacts when updating issue state

### For Leads

- Review cross-system consistency during milestones
- Investigate patterns of inconsistency
- Update contracts when patterns reveal gaps

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Trusting issue state without checking artifacts | May act on stale or incorrect information |
| Updating artifacts without updating issues | Downstream work may not start |
| Updating issues without creating artifacts | Decision rationale is lost |
| Assuming automatic sync | Systems do not synchronize automatically |
| Treating chat as truth | No audit trail, no verification |

## Recovery Procedures

### When Issue State is Wrong

1. Document the correct state in an artifact
2. Update issue state to match
3. Add note explaining the correction

### When Artifacts are Missing

1. Create missing artifact with available information
2. Mark as "retroactive" if created after the fact
3. Update issue state to reflect actual progress

### When Systems Diverge Significantly

1. Pause new work
2. Audit current state across all systems
3. Reconcile with explicit decisions
4. Document what went wrong
5. Resume with verification step

## See Also

- [issue-workflow.md](./issue-workflow.md) — Issue state machine and artifact linking
- [architecture.md](./architecture.md) — System architecture and data flow
- [.firm/README.md](/.firm/README.md) — Artifact structure and rules

---

**Rule**: Each system owns its truth. Do not ask Git to track workflow state. Do not ask Beads to store design rationale.

**Rule**: Cross-system links must be explicit. Implicit links break when any system changes.

**Rule**: When systems disagree, stop and reconcile. Acting on inconsistent truth produces inconsistent results.

---

## FAQ

**Q: Why not have automatic synchronization between Beads and artifacts?**

Automatic synchronization would hide important handoff decisions. The explicit step ensures someone has reviewed and approved each state change. It also prevents race conditions where artifact and issue are updated simultaneously with different intent.

**Q: What is the source of truth for "is this work done"?**

Issue state in Beads is the operational source of truth. However, `verified` or `closed` state must be backed by artifacts (`qa-verdict.md`, `release-readiness.md`). The issue state is the contract; the artifacts are the evidence.

**Q: How do I know if an artifact is current?**

Check the git history for the artifact file. Check the issue state that references it. If the artifact was updated after the issue transitioned past it, the artifact may be retrospective documentation.

**Q: Can I rely on Dolt for current state?**

Dolt tracks history. Beads provides current state interface. For current state, use Beads commands. For historical analysis, query Dolt directly.

**Q: What happens if `.firm/` is deleted?**

Decision truth is lost. Issue state in Beads remains, but the rationale for decisions is gone. Restore from Git backup. This is why `.firm/` is versioned in Git.
