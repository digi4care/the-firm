---
name: release-notes
description: Post-ship documentation update skill. Uses the actual diff and shipped scope to refresh changelogs, README content, API docs, and operational notes without inventing claims that the code did not ship.
allowed-tools: Read Grep Find Edit Write Bash
version: "1.1.0"
---

# Release Notes

This skill exists for one job: make documentation tell the truth after a change has actually landed.

Use it after implementation is complete and the shipped scope is known. It is not for speculative documentation or feature marketing detached from the diff.

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "update docs" | Refresh changed documentation surfaces from the diff |
| "update the changelog" | Write the release note entry from shipped changes |
| "document this release" | Map code changes to affected docs |
| "ship completed" | Run the post-ship docs pass |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "write new docs from scratch" | Direct documentation writing |
| "create the release" | Release workflow |
| "review this PR" | `review` |
| "test the app" | Verification workflow |

## Workflow

### 1. Lock the shipped scope

1. Read the actual diff, merged branch, or Beads item notes.
2. Identify what truly changed: features, behavior, commands, config, APIs, architecture, or user workflow.
3. Refuse to document features that are not present in the code or artifacts.

### 2. Map the impacted documentation surfaces

Search for the minimum set of docs affected by the shipped change:
- `README.md` and usage docs
- `CHANGELOG.md` or release history
- `AGENTS.md` or runtime-facing operational docs
- API reference or examples
- `.pi/firm/` artifacts when governed documentation must reflect a decision or release note

### 3. Update only the touched truths

For each impacted file:
- remove stale names, commands, paths, and screenshots
- add the shipped behavior, not the intended roadmap
- keep tone and formatting consistent with existing docs
- avoid speculative migration advice unless the code actually requires it

### 4. Verify the documentation

Check for:
- stale references to old behavior
- broken links or paths
- commands that no longer exist
- docs that contradict Beads notes, design artifacts, or current code

### 5. Close the loop

If the work is tracked in Beads, add a concise note that documentation was updated and what files changed. Documentation completion alone does not prove the feature itself is verified.

## Error Handling

| Situation | Response |
|-----------|----------|
| No meaningful diff exists | Report that there is nothing to document |
| Scope is ambiguous | Use the Beads item, merged diff, or release artifact as the source of truth before editing |
| Docs disagree with shipped code | Correct the docs to match code and call out the mismatch |
| Update would require speculative product language | Stop and keep the note factual |
| Governance-sensitive runtime docs changed | Read the owning source first and edit conservatively |

## Quick Tests

**Should trigger:**
- "update the changelog"
- "document this release"
- "update docs after shipping"
- "/release-notes"

**Should not trigger:**
- "draft a brand new guide"
- "create a release"
- "review this code"
- "run QA"

## References

- `references/stop-conditions.mdx` — When to stop instead of guessing
- `references/doc-voice.mdx` — Voice and formatting guidance
- [Keep a Changelog](https://keepachangelog.com/) — Changelog structure

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **review** | Pre-landing scrutiny | Before the change is considered ready to ship |
| **verification-before-completion** | Evidence before claims | Before claiming the release is done |
| **beads** | Persistent issue tracking | When release documentation belongs to tracked work |