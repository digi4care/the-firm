---
name: firm-front-desk
description: "Absorb raw client input and route it into the correct The Firm workflow: intake classification, backlog distillation, direct execution preparation, or escalation. Use when the client is speaking to The Firm and the right next path is not yet explicit."
allowed-tools: Bash Read Write Edit
---

# Firm Front Desk

A The Firm-native coordination skill for turning live client conversation into the correct governed next step.

## When to Use Me

Use me when:
- the client is asking The Firm for help and the right workflow path is not yet explicit
- the input is messy, mixed, or high-entropy
- the conversation may contain more than one workstream
- The Firm must decide whether to classify, backlog, route, or escalate

Do not use me for:
- already scoped implementation work with a clear owning run
- narrow QA or release decisions already in progress
- direct execution of specialist work

## Workflow

1. Read the client input as a firm-facing request, not as an implementation prompt.
2. Decide whether the request is best treated as:
   - intake classification
   - backlog distillation
   - direct routing into an existing governed run
   - escalation to a lead or council
3. If the request is still too ambiguous, prefer intake classification.
4. If the request contains multiple asks, side-paths, or shifting concerns, prefer backlog distillation.
5. If the request materially changes active work, treat it as backlog or engagement steering rather than silent continuation.
6. Produce the minimum clear structure needed for downstream execution.

## Error Handling

- If no truthful workflow path can be chosen, stop and state the ambiguity.
- If the client request would bypass issue-first execution, redirect it into intake or backlog handling.
- If the request would require a strategic or governance decision, escalate instead of forcing a local answer.

## Quick Tests

Should trigger:
- "I am the client and I am asking The Firm several things at once."
- "Figure out how this request should be handled before anyone starts building."
- "This conversation is drifting — route it correctly."

Should not trigger:
- "Implement this already-scoped task."
- "Run QA on this completed work item."
- "Release this build."

Functional:
- Chooses between intake classification, backlog distillation, direct routing, or escalation.
- Prevents generic conversational continuation when structure is needed.
- Produces a firm-facing next action rather than ad hoc execution.

## References

- `references/routing-guide.md`
- `.pi/skills/intake-classification/SKILL.md`
- `.pi/skills/backlog-distillation/SKILL.md`
- `.pi/internal/the-firm/THE_FIRM_CLIENT_ENGAGEMENT_MODEL.md`

## Operational Notes

The client should feel like they are speaking to a professional firm, not to a loose swarm of half-routed specialists.

This skill exists to ensure that entropy is converted into governed flow before execution expands.
