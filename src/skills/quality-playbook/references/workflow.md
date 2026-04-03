# Quality Playbook Workflow

## Phase 1: Explore the Codebase (Do Not Write Yet)

Spend the first phase understanding the project. The quality playbook must be grounded in this specific codebase — not generic advice.

**Why explore first?** The most common failure in AI-generated quality playbooks is producing generic content — coverage targets that could apply to any project, scenarios that describe theoretical failures, tests that exercise language builtins instead of project code. Exploration prevents this by forcing every output to reference something real: a specific function, a specific schema, a specific defensive code pattern. If you can't point to where something lives in the code, you're guessing — and guesses produce quality playbooks nobody trusts.

**Scaling for large codebases:** For projects with more than ~50 source files, don't try to read everything. Focus exploration on the 3–5 core modules (the ones that handle the primary data flow, the most complex logic, and the most failure-prone operations). Read representative tests from each subsystem rather than every test file. The goal is depth on what matters, not breadth across everything.

### Step 0: Ask About Development History

Before exploring code, ask the user one question:

> "Do you have exported AI chat history from developing this project — Claude exports, Gemini takeouts, ChatGPT exports, Claude Code transcripts, or similar? If so, point me to the folder. The design discussions, incident reports, and quality decisions in those chats will make the generated quality playbook significantly better."

If the user provides a chat history folder:

1. **Scan for an index file first.** Look for files named `INDEX*`, `CONTEXT.md`, `README.md`, or similar navigation aids. If one exists, read it — it will tell you what's there and how to find things.
2. **Search for quality-relevant conversations.** Look for messages mentioning: quality, testing, coverage, bugs, failures, incidents, crashes, validation, retry, recovery, spec, fitness, audit, review. Also search for the project name.
3. **Extract design decisions and incident history.** The most valuable content is: (a) incident reports — what went wrong, how many records affected, how it was detected, (b) design discussions — why a particular approach was chosen, what alternatives were rejected, (c) quality framework discussions — coverage targets, testing philosophy, model review experiences, (d) cross-model feedback — where different AI models disagreed about the code.
4. **Don't try to read everything.** Chat histories can be enormous. Use the index to find the most relevant conversations, then search within those for quality-related content. 10 minutes of targeted searching beats 2 hours of exhaustive reading.

This context is gold. A chat history where the developer discussed "why we chose this concurrency model" or "the time we lost 1,693 records in production" transforms generic scenarios into authoritative ones.

If the user doesn't have chat history, proceed normally — the skill works without it, just with less context.

### Step 1: Identify Domain, Stack, and Specifications

Read the README, existing documentation, and build config (`pyproject.toml` / `package.json` / `Cargo.toml`). Answer:

- What does this project do? (One sentence.)
- What language and key dependencies?
- What external systems does it talk to?
- What is the primary output?

**Find the specifications.** Specs are the source of truth for functional tests. Search in order: `AGENTS.md`/`CLAUDE.md` in root, `specs/`, `docs/`, `spec/`, `design/`, `architecture/`, `adr/`, then `.md` files in root. Record the paths.

**If no formal spec documents exist**, the skill still works — but you need to assemble requirements from other sources. In order of preference:

1. **Ask the user** — they often know the requirements even if they're not written down.
2. **README and inline documentation** — many projects embed requirements in their README, API docs, or code comments.
3. **Existing test suite** — tests are implicit specifications. If a test asserts `process(x) == y`, that's a requirement.
4. **Type signatures and validation rules** — schemas, type annotations, and validators define what the system accepts and rejects.
5. **Infer from code behavior** — as a last resort, read the code and infer what it's supposed to do. Mark these as *inferred requirements* in QUALITY.md and flag them for user confirmation.

When working from non-formal requirements, label each scenario and test with a **requirement tag** that includes a confidence tier and source:

- `[Req: formal — README §3]` — written by humans in a spec document. Authoritative.
- `[Req: user-confirmed — "must handle empty input"]` — stated by the user but not in a formal doc. Treat as authoritative.
- `[Req: inferred — from validate_input() behavior]` — deduced from code. Flag for user review.

Use this exact tag format in QUALITY.md scenarios, functional test documentation, and spec audit findings. It makes clear which requirements are authoritative and which need validation.

### Step 2: Map the Architecture

List source directories and their purposes. Read the main entry point, trace execution flow. Identify:

- The 3–5 major subsystems
- The data flow (Input → Processing → Output)
- The most complex module
- The most fragile module

### Step 3: Read Existing Tests

