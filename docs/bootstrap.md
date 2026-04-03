# Bootstrap

The Firm currently provides a practical bootstrap script rather than a full installer.

## Greenfield

```bash
.omp/scripts/the-firm-bootstrap.sh greenfield \\
  --engagement-id eng-001 \
  --repo-root /path/to/target-repo \
  --client-name "Client Name" \
  --request-title "Bootstrap Request" \
  --init-beads \
  --seed-issues
```

This mode is for new repositories that should start under The Firm from day zero.

## Brownfield Operating Contract

The brownfield bootstrap establishes a mandatory operating contract for existing repositories. This is not a full migration—it is an assessment-first scaffold that lets The Firm continue building under governed structure without forcing the client to manually organize planning chaos.

```bash
.omp/scripts/the-firm-bootstrap.sh brownfield \\
  --engagement-id eng-001 \
  --repo-root /path/to/existing-repo \
  --client-name "Client Name" \
  --request-title "Adopt The Firm" \\
  --init-beads \
  --seed-issues
```

### What the contract establishes

The brownfield scaffold creates a deterministic artifact set that must exist before The Firm continues building:

| Artifact | Purpose |
|----------|---------|
| `.firm/artifacts/<engagement-id>/technical-discovery.md` | Current reality analysis: what exists, what constrains change |
| `.firm/engagements/<engagement-id>/backlog.md` | Restructured backlog from current repository reality |
| `.firm/engagements/<engagement-id>/current-work.md` | Visible active phase state during assessment-first adoption |
| `.firm/engagements/<engagement-id>/engagement-plan.md` | What is being restructured, in what order, with what staffing |
| `.firm/artifacts/<engagement-id>/pilot-boundary.md` | Explicit scoped area for initial The Firm operation |

### What the contract does not do

- Automatically restructure the entire repository
- Migrate all existing issues/processes to The Firm structure
- Promise immediate full governance coverage

The contract creates the structure. The pilot phase proves it. Wider execution follows.
## What gets scaffolded
- `AGENTS.md`
- `.omp/agents/`
- `.omp/templates/`
- `.firm/README.md`
- `.firm/intake/<engagement-id>/`
- `.firm/engagements/<engagement-id>/`
- `.firm/artifacts/<engagement-id>/`

## What it does not do yet
- full brownfield migration
- complete roadmap creation
- full installer logic
- advanced validation beyond the bootstrap output itself

## Safe behavior
The script is designed to:
- initialize git when missing
- refuse to overwrite an existing engagement directory
- require `--force` before refreshing runtime scaffolding into a repo that already contains The Firm files
- optionally initialize Beads
- optionally seed a minimal initiative + feature issue tree
