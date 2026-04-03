# Workspace Policy

The Firm operates with explicit workspace discipline. This document explains execution roots, path resolution, and the policy that prevents path-related errors.

## Core Concept: Execution Root

The execution root is the canonical directory against which all relative paths are resolved. It is not necessarily the shell's current working directory.

```
Shell CWD: /home/user/projects/the-firm/.omp/commands/front-desk/
            ↓
Execution Root: /home/user/projects/the-firm/
            ↓
Relative path "docs/overview.md" resolves to:
            /home/user/projects/the-firm/docs/overview.md
```

## Why Execution Root Matters

### Problem: Transient Shell Context

Agents may be invoked from:
- Repository root
- Subdirectories within the repository
- Outside the repository entirely
- Temporary working directories

If agents resolve paths against the shell CWD, behavior becomes unpredictable.

### Solution: Explicit Execution Root

The Firm requires:
1. Execution root is determined at the start of work
2. All relative paths resolve against execution root
3. Absolute paths are used only when necessary
4. Path ambiguity stops work until resolved

## Workspace Modes

### Canonical Root Mode

**When**: Working within a single repository

**Execution root**: Repository root directory

**Path resolution**:
```
Relative path: "docs/overview.md"
Resolves to: "{execution_root}/docs/overview.md"
```

**Configuration in intake.yml**:
```yaml
repository:
  workspace_mode: canonical-root
  execution_root: "/absolute/path/to/repo"
```

### Worktree Mode

**When**: Working across multiple worktrees or branches

**Execution root**: Specific worktree root

**Path resolution**: Same as canonical root, but execution root varies per worktree

**Configuration in intake.yml**:
```yaml
repository:
  workspace_mode: worktree
  execution_root: "/absolute/path/to/worktree"
```

## Path Modes

### Repo-Relative Paths

**Default mode**: All paths are relative to execution root

**Example**:
```
Execution root: /home/user/projects/the-firm/
Path: "docs/overview.md"
Resolves to: /home/user/projects/the-firm/docs/overview.md
```

**When to use**: Always, unless you have a specific reason for absolute paths

### Absolute Paths

**When required**:
- Referencing files outside the execution root
- System paths (/etc, /usr, etc.)
- Temporary files in /tmp
- External tool paths

**Policy**: Use absolute paths only when necessary. Document why in comments.

## Artifact Root and Runtime Root

The Firm separates two concerns:

| Directory | Purpose | Default |
|-----------|---------|---------|
| `artifact_root` | Structured engagement artifacts | `.firm` |
| `runtime_root` | Agent definitions, templates, commands | `.omp` |

**Configuration in intake.yml**:
```yaml
repository:
  artifact_root: ".firm"
  runtime_root: ".omp"
```

**Resolving artifact paths**:
```
Artifact: "{artifact_root}/artifacts/{eng}/technical-design.md"
Resolves to: "{execution_root}/.firm/artifacts/{eng}/technical-design.md"
```

## Path Discipline Rules

### Rule 1: Determine Execution Root Before Work

At the start of any session:
1. Identify the canonical repository root
2. Verify `AGENTS.md` exists there
3. Set execution root to that directory
4. Resolve all subsequent paths against it

### Rule 2: Stop on Ambiguity

If the target repository or execution root is ambiguous:
1. Stop work
2. Re-bind to explicit execution root
3. Confirm with user if necessary
4. Resume with resolved root

### Rule 3: Never Rely on Shell CWD

Shell current working directory is transient context. Do not:
- Assume CWD is the repository root
- Write code that depends on CWD
- Trust that `../` resolves predictably

### Rule 4: Use Path Helpers

When available, use path-aware helper commands with their real interface:
```
omp run link-artifact <issue-id> --type=<artifact-type> --engagement=<engagement-id>
```

These helpers keep artifact paths repo-relative and engagement-scoped instead of relying on shell cwd.

### Rule 5: Document Absolute Paths

When absolute paths are required, document why:
```yaml
# Using absolute path because this references system configuration
path: "/etc/the-firm/config.yml"
reason: "System-level configuration outside repo"
```

## Common Path Scenarios

### Reading Files

**Correct**:
```
Execution root: /home/user/projects/the-firm/
Read: "docs/overview.md"
Resolves to: /home/user/projects/the-firm/docs/overview.md
```

