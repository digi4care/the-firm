# Brownfield Adoption

Adopting The Firm in an existing codebase requires a different approach than greenfield. The brownfield operating contract exists to make current reality explicit before The Firm continues building.

## The Core Problem

Existing repositories contain:
- Undocumented assumptions
- Hidden dependencies
- Unclear boundaries
- Varying verification maturity
- Organic growth without design records

Without a contract, brownfield adoption forces you to manually organize this chaos while also trying to adopt new operating discipline. The contract does the organizing first.

## The Operating Contract

The brownfield bootstrap creates a deterministic artifact set that must exist before serious delivery continues:

| Artifact | Purpose | Location |
|----------|---------|----------|
| Technical discovery | Current reality analysis | `.firm/artifacts/<eng>/technical-discovery.md` |
| Restructured backlog | Ordered backlog from current reality | `.firm/engagements/<eng>/backlog.md` |
| Current work state | Visible active phase | `.firm/engagements/<eng>/current-work.md` |
| Engagement plan | What to restructure, in what order | `.firm/engagements/<eng>/engagement-plan.md` |
| Pilot boundary | Explicit scoped area for initial operation | `.firm/artifacts/<eng>/pilot-boundary.md` |

### What the Contract Establishes

1. **Current reality is known**: What exists, what constrains change, what would break
2. **Chaos is distilled**: Existing work items mapped to structured backlog
3. **Phase is visible**: Assessment comes first, implementation follows
4. **Scope is bounded**: Pilot boundary defines where The Firm operates initially
5. **Success criteria are explicit**: What must be true before ratcheting governance outward

### What the Contract Does Not Do

- Automatically restructure the entire repository
- Migrate all existing issues/processes to The Firm structure
- Promise immediate full governance coverage
- Remove technical debt

The contract creates structure. The pilot phase proves it. Wider execution follows.

## Bootstrap Command

```bash
.omp/scripts/the-firm-bootstrap.sh brownfield \
  --engagement-id eng-001 \
  --repo-root /path/to/existing-repo \
  --client-name "Client Name" \
  --request-title "Adopt The Firm" \
  --init-beads \
  --seed-issues
```

### Required Arguments

| Argument | Purpose |
|----------|---------|
| `--engagement-id` | Unique identifier for this adoption engagement |
| `--repo-root` | Path to the existing repository |
| `--client-name` | Who is adopting The Firm |
| `--request-title` | Brief description of the adoption request |

### Optional Arguments

| Argument | Purpose |
|----------|---------|
| `--init-beads` | Initialize Beads issue tracking in the target repo |
| `--seed-issues` | Create minimal initiative + feature issue tree |
| `--force` | Refresh runtime scaffolding even if The Firm files exist |

## Assessment-First Sequence

### Phase 1: Discovery (Days 1-3)

**Goal**: Make current reality explicit.

**Activities**:
- Code surface analysis: map modules, dependencies, coupling
- Verification maturity assessment: what tests exist, what do they cover
- Architecture documentation: what patterns exist, which are consistent
- Hidden dependency mapping: what breaks if X changes

**Artifact produced**: `.firm/artifacts/<eng>/technical-discovery.md`

### Phase 2: Backlog Restructuring (Days 2-4)

**Goal**: Distill existing work into structured backlog.

**Activities**:
- Inventory existing issues, TODOs, and planned work
- Map to The Firm backlog structure (initiatives → features → tasks)
- Identify dependencies and blockers
- Assign priority based on current reality, not wishful thinking

**Artifact produced**: `.firm/engagements/<eng>/backlog.md`

### Phase 3: Boundary Selection (Days 3-5)

**Goal**: Define where The Firm operates first.

**Activities**:
- Identify a bounded area with clear interfaces
- Define what is in the pilot boundary
- Define what is outside (still important, not yet governed)
- Set success criteria for pilot completion

**Artifact produced**: `.firm/artifacts/<eng>/pilot-boundary.md`

### Phase 4: Engagement Planning (Days 4-5)

**Goal**: Plan the restructuring work itself.

**Activities**:
- Staff the minimum sufficient team
- Define phases and review points
- Identify risks specific to brownfield constraints
- Set check-in cadence

**Artifact produced**: `.firm/engagements/<eng>/engagement-plan.md`

## Pilot Phase Execution

The pilot phase proves the operating contract works before wider execution.

### Success Criteria

Before ratcheting governance outward, verify:

1. **Artifacts are created**: The team can produce and use `.firm/` artifacts
2. **Handoffs work**: Cross-office transitions happen with explicit records
3. **Issues are tracked**: Beads state is maintained and accurate
4. **QA is independent**: Verification happens outside implementation
5. **Client can follow**: Documentation explains state without reverse-engineering

