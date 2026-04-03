# Getting Started

## Greenfield

Use The Firm in greenfield mode when you want a new repository to start with operating discipline from day zero.

The basic path is:
1. install The Firm runtime files
2. initialize issue tracking
3. define the first engagement through intake
4. staff the minimum sufficient team
5. run the first feature as a pilot engagement

## Brownfield Operating Contract

Use The Firm in brownfield mode when a repository already exists and you need a controlled adoption path. Brownfield adoption is not just an overlay—it starts with a **mandatory operating contract** that makes the current reality explicit before The Firm continues building.

### Why an Operating Contract

Without this contract, brownfield adoption forces the client to manually organize planning chaos: undocumented assumptions, hidden dependencies, and unclear boundaries. The operating contract exists so The Firm can continue building under governed structure without the client managing that complexity.

### The Contract Sequence

The brownfield bootstrap creates a deterministic artifact set that communicates:

1. **Current Reality Analysis** (`.firm/artifacts/<engagement-id>/technical-discovery.md`)
   - What exists now: code surface, architecture, verification maturity
   - Constraints that bound what can change safely
   - Hidden dependencies and coupling

2. **Restructured Backlog** (`.firm/engagements/<engagement-id>/backlog.md`)
   - Distilled chaos into ordered The Firm backlog structure
   - Explicit backlog items with priority and mapping from existing work

3. **Current Work State** (`.firm/engagements/<engagement-id>/current-work.md`)
   - Makes the assessment phase visible
   - Prevents skipping straight from bootstrap to uncontrolled implementation

4. **Engagement Plan** (`.firm/engagements/<engagement-id>/engagement-plan.md`)
   - What is being restructured and in what order
   - Staffing, phases, and review points specific to brownfield constraints

5. **Pilot Boundary Selection** (`.firm/artifacts/<engagement-id>/pilot-boundary.md`)
   - A scoped area where The Firm operates first
   - Explicit boundary definition: what is in and out of the pilot
   - Success criteria before ratcheting governance outward

### Assessment-First, Not Full Migration

The brownfield bootstrap is assessment-first. It scaffolds the operating contract and defines boundaries—it does not automatically restructure the entire repository. The pilot phase proves the contract works before wider execution.

### The Brownfield Bootstrap Command

```bash
.omp/scripts/the-firm-bootstrap.sh brownfield \\
  --engagement-id eng-001 \
  --repo-root /path/to/existing-repo \
  --client-name "Client Name" \
  --request-title "Adopt The Firm" \\
  --init-beads \
  --seed-issues
```

This creates the operating contract structure. The actual restructuring happens through governed delivery after the contract is established.
## In practice



## Optional Initial Issue Seeding

If `bd` is available and you want the bootstrap to create the first minimal issue tree immediately, add:

```bash
--init-beads --seed-issues
```

This currently seeds only:
- one initiative
- one feature beneath it

That keeps the bootstrap issue-first without pretending to know the full roadmap.


## Validate the Scaffold

After bootstrap, validate the target repo with:

```bash
.omp/scripts/the-firm-validate.sh --repo-root /path/to/target-repo
```

If issue control must already be active, use:

```bash
.omp/scripts/the-firm-validate.sh --repo-root /path/to/target-repo --require-beads
```