**Incorrect**:
```
Shell CWD: /home/user/projects/the-firm/docs/
Read: "overview.md" (relative to CWD)
Fails if CWD changes
```

### Writing Artifacts

**Correct**:
```
Execution root: /home/user/projects/the-firm/
Write to: ".firm/artifacts/eng-001/design.md"
Resolves to: /home/user/projects/the-firm/.firm/artifacts/eng-001/design.md
```

**Incorrect**:
```
Write to: "./.firm/artifacts/eng-001/design.md"
Resolves relative to CWD, not execution root
```

### Referencing Across Engagements

**Correct**:
```
Current engagement: eng-002
Reference: "See .firm/artifacts/eng-001/technical-discovery.md"
Path is repo-relative, works from any engagement
```

**Incorrect**:
```
Reference: "See ../eng-001/technical-discovery.md"
Assumes directory structure that may change
```

## Workspace Configuration

### Per-Repository Configuration

Each repository has workspace policy defined in:
- `.firm/intake/<eng>/intake.yml` (per-engagement)
- Top-level configuration (repository default)

### Per-Session Configuration

Agents may override execution root for specific operations:
```
--execution-root=/path/to/other/repo
```

This is rare and should be documented.

## Path Validation

The validator checks for path discipline:

```bash
.omp/scripts/the-firm-validate.sh --repo-root /path/to/target-repo
```

Checks include:
- `AGENTS.md` exists at root
- `.firm/` directory exists
- `.omp/` directory exists
- Path references in artifacts are consistent

## Error Handling

### Path Not Found

If a path resolves but file does not exist:
1. Check if path was intended to be created
2. Check if execution root is wrong
3. Create file if this is the first write
4. Report error if file should exist

### Ambiguous Execution Root

If multiple repositories or unclear structure:
1. Stop and ask for explicit execution root
2. Do not guess based on file existence
3. Document the resolved root

### Cross-Repository References

When work spans multiple repositories:
1. Each repository has its own execution root
2. Cross-repo references use absolute paths
3. Document the relationship

## Anti-Patterns

| Anti-Pattern | Why It Fails |
|--------------|--------------|
| Resolving paths against shell CWD | Behavior changes with invocation context |
| Assuming `../` resolves predictably | Directory structure may change |
| Mixing repo-relative and CWD-relative paths | Inconsistent behavior |
| Not documenting absolute paths | Unclear why path is absolute |
| Ignoring execution root binding | Files written to wrong location |

## Tools and Helpers

### Path Resolution in Commands

Built-in commands should be invoked with engagement-aware arguments:
```bash
# Link a design artifact to an issue inside the current engagement
omp run link-artifact bd-42 --type=design --engagement=eng-001

# The helper emits repo-relative artifact paths for the engagement
```

### Path Resolution in Agents

Agent definitions specify path handling:
```yaml
path_mode: repo-relative
execution_root: required
```

Agents stop if execution root is not determined.

## See Also

- [bootstrap.md](./bootstrap.md) — Bootstrap and workspace setup
- [getting-started.md](./getting-started.md) — Initial workspace configuration
- [AGENTS.md](/AGENTS.md) — Execution root discipline in agent doctrine

---

**Rule**: The execution root is the canonical repository root, not the shell CWD. All relative paths resolve against execution root.

**Rule**: Path ambiguity stops work. Do not guess. Determine the execution root explicitly.

**Rule**: Document absolute paths. They should be the exception, not the rule.

---

## FAQ

**Q: How do I determine the execution root programmatically?**

Look for `AGENTS.md` in ancestor directories. The directory containing `AGENTS.md` is the execution root. If not found, stop and ask.

**Q: Can I work on multiple repositories simultaneously?**

Yes, but each has its own execution root. Switch between them explicitly. Do not assume paths from one repo work in another.

**Q: What if the user wants to work in a subdirectory?**

The execution root remains the repository root. The subdirectory is just a path within that root. Work happens at execution root level, not subdirectory level.

**Q: How do path modes interact with symlinks?**

Symlinks are resolved before path mode is applied. If `docs` is a symlink to `documentation/`, `docs/overview.md` resolves to `documentation/overview.md` relative to execution root.

**Q: What happens if `artifact_root` or `runtime_root` are changed?**

The configuration in `intake.yml` controls where artifacts and runtime files are located. Changing these after bootstrap requires moving existing files or updating configuration in all engagements.
