# The Firm Department Blueprint Methodology v0

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

## Version history

- v0 -- initial working version, co-designed during brainstorm session
