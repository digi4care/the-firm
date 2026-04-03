# The Firm Department Blueprint Methodology v1

## Purpose

This document defines the methodology for designing a department within The Firm.

Before any department is implemented, it must answer six questions. These questions ensure the department has a clear reason to exist, the right expertise, and the right persistent state -- not just the right tasks.

This methodology is a **working version**. Gaps will be discovered during dogfooding runs and addressed iteratively.

## The six questions

### 1. Why does this department exist?

What is its reason for being? Not the task description, but the argument for why this work cannot be done by another department.

If the answer is "because someone needs to do X", that is a task -- not a reason. The reason is the unique capability or perspective this department provides that no other department can.

### 2. Who does this department serve?

Every department serves someone. The options are:

- **The client** -- directly interacting with or producing output for the person using The Firm
- **Other departments** -- providing information, decisions, or services that enable other departments to do their work
- **The Firm itself** -- maintaining the organization, its knowledge, its processes, or its state

A department may serve more than one audience, but it must be explicit about which is primary.

### 3. What expertise areas are needed?

What kinds of thinking does this department require? Not tasks, but skills and mindsets.

For each expertise area, ask:

- Is the mindset different enough from other expertise areas to justify a separate agent?
- If two expertise areas share the same mindset but differ in domain, they may be one expertise with two contexts.
- If two expertise areas require different mindsets (e.g., conversational vs. analytical), they should be separate agents.

### 4. What persistent information does this department maintain?

Not all information is temporary. Some departments keep lasting records:

- client dossiers
- knowledge bases
- process histories
- decision logs
- pattern libraries

These are not engagement artifacts. They are living documents that persist across engagements and grow over time.

### 5. What is the internal flow?

In what order do the expertise areas do their work? Where is there iteration? Where is there a gate (a point where work must be reviewed before continuing)?

### 6. What does it produce and for whom?

The output of the department -- with the distinction:

- Does it deliver to the client?
- Does it hand off to another department?
- Does it contribute to The Firm's internal state?

## Design process

Before a department design is considered ready for implementation, it must go through
this review cycle. The cycle was established during the Intake department dogfooding
run and applies to all future departments.

### 1. Proposal

Draft the department design by answering all six blueprint questions.
This produces a design document at `design/the-firm/THE_FIRM_DEPARTMENT_<NAME>.md`.

The proposal should be specific enough that another person (or agent) could challenge it.

### 2. Review

Test the design against realistic scenarios -- not happy-path only, but edge cases,
emergency situations, and handoff boundaries with other departments.

Look for:

- Missing steps in the internal flow
- Unclear handoffs (who receives what, in what format)
- Edge cases the flow does not cover
- Overlap with other departments
- Expertise areas that should be separate agents vs. one agent with multiple contexts

### 3. Revision

Address findings from the review. Update the design document.
Each finding should be explicitly resolved or deferred with a reason.

### 4. Approval

The design is coherent and complete enough to implement.
"Complete enough" means it covers the primary flow and at least the known edge cases.

Approval does not mean perfect. It means the design can survive its first real-world test.

### 5. Test (dogfooding)

Implement the department and run it. This is where real gaps surface --
not in review, but in execution.

### 6. Iterate

Feed learnings from the test back into the design document.
Bump the version. Update the blueprint methodology itself if a structural gap was found.

### Rules

- The blueprint methodology itself is a working version. If the design process reveals
  that a blueprint question is missing or poorly scoped, update the methodology.
- Each department design starts at v0.1 (proposal) and increments on revision.
- The design process is linear within a department but iterative across departments:
  lessons from Department B may feed back into Department A's design.

## Version history

- v0 -- initial working version, co-designed during brainstorm session
- v1 -- added design process (Proposal → Review → Revision → Approval → Test → Iterate)