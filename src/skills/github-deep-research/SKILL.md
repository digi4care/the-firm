---
name: github-deep-research
description: Conduct multi-round deep research on GitHub repositories using GitHub data, targeted web discovery, source fetching, timeline reconstruction, and structured markdown reporting.
allowed-tools: Read Grep Find Edit Write Bash
version: 1.0.0
---

# GitHub Deep Research

Use this skill when the user wants a comprehensive, source-backed investigation of a GitHub repository rather than a quick repo skim.

## Audit Summary

This skill had a useful research methodology but weak OMP skill structure:
- the main file described process and output format without clear routing boundaries
- required sections such as `When NOT to Use`, `Error Handling`, `Quick Tests`, and `Related Skills` were missing
- deep content such as the report template and GitHub API script were present but not indexed through a references registry
- the skill needed a clearer distinction between repository research and ordinary code review or implementation work

## When to Use

Use this skill for:
- comprehensive analysis of a GitHub repository or open-source project
- timeline reconstruction from releases, commits, issues, and pull requests
- competitive or ecosystem comparison anchored in repository evidence
- architecture and activity research that must combine GitHub data with external sources
- producing a structured markdown report with metrics, chronology, confidence notes, and diagrams

## When NOT to Use

Do not use this skill for:
- quick repository inspection that can be handled with direct file reading
- implementation or refactoring work inside the current repository
- generic web research with no GitHub repository focus
- shallow code review where a focused reviewer skill is more appropriate
- package or dependency selection without a repository-deep investigation requirement

## The Iron Law

```
START WITH PRIMARY REPOSITORY EVIDENCE, EXPAND OUTWARD ONLY TO EXPLAIN OR VERIFY WHAT THE REPOSITORY ALREADY SUGGESTS
```

A deep research report is only as strong as its sourcing. Official repository data outranks commentary and sentiment.

## Workflow

1. Start with direct repository evidence: summary, README, tree, languages, contributors, releases, issues, pull requests, and commit activity.
2. Use discovery searches to identify official docs, maintainers, competitors, and the main terms the project uses about itself.
3. Perform deeper targeted investigation only after the initial GitHub pass reveals the real topics worth following.
4. Build a structured timeline from commits, releases, issues, pull requests, and sourced external milestones.
5. Separate facts, interpretation, and sentiment. Corroborate important claims with multiple reliable sources when possible.
6. Synthesize findings into a structured markdown report with metrics, chronology, source categories, and confidence levels.
7. Add Mermaid diagrams only when they help explain timeline, architecture, or comparisons.

## Error Handling

| Situation | Response |
|-----------|----------|
| Repository URL or owner/repo pair is unclear | Resolve the canonical repository before starting the research rounds |
| GitHub API data and external articles conflict | Prefer repository evidence and note the conflict explicitly |
| External sources are low-quality or unsourced | Use them only for low-confidence sentiment or omit them |
| The report starts drifting into implementation advice | Bring it back to research findings and sourced analysis |
| Metrics cannot be confirmed from primary sources | Mark them as estimates or omit them |
| A diagram does not add clarity | Leave it out rather than adding decorative Mermaid output |

## Quick Tests

Should trigger:
- "Do a deep research report on this GitHub repository"
- "Reconstruct the timeline of this open source project"
- "Analyze this repo versus competitors with evidence"
- "Investigate this GitHub project in depth and write a report"

Should not trigger:
- "Read this one file in the repo"
- "Fix this bug in our app"
- "Review this PR diff"
- "Choose a package for logging"

Functional checks:
- starts with GitHub-native evidence before broader web search
- distinguishes repository facts from external interpretation
- uses structured reporting instead of ad hoc notes
- assigns confidence based on source quality rather than tone or popularity

## References

- `assets/report_template.md` — canonical markdown report structure for findings
- `scripts/github_api.py` — GitHub data collection entry point for repository facts
- `references/registry.json` — reference index for progressive discovery

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| `repo-analysis` | Faster architectural repo understanding | When deep external research is unnecessary |
| `review` | Code review and change-risk analysis | When the task is about correctness of changes rather than repository history and ecosystem context |
| `release-notes` | Diff-based shipped-scope documentation | When the task is about summarizing shipped changes, not researching a repo deeply |