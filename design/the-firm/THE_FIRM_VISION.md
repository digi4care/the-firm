# The Firm Vision v0

## Why The Firm Exists

The Firm started from a practical problem: one developer building large projects without access to every domain expertise a real software organization would have.

The solution is not to become an expert in everything. The solution is to simulate what a fully staffed software company does -- specialized roles, structured workflows, QA gates, handoff discipline -- and let AI agents fill those roles under governance.

The Firm exists to close the gap between what a solo developer can do and what a professional engineering organization would do.

Lessons from comparable tools: BMAD-METHOD shows that too much freedom leads to a steep learning curve and output that misses the mark. The Firm chooses opinionated defaults -- automate the 80%, leave the 20% to the developer.

## Target Audience

The Firm is not for vibe coders. It is for developers who know their craft but lack the expertise a fully staffed tech company would have.

You know what an API is, what a database schema means, what CI/CD does. You know roughly what to ask. What you lack is the depth in every domain that a real team has: a security expert who knows which headers to set, a DBA who understands why that index matters, a QA engineer who knows which edge cases to test.

The Firm fills that gap. Not by doing it for you, but by making expertise available as if you have a team around you. You make the decision. The Firm provides the expertise, the options, and a recommendation.

Explicitly not for:

- "Build me an app" without context
- "I don't know what I want, figure it out"
- Copy-paste without understanding
## Purpose

The Firm is a portable engineering operating system for AI-assisted software development.

It replaces a generic coding-agent workflow with a professional, issue-driven, role-specialized software organization built on:

- a mechanical control plane for execution dispatch
- Beads as issue graph and readiness layer
- Dolt as versioned source of truth
- Pi as execution runtime
- mandatory QA
- artifact-based handoffs
- risk-tiered verification
- philosophy grounded in anti-slop and intent engineering

## Mission

The Firm turns AI-assisted coding into a governable software organization.

The goal is for work to be:

- planned as professional engineering work
- executed by specialist roles
- tracked through issue dependencies
- controlled by explicit gates
- auditable through versioned state
- portable between projects

## Problem

Generic agent workflows are often:

- too dependent on chat context
- weak on ownership and handoffs
- optimistic about what “done” means
- inconsistent in QA depth
- unsafe under parallel execution
- hard to transplant across repos

The Firm addresses that by making execution:

- issue-first
- dependency-aware
- role-specialized
- QA-gated
- evidence-based
- portable

## Philosophical foundation

The Firm carries its own philosophy as part of its operating model.

That philosophy includes two non-negotiable beliefs:

- slop is a workflow and systems-design failure, not an inevitable property of LLMs
- success must be defined as the right outcome under the right constraints, not just fast or plausible output

Those beliefs are expanded in `THE_FIRM_PHILOSOPHY.md`, which is part of The Firm doctrine itself.

## Non-goals

The Firm is not:

- a loose prompt library
- a generic task list
- a replacement for engineering judgment
- a system that forces maximum testing on every trivial change
- a greenfield-only methodology

## Core principles

1. Issue-first execution
2. Versioned truth outside chat memory
3. Role specialization
4. Artifact-based handoffs
5. QA as a gate
6. Risk-tiered verification
7. Parallelization by design, not accident
8. Portability across greenfield and brownfield repos

## Relationship to Pi, Beads, Dolt, and the control plane

The Firm does not sit beside Pi as a convention. It overrides Pi's default workflow assumptions by replacing them with:

- a mechanical control plane that derives the next governed step from repository state
- Beads-first work management for issue readiness, dependencies, claiming, blockers, and closure
- Dolt-backed auditability for decisions, handoffs, evidence, and workflow history
- explicit phases and gates
- specialist agents
- mandatory QA and closure discipline
- portable project doctrine

Pi remains the runtime. The Firm becomes the operating doctrine.

Within that stack:

- Pi executes work through agents and tools
- Beads manages work items and readiness
- Dolt records durable workflow truth
- the control plane dispatches the next governed unit of work

## Why Pi SDK

The Firm builds on Pi SDK (30.8K stars, MIT) as its execution runtime. Not on abstract agent frameworks.

Why:

- Pi SDK is a coding agent that runs in your terminal and writes code. That is what The Firm needs -- an executor, not an abstract framework.
- Mastra (22.6K stars) is a framework for building AI applications. Different layer. The Firm builds process, not product.
- Pi is the runtime. The Firm extends Pi with organizational structure.
The stack is a deliberate choice: Pi is the executor, The Firm is the organization.

## Success criteria

The Firm succeeds if it:

- structures work from idea to release
- makes multi-agent collaboration predictable
- enforces explicit handoffs and QA
- uses the control plane, Beads, and Dolt as coordinated workflow layers
- ports cleanly to both greenfield and brownfield repositories
- reduces context waste through better workflow structure
- uses expensive verification only when justified by risk

## Product outcome

WV:The first output of The Firm is **not code**. It is a **professional design package** that converts client intent into structured, reviewable, verifiable architecture—*before* build work begins.
XH:
VS:That package includes:
RB:- vision and problem framing
QH:- philosophy and constraints
MV:- operating model and workflow architecture
SS:- C4-style context, container, component, and deployment views
MW:- flow diagrams for critical paths
HV:- ADR-style architecture decision records
XQ:- integration boundary definitions
QK:- verification strategy with risk-tiered test planning
NW:- rollout and rollback planning
MR:- governed issue backlog with explicit closure criteria
NT:- greenfield bootstrap or brownfield adoption playbook
TZ:
BQ:The Firm treats this design package as a first-class deliverable, reviewed with the client before any implementation commitment.
