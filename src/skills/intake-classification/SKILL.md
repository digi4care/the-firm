---
name: intake-classification
description: Classify raw client requests into The Firm engagement types, expose missing information, propose minimum staffing, and define the first valid next step. Use when client input is still messy, partial, or not yet delivery-ready.
allowed-tools: Bash Read Write Edit
---

# Intake Classification

A The Firm-native skill for converting raw client input into a governed engagement entry.

## When to Use Me

Use me when:
- a client arrives with a rough idea or mixed set of asks
- the request is not yet clearly product, architecture, delivery, QA, or recovery work
- The Firm needs to classify the engagement before staffing or execution
- the next step is unclear because the request is still high-entropy

Do not use me for:
- direct implementation work on an already classified delivery item
- QA proof review for active work
- release decisions
- generic OMP configuration questions

## Workflow

1. Distill the client input into one clear objective and a short list of desired outcomes.
2. Determine the most likely engagement type.
3. Identify what is already known versus what is still missing.
4. Propose the minimum sufficient staffing shape.
5. Define the first valid next step.
6. If the request contains multiple distinct workstreams, mark backlog distillation as the next action instead of forcing premature execution.
7. Record the result into intake-shaped artifacts rather than leaving it only in chat.

## Error Handling

- If the objective is still ambiguous after reasonable distillation, stop and state what is missing.
- If the request mixes multiple incompatible engagement types, split it into classified workstreams or route to backlog distillation.
- If the request pretends to be delivery-ready but lacks acceptance or scope truth, classify it first instead of executing.
- If staffing would require a full-force deployment without justification, reduce to the minimum sufficient team and explain why.

## Quick Tests

Should trigger:
- "I have an idea but I do not know how to shape it."
- "Review this plan and tell me what kind of engagement it is."
- "I am asking several things at once; figure out how The Firm should handle them."

Should not trigger:
- "Implement this specific bugfix in src/api.ts."
- "Run QA on this completed feature."
- "Should we release this build?"

Functional:
- Produces an engagement classification.
- Produces missing-information notes.
- Produces a minimum staffing proposal.
- Produces a first valid next step.

## References

- `references/classification-guide.md`
- `.pi/internal/the-firm/THE_FIRM_CLIENT_ENGAGEMENT_MODEL.md`
- `.pi/internal/the-firm/THE_FIRM_DOCTRINE.md`

## Operational Notes

This skill exists because the client should not need to think like internal workflow middleware.

The Firm must absorb entropy and respond with structure.
