# AI Agent Workflow

Mandatory. Read before changing anything in this repo.

## Decision Ladder

1. Configure existing behavior.
2. Use an existing extension point.
3. Add a small hook/registry/contributor point.
4. Patch core — only when necessary, document why.

If step 4 seems needed, first ask: should this be a reusable seam?

Refs: `docs/architecture/core-vs-extension.md`, `docs/adr/0001-small-kernel-extensible-platform.md`

## Branches

```
original → development → production
```

- `original` — upstream mirror. **No product work.**
- `development` — **default branch.** Base for all feature/fix branches.
- `production` — releases only.

### Feature branches

Every feature, bugfix, refactor, or research task gets its own branch and worktree.

**Branch naming:** `<type>/<beads-id>-<short-slug>`

Types: `feat`, `fix`, `refactor`, `research`, `docs`, `chore`

```
feat/42-add-sso-login
fix/17-crash-on-empty-input
refactor/31-split-auth-module
research/8-evaluate-time-series-db
```

**Worktree convention:**

```
.worktrees/the-firm-<beads-id>
```

Example:
```
.worktrees/the-firm-42
```

### Worktree lifecycle

```bash
# 1. Create branch + worktree from development
git worktree add .worktrees/the-firm-42 -b feat/42-add-sso-login development

# 2. Work in the worktree
cd .worktrees/the-firm-42
# ... implement, commit ...

# 3. Merge back into development
cd <main-repo>
git checkout development
git merge --no-ff feat/42-add-sso-login

# 4. Clean up
git worktree remove .worktrees/the-firm-42
git branch -d feat/42-add-sso-login
```

**Rules:**
- One worktree per active task. No working directly on `development`.
- If a worktree for the same beads ID already exists, reuse it — do not create a duplicate.
- Remove worktree and branch after merge.
- `.worktrees/` is in `.gitignore` — never committed.
- If work is abandoned, still clean up the worktree. Note the abandonment in Beads.

## Versioning

- Own semver line, independent from upstream pi. First release: `0.0.1`.
- Bump only when the user explicitly asks. Pre-`1.0.0`: patch=fix, minor=capability, major=breaking.
- Cut versions from `production` only.
- Record upstream base in `docs/upstream/BASELINE.md`.
- Never collapse upstream lineage into The Firm's version.
- Refs: `docs/adr/0002-versioning-strategy.md`, `docs/releasing.md`, `docs/upstream/`

## Beads (`bd`)

Track all serious work with Beads, not ad-hoc lists.

```bash
bd prime                    # init
bd ready                    # available work
bd search <q>               # search issues
bd show <id> --long         # read issue
bd create <title> [desc]    # new issue
bd update <id> --claim      # claim
bd update <id> --notes "…"  # add notes
bd close <id>               # close
```

- Local-only mode. `.beads/` not tracked. Missing Dolt remote is not an error.
- `bd dolt push` only if user configured a remote.

### Start-of-Work (mandatory, in order)

1. **Search Beads** — `bd search`, `bd ready`. Search broadly: similar bugs, regressions, symptoms, providers, past fixes.
2. **If found** — `bd show <id> --long`. If bug is returning, treat as regression, note it.
3. **If not found** — `bd create` with detail. Reference similar past issues.
4. **Claim** — `bd update <id> --claim`.
5. **Create worktree** — one per task, always:
   ```bash
   git worktree add .worktrees/the-firm-<id> -b <type>/<id>-<slug> development
   ```
   If `.worktrees/the-firm-<id>` already exists, reuse it.
6. **Now** you may edit code/docs/config.
7. **Update notes** during work — `bd update <id> --notes "…"`.

### Traceability

Leave a chain: **symptom → history → implementation → verification**.

On claim: record search terms, issue IDs checked, classify (existing/new/duplicate/follow-up/regression).
On create: reference earlier issues, fixes, regressions.
On regression: state which earlier fix regressed.
During work: note key decisions, files changed, remaining items.
Before close: record what was verified, with which commands.
**Never leave reasons implicit. Write it in Beads.**

## Git

- All work happens in worktrees. Never commit on `development` directly.
- Atomic commits. One logical change per commit.
- Explicit staging only: `git add <file>` — never `git add .` or `-A`.
- `git status` before every commit.
- No destructive commands: no `reset --hard`, `checkout .`, `clean -fd`.
- After merge: remove worktree + delete feature branch.

## Code Quality

- No `any` unless unavoidable. Check real types before guessing APIs.
- Minimal, targeted changes. No broad churn on upstream code without approval.
- No removing intentional functionality without asking.
- Prefer local duplication over premature abstraction. Extract only after a pattern is clear, stable, and named.
- Avoid generic names: `utils`, `helpers`, `misc`, `common`, `manager`, `processor`.
- Respect package/import boundaries. No arbitrary cross-layer dependencies.
- SOLID is heuristic, not mandate.
- New hooks/registries/adapters need justification: what problem, why simpler code won't do, what reuse value.

Refs: `docs/architecture/code-quality.md`, `docs/adr/0003-code-quality-doctrine.md`

## Commands

```
npm install                       # deps
npm run firm-dev -- --help        # run from source
npm run build                     # build all
npm run check                     # code checks
npm run lint:md                   # markdown lint
npm run deps:check                # check dep updates
npm run deps:update:interactive   # apply interactively
npm run deps:update               # apply all
```

Do not use npm-check-updates on internal workspace package versions.

## GitHub

```bash
gh issue view <n> --json title,body,comments,labels,state
```

Post comments via `--body-file`. Preview before posting. Keep concise and technical.

## Tool Rules

- Never `sed`/`cat` to read files — use the read tool.
- Read files fully before editing.
- Prefer precise edits over full rewrites.

## Archive

`docs/archive/upstream-pi-mono/` — reference only. Active rules: `README.md`, `AGENTS.md`, this file.
