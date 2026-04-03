# Validation

The Firm bootstrap process should be followed by validation.

## Validator command

```bash
.omp/scripts/the-firm-validate.sh --repo-root /path/to/target-repo
```

If you want to require active issue control as part of validation:

```bash
.omp/scripts/the-firm-validate.sh --repo-root /path/to/target-repo --require-beads
```

## What it checks
The validator currently checks for:
- `AGENTS.md`
- `.omp/agents/`
- `.omp/templates/`
- `.firm/README.md`
- `.firm/intake/`
- `.firm/engagements/`
- `.firm/artifacts/`
- optional Beads initialization
- `.firm/` guidance in `AGENTS.md`
- execution-root/path-discipline guidance in `AGENTS.md`

## Why it matters
Bootstrap creates a scaffold.
Validation checks whether that scaffold is strong enough to be treated as a real The Firm starting point rather than a loose copy of files.
