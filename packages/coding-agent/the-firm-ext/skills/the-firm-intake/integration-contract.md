# Integration Contract

Defines the ownership split between the-firm-intake skill and repo-specific command implementations.

## Golden Rule

**Generic routing behavior lives in the skill. Repo-specific policy lives in the command.**

Never duplicate the same logic in both places. Each behavior has exactly one owner.

## What Must Remain in Commands

Commands own repository truth. These must not move to the skill:

### 1. Document Paths and Filenames

**Command responsibility:**
- Canonical workflow file paths
- Repository-specific doc locations
- Local directory structure
- File naming conventions

**Example:**
```yaml
# In command, not skill
workflows:
  bug: docs/04-operations/runbooks/bug-workflow.md
  task: docs/04-operations/runbooks/task-workflow.md
  design: docs/04-operations/runbooks/design-workflow.md
```

### 2. Search Order

**Command responsibility:**
- Sequence of docs to read
- Priority of local sources
- HANDOFF.md and Beads integration
- Repository-specific overrides

**Example:**
```markdown
## Mandatory search order

1. AGENTS.md
2. HANDOFF.md
3. Beads context (bd prime / bd ready)
4. docs/04-operations/README.md
5. [repo-specific runbooks]
```

### 3. Local Gating Rules

**Command responsibility:**
- HANDOFF.md requirements
- Beads workflow integration
- Pre-implementation sign-offs
- Local compliance checks

**Example:**
- "Must check HANDOFF.md before continuing"
- "Must run `bd ready` before task start"
- "Requires security review for auth changes"

### 4. Repo-Specific Examples

**Command responsibility:**
- Local invocation examples
- Repository-specific scenarios
- Local terminology and naming
- Team-specific conventions

**Example:**
```markdown
### Example
`/workflow-router fix the admin 2FA issue`

Routes to:
- Bug workflow
- Auth testing docs (docs/04-operations/testing/auth/)
```

### 5. Local Overrides

**Command responsibility:**
- Exceptions to generic heuristics
- Team-specific routing rules
- Local policy exceptions
- Custom workflow types

**Example:**
- "In this repo, database migrations always route to design workflow first"
- "Security fixes skip standard bug workflow"

## What Belongs in the Skill

The skill owns reusable routing behavior:

### 1. Classification Taxonomy

**Skill responsibility:**
- Intake type definitions
- Classification priority order
- Type indicators and signals

**Location:** `routing-guide.md` Classification order section

### 2. Ambiguity Resolution Rules

**Skill responsibility:**
- Task vs Design precedence
- Bug vs Fix precedence
- Done vs Continue precedence

**Location:** `routing-guide.md` Routing heuristics section

### 3. Empty-Args Fallback

**Skill responsibility:**
- Default route for no arguments
- Mode selection for continuation
- State-driven request derivation

**Location:** `decision-tree.md` Phase 1 section

### 4. Output Mode Contracts

**Skill responsibility:**
- Compact mode structure
- Full mode structure
- Mode selection heuristics

**Location:** `output-modes.md`

### 5. Decision Sequences

**Skill responsibility:**
- Phase ordering
- Checklist structure
- Verification steps

**Location:** `decision-tree.md`

## Integration Contract

Commands using this skill must provide:

```yaml
required_from_command:
  - repo_workflow_map:
      description: File paths for each workflow type
      example:
        bug: docs/runbooks/bug-workflow.md
        task: docs/runbooks/task-workflow.md
  - search_order:
      description: Ordered list of docs to read
      example: [AGENTS.md, HANDOFF.md, ...]
  - local_examples:
      description: Repo-specific invocation examples
      example: "/workflow-router fix admin 2FA"
  - override_hooks:
      description: Where local policy differs from skill
      example: "Database migrations -> design first"
```

## Testing the Split

When adding or changing behavior, ask:

1. **Would this apply to multiple repositories?**
   - Yes → Consider skill
   - No → Keep in command

2. **Does this reference specific files or paths?**
   - Yes → Must be command
   - No → Could be skill

3. **Would this change if we moved to a different repo structure?**
   - Yes → Must be command
   - No → Could be skill

4. **Is this about routing logic or routing policy?**
   - Logic (how to decide) → Skill
   - Policy (what to decide for this repo) → Command

## Migration Checklist

When migrating an existing router to use this skill:

- [ ] Identify all repo-specific document paths → Keep in command
- [ ] Identify all repo-specific search orders → Keep in command
- [ ] Identify local gating rules → Keep in command
- [ ] Identify generic classification logic → Use skill patterns
- [ ] Identify generic routing rules → Use skill patterns
- [ ] Identify output mode structure → Use skill templates
- [ ] Add skill reference to command
- [ ] Document local overrides explicitly
- [ ] Verify no duplication between command and skill

## Anti-Patterns

### Hardcoding Repo Paths in Skill

**Wrong:** Skill references `docs/04-operations/runbooks/bug-workflow.md`

**Right:** Command provides workflow map; skill uses generic references

### Duplicating Ownership

**Wrong:** Both command and skill define "Task vs Design → Design first"

**Right:** Skill defines the rule; command applies it with local context

### Generic Skill with Repo Assumptions

**Wrong:** Skill assumes HANDOFF.md exists and must be checked

**Right:** Skill says "check repo state docs"; command specifies HANDOFF.md

## Example Ownership Matrix

| Behavior | Skill owns | Command owns |
|----------|-----------|--------------|
| Classification priority | ✓ | |
| Ambiguity resolution rules | ✓ | |
| Empty-args default route | ✓ | |
| Output mode structure | ✓ | |
| Workflow file paths | | ✓ |
| Search order | | ✓ |
| Local gating (HANDOFF, Beads) | | ✓ |
| Repo-specific examples | | ✓ |
| Local overrides | | ✓ |
| Mode selection (override default) | | ✓ |