### Failure Modes

| Failure | Cause | Response |
|---------|-------|----------|
| Artifacts not created | Old habits persist | Pause, review contract, retrain |
| Handoffs skipped | Urgency overrides discipline | Escalate to engagement manager |
| State not tracked | Beads seen as overhead | Demonstrate value through traceability |
| QA blocked | Insufficient verification | Provide test engineering support |

## Gradual Expansion

After the pilot succeeds, expand governance in waves:

1. **Wave 1**: Pilot boundary (proven)
2. **Wave 2**: Adjacent modules with clear interfaces
3. **Wave 3**: Core business logic
4. **Wave 4**: Legacy components (may remain partially governed)

Each wave requires:
- Updated pilot-boundary.md
- Assessment of new area
- Updated engagement plan
- Explicit go/no-go decision

## Working with Legacy Code

### Code Without Tests

Do not block adoption on full test coverage. Instead:
- Document what is tested and what is not
- Add verification plans for new work
- Gradually add tests as code is touched
- Accept higher risk tier for untested areas

### Code Without Documentation

Technical discovery creates the initial documentation. Do not:
- Try to document everything upfront
- Block on perfect understanding
- Expect original authors to explain their intent

Do:
- Document what you learn as you work
- Update discovery artifacts as understanding improves
- Accept uncertainty in initial assessments

### Code with Heavy Coupling

The pilot boundary should exclude heavily coupled areas until:
- Interfaces are clarified
- Dependencies are mapped
- Contract tests exist

## Validation

After bootstrap, validate the scaffold:

```bash
.omp/scripts/the-firm-validate.sh --repo-root /path/to/target-repo
```

If issue control must be active:

```bash
.omp/scripts/the-firm-validate.sh --repo-root /path/to/target-repo --require-beads
```

## Common Patterns

### Brownfield Adoption with Active Development

When the codebase is actively changing during adoption:
- Shorten pilot phase (3-5 days instead of 1-2 weeks)
- Accept higher uncertainty in technical discovery
- Focus on establishing rhythm over perfect documentation

### Brownfield Adoption with Stakeholder Pressure

When there is pressure to skip assessment:
- Reference the operating contract explicitly
- Explain that skipping assessment increases risk
- Offer to parallelize assessment with urgent fixes in ungoverned mode
- Do not claim governance where assessment has not happened

### Brownfield Adoption with Multiple Codebases

When adopting across multiple repositories:
- Each repo gets its own engagement
- Create a parent engagement for coordination
- Define cross-repo dependencies explicitly
- Accept that some repos may remain partially governed

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Skipping assessment | Builds on unknown foundations |
| Full migration promise | Overwhelms team, delays value |
| Pretending legacy is greenfield | Creates false confidence |
| Governance without understanding | Produces wrong constraints |
| Forgetting the pilot boundary | Loses focus, dilutes effort |

## See Also

- [bootstrap.md](./bootstrap.md) — Bootstrap command reference
- [validation.md](./validation.md) — Validating the scaffold
- [getting-started.md](./getting-started.md) — Greenfield and brownfield paths
- [.firm/README.md](/.firm/README.md) — Artifact structure

---

**Rule**: The brownfield contract is mandatory. Do not continue building until current reality is explicit.

**Rule**: Assessment-first means assessment happens before restructuring, not in parallel, not after.

**Rule**: The pilot boundary protects both The Firm and the existing codebase. Respect it until success criteria are met.

---

## FAQ

**Q: How long should the assessment phase take?**

Small codebase (under 10k lines): 2-3 days. Medium (10k-100k): 3-5 days. Large (100k+): 1-2 weeks. These are estimates; actual duration depends on code quality and documentation state.

**Q: What if we find critical issues during assessment?**

Document them in technical-discovery.md. Create urgent issues in the backlog. The engagement manager decides whether to pause adoption for fixes or continue with documented risks.

**Q: Can we adopt The Firm incrementally without the full contract?**

No. The contract exists to prevent partial adoption that creates false confidence. You can scope the pilot boundary narrowly, but the full artifact set must exist.

**Q: What happens to existing issues during adoption?**

They are inventoried and mapped to the restructured backlog. Some may be closed as obsolete. Others may be reprioritized based on current reality.

**Q: Can we use The Firm for new features while legacy code remains ungoverned?**

Yes. This is the purpose of the pilot boundary. New features within the boundary are fully governed. Legacy outside the boundary may remain partially governed until brought inside.
