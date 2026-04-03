---
name: backlog-distillation
description: Convert multiple client asks, side-paths, and drifting conversation into explicit backlog items, priorities, dependencies, and next-run proposals. Use when the client introduces more than one workstream or the conversation is outgrowing a single run.
allowed-tools: Bash Read Write Edit
---

# Backlog Distillation

A The Firm-native skill for converting conversational entropy into governed backlog structure.

## When to Use Me

Use me when:
- the client introduces multiple asks during one engagement
- the conversation mixes current work, future work, and side concerns
- the next run cannot be chosen safely without prioritization
- implicit workstreams need to become explicit backlog items

Do not use me for:
- a single cleanly scoped work item that is already ready for execution
- low-level issue mutation without backlog reasoning
- direct implementation or verification work

## Workflow

1. Collect the distinct asks, concerns, or workstreams present in the conversation.
2. Merge duplicates and separate unrelated threads.
3. Turn each distinct thread into a backlog item candidate.
4. Prioritize by prerequisite value, dependency, and risk rather than conversation order.
5. Mark what belongs in the current run versus later runs.
6. Identify what can be delegated safely and what must wait for stronger structure.
7. Produce a backlog artifact and corresponding issue-ready item list.

## Error Handling

- If the asks are still too ambiguous to separate, stop and state the ambiguity rather than faking backlog precision.
- If prioritization depends on unknown technical or client constraints, state that and propose the next clarification or discovery step.
- If one ask materially blocks all others, surface that dependency clearly.

## Quick Tests

Should trigger:
- "I want all of these things and I do not know what should happen first."
- "Take these different requests and make a proper backlog."
- "We have drifted into too many side topics; structure the work."

Should not trigger:
- "Implement this one scoped feature."
- "Audit this finished artifact."
- "Explain one architecture tradeoff."

Functional:
- Produces explicit backlog items.
- Orders them by prerequisite value rather than chat order.
- Distinguishes current-run from later-run work.
- Flags delegation opportunities only after structure is explicit.

## References

- `references/backlog-guide.md`
- `.pi/internal/the-firm/THE_FIRM_WORKFLOW_ARCHITECTURE.md`
- `.pi/internal/the-firm/THE_FIRM_OPERATIONAL_CONSTRAINTS.md`

## Operational Notes

The client should not have to manually maintain The Firm's internal queue.

When multiple asks arrive, The Firm should turn them into backlog and run structure rather than continuing as one undifferentiated thread.