Read the existing test files — all of them for small/medium projects, or a representative sample from each subsystem for large ones. Identify: test count, coverage patterns, gaps, and any coverage theater (tests that look good but don't catch real bugs).

**Critical: Record the import pattern.** How do existing tests import project modules? Every language has its own conventions (Python `sys.path` manipulation, Java/Scala package imports, TypeScript relative paths or aliases, Go package/module paths, Rust `use crate::` or `use myproject::`). You must use the exact same pattern in your functional tests — getting this wrong means every test fails with import/resolution errors. See `references/functional_tests.md` § "Import Pattern" for the full six-language matrix.

**Identify integration test runners.** Look for scripts or test files that exercise the system end-to-end against real external services (APIs, databases, etc.). Note their patterns — you'll need them for `RUN_INTEGRATION_TESTS.md`.

### Step 4: Read the Specifications

Walk each spec document section by section. For every section, ask: "What testable requirement does this state?" Record spec requirements without corresponding tests — these are the gaps the functional tests must close.

If using inferred requirements (from tests, types, or code behavior), tag each with its confidence tier using the `[Req: tier — source]` format defined in Step 1. Inferred requirements feed into QUALITY.md scenarios and should be flagged for user review in Phase 4.

### Step 4b: Read Function Signatures and Real Data

Before writing any test, you must know exactly how each function is called. For every module you identified in Step 2:

1. **Read the actual function signatures** — parameter names, types, defaults. Don't guess from usage context — read the function definition and any documentation (Python docstrings, Java/Scala Javadoc/ScalaDoc, TypeScript type annotations, Go godoc comments, Rust doc comments and type signatures).
2. **Read real data files** — If the project has items files, fixture files, config files, or sample data (in `pipelines/`, `fixtures/`, `test_data/`, `examples/`), read them. Your test fixtures must match the real data shape exactly.
3. **Read existing test fixtures** — How do existing tests create test data? Copy their patterns. If they build config dicts with specific keys, use those exact keys.
4. **Check library versions** — Check the project's dependency manifest (`requirements.txt`, `build.sbt`, `package.json`, `pom.xml`/`build.gradle`, `go.mod`, `Cargo.toml`) to see what's actually available. Don't write tests that depend on library features that aren't installed. If a dependency might be missing, use the test framework's skip mechanism — see `references/functional_tests.md` § "Library version awareness" for framework-specific examples.

Record a **function call map**: for each function you plan to test, write down its name, module, parameters, and what it returns. This map prevents the most common test failure: calling functions with wrong arguments.

### Step 5: Find the Skeletons

This is the most important step. Search for defensive code patterns — each one is evidence of a past failure or known risk.

**Why this matters:** Developers don't write `try/except` blocks, null checks, or retry logic for fun. Every piece of defensive code exists because someone got burned. A `try/except` around a JSON parse means malformed JSON happened in production. A null check on a field means that field was missing when it shouldn't have been. These patterns are the codebase whispering its history of failures. Each one becomes a fitness-to-purpose scenario and a boundary test.

**Read `references/defensive_patterns.md`** for the systematic search approach, grep patterns, and how to convert findings into fitness-to-purpose scenarios and boundary tests.

Minimum bar: at least 2–3 defensive patterns per core source file. If you find fewer, you're skimming — read function bodies, not just signatures.

### Step 5b: Map Schema Types

If the project has a validation layer (Pydantic models in Python, JSON Schema, TypeScript interfaces/Zod schemas, Java Bean Validation annotations, Scala case class codecs), read the schema definitions now. For every field you found a defensive pattern for, record what the schema accepts vs. rejects.

**Read `references/schema_mapping.md`** for the mapping format and why this matters for writing valid boundary tests.

### Step 6: Identify Quality Risks (Code + Domain Knowledge)

Every project has a different failure profile. This step uses **two sources** — not just code exploration, but your training knowledge of what goes wrong in similar systems.

**From code exploration**, ask:
- What does "silently wrong" look like for this project?
- What external dependencies can change without warning?
- What looks simple but is actually complex?
- Where do cross-cutting concerns hide?

**From domain knowledge**, ask:
- "What goes wrong in systems like this?" — If it's a batch processor, think about crash recovery, idempotency, silent data loss, state corruption. If it's a web app, think about auth edge cases, race conditions, input validation bypasses. If it handles randomness or statistics, think about seeding, correlation, distribution bias.
- "What produces correct-looking output that is actually wrong?" — This is the most dangerous class of bug: output that passes all checks but is subtly corrupted.
- "What happens at 10x scale that doesn't happen at 1x?" — Chunk boundaries, rate limits, timeout cascading, memory pressure.
- "What happens when this process is killed at the worst possible moment?" — Mid-write, mid-transaction, mid-batch-submission.

Generate realistic failure scenarios from this knowledge. You don't need to have observed these failures — you know from training that they happen to systems of this type. Write them as **architectural vulnerability analyses** with specific quantities and consequences. Frame each as "this architecture permits the following failure mode" — not as a fabricated incident report. Use concrete numbers to make the severity non-negotiable: "If the process crashes mid-write during a 10,000-record batch, `save_state()` without an atomic rename pattern will leave a corrupted state file — the next run gets JSONDecodeError and cannot resume without manual intervention." Then ground them in the actual code you explored: "Read persistence.py line ~340 (save_state): verify temp file + rename pattern."

---

## Phase 2: Generate the Quality Playbook

Now write the six files. For each one, follow the structure below and consult the relevant reference file for detailed guidance.

**Why six files instead of just tests?** Tests catch regressions but don't prevent new categories of bugs. The quality constitution (`QUALITY.md`) tells future sessions what "correct" means before they start writing code. The protocols (`RUN_*.md`) provide structured processes for review, integration testing, and spec auditing that produce repeatable results — instead of leaving quality to whatever the AI feels like checking. Together, these files create a quality system where each piece reinforces the others: scenarios in QUALITY.md map to tests in the functional test file, which are verified by the integration protocol, which is audited by the Council of Three.

### File 1: `quality/QUALITY.md` — Quality Constitution

**Read `references/constitution.md`** for the full template and examples.

The constitution has six sections:

1. **Purpose** — What quality means for this project, grounded in Deming (built in, not inspected), Juran (fitness for use), Crosby (quality is free). Apply these specifically: what does "fitness for use" mean for *this system*? Not "tests pass" but the actual operational requirement.
2. **Coverage Targets** — Table mapping each subsystem to a target with rationale referencing real risks. Every target must have a "why" grounded in a specific scenario — without it, a future AI session will argue the target down.
3. **Coverage Theater Prevention** — Project-specific examples of fake tests, derived from what you saw during exploration.
4. **Fitness-to-Purpose Scenarios** — The heart of it. Each scenario documents a realistic failure mode with code references and verification method. Aim for 2+ scenarios per core module — typically 8–10 total for a medium project. Quality matters more than count.
5. **AI Session Quality Discipline** — Rules every AI session must follow
6. **The Human Gate** — Things requiring human judgment

**Scenario voice is critical.** Write "What happened" as architectural vulnerability analyses with specific quantities, cascade consequences, and detection difficulty — not as abstract specifications.

Every scenario's "How to verify" must map to at least one test in the functional test file.

### File 2: Functional Tests

**This is the most important deliverable.** Read `references/functional_tests.md` for the complete guide.

Organize the tests into three logical groups:

- **Spec requirements** — One test per testable spec section.
- **Fitness scenarios** — One test per QUALITY.md scenario. 1:1 mapping.
- **Boundaries and edge cases** — One test per defensive pattern from Step 5.

Key rules:
- Match the existing import pattern exactly.
- Read every function's signature before calling it.
- No placeholder tests. Every test must import and call actual project code.
- Test count heuristic = (testable spec sections) + (QUALITY.md scenarios) + (defensive patterns).
- Cross-variant heuristic: ~30% parametrized across all variants.
- Test outcomes, not mechanisms.
- Use schema-valid mutations for boundary tests.

### File 3: `quality/RUN_CODE_REVIEW.md`

**Read `references/review_protocols.md`** for the template.

Key sections: bootstrap files, focus areas mapped to architecture, and mandatory guardrails:

- Line numbers are mandatory — no line number, no finding
- Read function bodies, not just signatures
- If unsure: flag as QUESTION, not BUG
- Grep before claiming missing
- Do NOT suggest style changes — only flag things that are incorrect

**Phase 2: Regression tests.** After the review produces BUG findings, write regression tests in `quality/test_regression.*` that reproduce each bug. Report results as a confirmation table (BUG CONFIRMED / FALSE POSITIVE / NEEDS INVESTIGATION).

### File 4: `quality/RUN_INTEGRATION_TESTS.md`

**Read `references/review_protocols.md`** for the template.

Must include: safety constraints, pre-flight checks, test matrix with specific pass criteria, execution UX, structured reporting. Cover happy path, cross-variant consistency, output correctness, and component boundaries.

**All commands must use relative paths.** Include a "Working Directory" section at the top. Never generate commands that `cd` to an absolute path.

**Include an Execution UX section.** Specify three phases: (1) show plan as numbered table, (2) one-line progress updates, (3) summary table with pass/fail counts.

**This protocol must exercise real external dependencies.** Design the test matrix around the project's actual execution modes and external dependencies.

**Build a Field Reference Table before writing quality gates.** Re-read each schema file IMMEDIATELY before writing each table row. Copy field names character-for-character.

### File 5: `quality/RUN_SPEC_AUDIT.md` — Council of Three

**Read `references/spec_audit.md`** for the full protocol.

Three independent AI models audit the code against specifications. The protocol defines: a copy-pasteable audit prompt with guardrails, project-specific scrutiny areas, a triage process, and fix execution rules.

### File 6: `AGENTS.md`

If `AGENTS.md` already exists, update it — don't replace it. Add a Quality Docs section pointing to all generated files.

If creating from scratch: project description, setup commands, build & test commands, architecture overview, key design decisions, known quirks, and quality docs pointers.

---

## Phase 3: Verify

**Why a verification phase?** AI-generated output can look polished and be subtly wrong. Tests that reference undefined fixtures report 0 failures but 16 errors — and "0 failures" sounds like success. The verification phase catches these problems before the user discovers them.

### Self-Check Benchmarks

Before declaring done, check every benchmark. **Read `references/verification.md`** for the complete checklist.

The critical checks:

1. **Test count** near heuristic target (spec sections + scenarios + defensive patterns)
2. **Scenario coverage** — scenario test count matches QUALITY.md scenario count
3. **Cross-variant coverage** — ~30% of tests parametrize across all input variants
4. **Boundary test count** ≈ defensive pattern count from Step 5
5. **Assertion depth** — Majority of assertions check values, not just presence
6. **Layer correctness** — Tests assert outcomes, not mechanisms
7. **Mutation validity** — Every fixture mutation uses a schema-valid value from Step 5b
8. **All tests pass — zero failures AND zero errors.** Run the test suite and check the summary.
9. **Existing tests unbroken** — The new files didn't break anything.
10. **Integration test quality gates were written from a Field Reference Table.**

If any benchmark fails, go back and fix it before proceeding.

---

## Phase 4: Present, Explore, Improve (Interactive)

After generating and verifying, present the results clearly and give the user control over what happens next. This phase has three parts: a scannable summary, drill-down on demand, and a menu of improvement paths.

### Part 1: The Summary Table

Present a single table the user can scan in 10 seconds:

```
Here's what I generated:

| File | What It Does | Key Metric | Confidence |
|------|-------------|------------|------------|
| QUALITY.md | Quality constitution | 10 scenarios | High |
| Functional tests | Automated tests | 47 passing | High |
| RUN_CODE_REVIEW.md | Code review protocol | 8 focus areas | High |
| RUN_INTEGRATION_TESTS.md | Integration test protocol | 9 runs × 3 providers | Medium |
| RUN_SPEC_AUDIT.md | Council of Three audit | 10 scrutiny areas | High |
| AGENTS.md | AI session bootstrap | Updated | High |
```

Adapt to what was actually generated. The confidence column is the most important.

**Confidence levels:**
- **High** — Derived directly from code, specs, or schemas.
- **Medium** — Reasonable inference, but could be wrong.
- **Low** — Best guess. Definitely needs user input.

After the table, add a "Quick Start" block with copy-pasteable prompts for executing each artifact. Then add:

> "You can ask me about any of these to see the details — for example, 'show me Scenario 3' or 'walk me through the integration test matrix.'"

### Part 2: Drill-Down on Demand

When the user asks about a specific item, give a focused summary — the key decisions and what you're uncertain about.

### Part 3: The Improvement Menu

> "Three ways to make this better:"
>
> **1. Review and harden individual items** — Pick any scenario, test, or protocol section.
> **2. Guided Q&A** — 3-5 targeted questions about things you couldn't infer from the code.
> **3. Review development history** — Point to exported AI chat history to mine for design decisions and incident reports.

The user can cycle through these paths as many times as they want. Each pass makes the quality playbook more grounded.

---

## Fixture Strategy

The `quality/` folder is separate from the project's unit test folder. Create the appropriate test setup for the project's language:

- **Python:** `quality/conftest.py` for pytest fixtures.
- **Java:** Test class with `@BeforeEach`/`@BeforeAll` setup methods.
- **Scala:** A trait mixed into test specs.
- **TypeScript/JavaScript:** `quality/setup.ts` with `beforeAll`/`beforeEach` hooks.
- **Go:** Helper functions in the same `_test.go` file or shared `testutil_test.go`.
- **Rust:** Helper functions in a `#[cfg(test)] mod tests` block.

Examine existing test files to understand how they set up test data. Whatever pattern the existing tests use, copy it.

---

## Terminology

- **Functional testing** — Does the code produce the output specs say it should?
- **Integration testing** — Do components work together end-to-end, including real external services?
- **Spec audit** — AI models read code and compare against specs. No code executed.
- **Coverage theater** — Tests that produce high coverage numbers but don't catch real bugs.
- **Fitness-to-purpose** — Does the code do what it's supposed to do under real-world conditions?

---

## Principles

1. Fitness-to-purpose over coverage percentages
2. Scenarios come from code exploration AND domain knowledge
3. Concrete failure modes make standards non-negotiable
4. Guardrails transform AI review quality
5. Triage before fixing — many "defects" are spec bugs or design decisions
