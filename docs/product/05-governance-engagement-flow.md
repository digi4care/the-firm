# 05 - Governance & Engagement Flow

> **Overview:** How work flows through The Firm — from raw input to governed output.

---

## The Core Flow

```
[Raw Input]                "I want an auth system"
    ↓
[Intake]                   Classify, scope, determine engagement type
    ↓
[Deliberation]             Clarify, brainstorm, align (if needed)
    ↓
[Planning]                 Create plan with decisions, scope, risks
    ↓
[Approval]                 Human approves plan before execution
    ↓
[Execution]                Workflow runs with scoped context per phase
    ↓
[Review]                   Review output against standards
    ↓
[Delivery]                 Deliver with handoff brief
    ↓
[Capture]                  Promote relevant artifacts to durable memory
```

---

## Engagement Types

Not all work needs the full flow. The Firm classifies work into engagement types:

| Type | Flow | Example |
|------|------|---------|
| **Quick task** | Direct execution | "Fix this typo" |
| **Feature** | Plan → Approve → Execute → Review | "Add OAuth integration" |
| **Investigation** | Deliberation → Report | "Why is the API slow?" |
| **Content** | Brief → Draft → Review → Publish | "Write a blog post about X" |
| **Architecture** | Deliberation → ADR → Plan → Execute | "Redesign the auth layer" |

---

## Governance Principles

### 1. Deliberation before execution
For large or ambiguous work, planning quality depends on structured deliberation before execution begins. This is not a single agent or single prompt — it's a multi-perspective process.

### 2. Approval before irreversible action
No ungoverned writes. Plans must be approved before implementation starts. Destructive changes must be confirmed.

### 3. Context per phase
Each phase receives scoped ContextProfiles — not "all context." Who gets what context, in which form, at which time, is explicit.

### 4. Templates as communication contracts
Templates define how entities communicate: intake briefs, plan documents, handoff briefs, review findings. This reduces ambiguity.

### 5. Capture what matters
Not everything becomes permanent. Only artifacts that meet promote criteria (used across sessions, explains a decision, prevents an error, defines a standard) become durable memory.

### 6. Model fit per work type
Different work deserves different models. Brainstorming gets a creative model. Review gets a thorough model. Implementation gets a fast model. Model policy is part of the workflow contract.

---

## Workflow-Engagement Mapping

```
Engagement type "Feature"
    ↓
Maps to workflow: plan-build-review.yaml
    ↓
Workflow phases:
  1. plan       → agent: planner,    template: plan-document,    model_role: creative
  2. build      → agent: builder,    template: handoff-brief,    model_role: fast
  3. review     → agent: reviewer,   template: review-findings,  model_role: thorough
    ↓
Each phase gets its own:
  - Context profile (scoped)
  - Model (via role or direct)
  - Template (communication protocol)
  - Approval gate (before next phase)
```

---

## Human-in-the-Loop

The Firm keeps humans in control at key moments:

| Gate | When | What happens |
|------|------|-------------|
| Plan approval | Before execution | Human reviews and approves plan |
| Phase transition | Between workflow phases | Optional: review intermediate output |
| Review findings | After review phase | Human sees findings before proceeding |
| Memory promote | When capturing durable knowledge | Human confirms what gets saved |
| Destructive ops | Before deletion/overwrite | Confirmation required |

---

## Error Handling

When things go wrong:

1. **Stop** — never auto-fix silently
2. **Report** — show what failed and why
3. **Propose** — suggest a fix
4. **Request approval** — human decides
5. **Fix and re-validate** — verify the fix works

This applies at every level: agent execution, workflow phases, context operations.
