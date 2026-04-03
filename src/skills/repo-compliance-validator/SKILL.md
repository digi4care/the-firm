---
name: repo-compliance-validator
description: Check whether a repository is truly operating under The Firm by validating runtime assets, issue control, artifact placement, path discipline, and source-of-truth boundaries. Use when assessing adoption readiness or drift.
allowed-tools: Bash Read Write Edit
---

# Repo Compliance Validator

A The Firm-native skill for verifying whether a repository is genuinely The Firm-enabled.

## When to Use Me

Use me when:
- a repo claims to use The Firm and needs validation
- a bootstrap or adoption pass has just completed
- drift is suspected between doctrine, runtime assets, and control plane behavior
- you need a compliance check before broader rollout

Do not use me for:
- direct feature implementation
- QA verdicts on one scoped delivery item
- release decisions for one feature

## Workflow

1. Check for required runtime doctrine and runtime assets.
2. Check for `.pi/firm/` artifact structure and expected artifact families.
3. Check whether issue control is present or explicitly staged.
4. Check whether public docs, runtime assets, and issue-first behavior align.
5. Check path/workspace discipline cues and source-of-truth separation.
6. Report strengths, gaps, and whether the repo is minimally The Firm-enabled.

## Error Handling

- If the repo lacks enough structure to assess honestly, say that clearly instead of pretending compliance.
- If issue control is absent but staged intentionally, report staged status rather than failure.
- If artifacts duplicate workflow truth or bypass issue state, flag it as drift.
- If runtime docs overclaim capabilities, mark that as a compliance gap.

## Quick Tests

Should trigger:
- "Is this repository actually The Firm-enabled?"
- "Validate this repo after bootstrap."
- "Check whether this adoption is compliant with The Firm."

Should not trigger:
- "Build this feature."
- "Classify this client request."
- "Turn these asks into a backlog."

Functional:
- Checks runtime assets.
- Checks `.pi/firm/` structure.
- Checks issue-control presence.
- Checks source-of-truth separation.
- Returns a compliance verdict with gaps.

## References

- `references/compliance-guide.md`
- `.pi/internal/the-firm/THE_FIRM_INSTALL_LAYOUT.md`
- `.pi/internal/the-firm/THE_FIRM_SOURCE_OF_TRUTH_AND_OWNERSHIP_MODEL.md`
- `.pi/internal/the-firm/THE_FIRM_OMP_OVERRIDE_MODEL.md`

## Operational Notes

This skill exists to prevent performative adoption.

A repo should not be treated as The Firm-enabled merely because a few files exist. The operating behavior must match the model.
