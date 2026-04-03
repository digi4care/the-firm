---
name: quality-playbook
description: "Generate a complete quality system for any codebase: quality constitution, spec-traced functional tests, code review protocol, integration testing protocol, multi-model spec audit (Council of Three), and AI bootstrap file (AGENTS.md). Works with any language."
version: 1.2.0
author: Andrew Stellman
license: MIT — see LICENSE.txt
allowed-tools: Read Grep Find Bash Write Edit LSP
---

# Quality Playbook Generator

Generate a complete quality system tailored to a specific codebase.
Unlike test stub generators, this skill explores the project first — understanding
domain, architecture, specifications, and failure history — then produces a quality
playbook grounded in what it finds.

**Produces six files:**

| File | Purpose |
|------|---------|
| `quality/QUALITY.md` | Quality constitution — coverage targets, fitness scenarios, theater prevention |
| `quality/test_functional.*` | Automated functional tests derived from specifications |
| `quality/RUN_CODE_REVIEW.md` | Code review protocol with guardrails against hallucinated findings |
| `quality/RUN_INTEGRATION_TESTS.md` | Integration test protocol — end-to-end across real external services |
| `quality/RUN_SPEC_AUDIT.md` | Council of Three multi-model spec audit protocol |
| `AGENTS.md` | Bootstrap context for AI sessions working on this project |

## When to Use Me

- User asks to set up a quality playbook, generate functional tests from specs, or create a quality constitution
- User mentions "quality playbook", "spec audit", "Council of Three", "fitness-to-purpose", or "coverage theater"
- User wants to build a repeatable quality system grounded in their actual codebase
- User asks for code review protocols with regression test generation
- User wants integration testing that exercises real external dependencies
- User needs to update existing functional tests or re-run the spec audit

## When NOT to Use Me

- User wants a single unit test or quick bug fix — this skill builds a full quality system, not one-off tests
- User asks about general testing best practices without a specific codebase — this skill is project-specific
- User wants to lint or format code — that's not quality system generation
- User asks about CI/CD pipeline setup — this skill generates local quality artifacts, not pipeline configuration
- **Decision test:** If the request is about *one* specific test or *one* specific bug, this skill is overkill. If the request is about building or updating the quality *system*, trigger this skill.

## Workflow

### 1. Explore the Codebase (read-only)

Read `references/workflow.md` Phase 1 for the full exploration protocol. Summary:

1. **Ask about development history** — exported AI chat history provides design decisions and incident reports
2. **Identify domain, stack, specifications** — README, build config, spec files
3. **Map architecture** — subsystems, data flow, complex and fragile modules
4. **Read existing tests** — import patterns, coverage gaps, coverage theater
5. **Read specifications** — testable requirements, gaps without tests
6. **Read function signatures and real data** — parameter names, types, defaults, fixture shapes
7. **Find skeletons** — grep for defensive patterns (null guards, try/catch, retry logic); see `references/defensive_patterns.md`
8. **Map schema types** — validation layer fields, accepts vs. rejects; see `references/schema_mapping.md`
9. **Identify quality risks** — from code exploration and domain knowledge about what goes wrong in similar systems

### 2. Generate the Six Files

Read `references/workflow.md` Phase 2 for per-file details. Consult these references:

| File to generate | Reference to read |
|------------------|-------------------|
| `quality/QUALITY.md` | `references/constitution.md` — template with section-by-section guidance |
| Functional tests | `references/functional_tests.md` — structure, anti-patterns, cross-variant strategy |
| `quality/RUN_CODE_REVIEW.md` | `references/review_protocols.md` — code review template with guardrails |
| `quality/RUN_INTEGRATION_TESTS.md` | `references/review_protocols.md` — integration test template with execution UX |
| `quality/RUN_SPEC_AUDIT.md` | `references/spec_audit.md` — Council of Three protocol |
| `AGENTS.md` | Update existing or create from scratch |

Key rules for functional tests:
- Match existing import pattern exactly
- Read every function signature before calling it
- No placeholder tests — every test must exercise real project code
- Test count heuristic: (spec sections) + (scenarios) + (defensive patterns)
- ~30% of tests parametrized across all input variants

### 3. Verify

Read `references/verification.md` for the complete 10-benchmark checklist.

Critical checks: test count near target, scenario coverage matches QUALITY.md, cross-variant coverage ~30%, boundary tests ≈ defensive patterns, zero failures AND zero errors, existing tests unbroken.

### 4. Present and Iterate

Present a summary table with confidence levels (High/Medium/Low). Offer three improvement paths:

1. **Review and harden** — walk through specific items with the user
2. **Guided Q&A** — ask 3-5 targeted questions about incident history, thresholds, scale
3. **Review development history** — mine exported AI chat history for design decisions

Cycle through improvements until the user is satisfied.

## Error Handling

| Situation | Response |
|-----------|----------|
| No spec documents found | Assemble requirements from README, existing tests, type signatures, and code behavior. Tag each as `[Req: inferred — source]` and flag for user review. |
| No existing tests | Skip import pattern analysis. Use standard conventions for the language. Note this as a gap — the project has zero test baseline. |
| Large codebase (>50 source files) | Focus on 3-5 core modules. Read representative tests per subsystem. Depth over breadth. |
| Tests fail after generation | Re-read function signatures, check import pattern, verify fixture shapes against real data files. Fix and re-run. |
| User provides chat history | Scan for index file first, then search for quality-relevant keywords. Extract design decisions and incident history. Don't try to read everything. |
| Existing AGENTS.md found | Update it — add Quality Docs section. Never replace an existing AGENTS.md. |
| Verification benchmark fails | Go back to the relevant generation step, fix, and re-verify. Do not proceed past a failed benchmark. |

## Quick Tests

### Should Trigger
- "Generate a quality playbook for this project"
- "Update the functional tests — the quality playbook already exists"
- "Run the spec audit protocol"
- "I need a quality constitution for my codebase"
- "Help me set up coverage theater prevention"

### Should Not Trigger
- "Write a unit test for the login function"
- "Fix this failing test"
- "What's a good test coverage target?"
- "Set up my GitHub Actions CI pipeline"
- "Run the linter on src/"

### Functional
- Skill produces six files in `quality/` directory (plus AGENTS.md update)
- Every functional test imports and calls real project code — no placeholders
- QUALITY.md scenario count matches scenario test count exactly
- All generated tests pass (zero failures, zero errors)
- Existing test suite remains unbroken after generation

## References

| File | Contents |
|------|----------|
| `references/workflow.md` | Full 4-phase workflow: explore, generate, verify, iterate |
| `references/constitution.md` | QUALITY.md template with section-by-section guidance |
| `references/functional_tests.md` | Test structure, anti-patterns, import patterns for 6 languages |
| `references/review_protocols.md` | Templates for code review and integration test protocols |
| `references/spec_audit.md` | Council of Three audit protocol, triage process, fix execution |
| `references/defensive_patterns.md` | Grep patterns for 6 languages, converting findings to scenarios |
| `references/schema_mapping.md` | Field mapping format, mutation validity rules |
| `references/verification.md` | Complete 10-benchmark self-check checklist |
