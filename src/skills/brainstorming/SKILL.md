---
name: brainstorming
description: "Turn ideas into fully formed designs through collaborative dialogue. Explores intent, requirements, constraints, and proposes approaches before any implementation. Use when starting a new feature, designing a component, or any creative work that needs structure before building. Keywords - brainstorm, design, idea, approach, spec, explore, creative."
allowed-tools: Bash Read
---

# Brainstorming Ideas Into Designs

Turn ideas into fully formed designs through collaborative dialogue. Ask questions one at a time, propose approaches, present design, get approval — then hand off to planning. This skill does NOT write or mutate files — it only reads context and talks.

<HARD-GATE>
Do NOT write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

## When to Use

Use me when:
- starting a new feature or component
- an idea needs structure before implementation
- exploring approaches and trade-offs
- designing architecture or module boundaries
- any creative work where "just start coding" would be premature
- user says "brainstorm", "design this", "how should we approach", "explore options"

Do not use me for:
- executing an already-approved plan → use `executing-plans`
- debugging or investigating a bug → use `systematic-debugging`
- writing a PRD (product requirements document) → use `write-a-prd`
- reviewing existing code → use `review`

## Anti-Pattern: "This Is Too Simple To Need A Design"

Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

## Workflow

### Step 1: Explore Project Context

- Check current files, docs, recent commits
- Understand the existing codebase structure and patterns
- Assess scope: if the request describes multiple independent subsystems, flag this immediately

**If scope is too large:** help the user decompose into sub-projects first. What are the independent pieces, how do they relate, what order should they be built? Then brainstorm the first sub-project. Each sub-project gets its own design → plan → implementation cycle.

### Step 2: Ask Clarifying Questions

- Ask **one question at a time** — never multiple
- Prefer multiple choice when possible, but open-ended is fine
- Focus on understanding: purpose, constraints, success criteria
- If a question can be answered by exploring the codebase, explore instead of asking

### Step 3: Propose 2-3 Approaches

- Present different approaches with trade-offs
- Lead with your recommended option and explain why
- Keep YAGNI in mind — remove unnecessary features from all approaches

### Step 4: Present Design

- Present the design in sections scaled to complexity
- Ask after each section whether it looks right
- Cover: architecture, components, data flow, error handling, testing
- Design for isolation: break into units with one clear purpose, well-defined interfaces

### Step 5: User Approval Gate

Ask the user to approve the design before anything gets written:

> "Here's the design. Does this look right? If yes, I'll write it to a design doc."

Wait for approval. If changes requested, update the design and ask again. Only proceed once approved.

### Step 6: Hand Off

After approval, the design is ready to be documented and planned. Hand off to:
- `writing-plans` — to create an implementation plan
- Or the user writes the design doc themselves

This skill does NOT write files. It only reads context and facilitates the conversation.

## Key Principles

| Principle | How |
|-----------|-----|
| One question at a time | Never ask multiple questions in one message |
| Multiple choice preferred | Easier to answer than open-ended |
| YAGNI ruthlessly | Remove unnecessary features from all designs |
| Explore alternatives | Always propose 2-3 approaches before settling |
| Incremental validation | Present design section by section, get approval per section |
| Be flexible | Go back and clarify when something doesn't make sense |

## Error Handling

| Situation | Response |
|-----------|----------|
| Idea is too vague | Ask "what would success look like?" to find concrete goals |
| Scope is too large | Propose decomposition into sub-projects, start with first one |
| User can't answer a question | Rephrase with concrete examples or multiple choice |
| Approaches are too similar | Highlight the specific differences and trade-offs |
| Design keeps changing | Surface the instability, propose pinning decisions |
| No codebase context available | Proceed with interview-only approach, note assumptions |
| User wants to skip to code | Explain why design prevents wasted work. A few minutes of design saves hours of rework. |

## Quick Tests

Should trigger:
- "I want to build a feature for X"
- "How should we approach this problem?"
- "Brainstorm ideas for the dashboard"
- "Design the authentication module"
- "Explore options for the data layer"

Should not trigger:
- "Execute this plan" → `executing-plans`
- "Debug this error" → `systematic-debugging`
- "Write a PRD" → `write-a-prd`
- "Review my code" → `review`

Functional:
- Explores project context, asks questions one at a time, proposes 2-3 approaches, presents design, writes spec, hands off to planning
