# Intent Engineering

> The discipline of making goals, values, trade-offs, and decision boundaries machine-readable and machine-actionable.

## The Problem

AI systems can optimize perfectly for the wrong thing. This is the most dangerous kind of failure—the one that looks like success until it's too late.

**Example**: An AI customer service agent achieved:

- 2.3M conversations handled
- Resolution time: 11min → 2min
- 700 human agents replaced
- $60M saved
- All metrics green

**What the dashboards didn't show**:

- Customer satisfaction slipped
- Nuanced problems got generic responses
- Speed was optimized over actually helping people

The AI worked brilliantly at doing the wrong thing.

## Three Layers of AI Engineering

| Layer                   | Question                          | Purpose                                        |
| ----------------------- | --------------------------------- | ---------------------------------------------- |
| **Prompt Engineering**  | What should I say?                | Craft the right words for a good response      |
| **Context Engineering** | What does the model need to know? | Fill context window with the right information |
| **Intent Engineering**  | What does success look like?      | Define goals, values, and decision boundaries  |

Each layer builds on the last: Prompts live inside Context. Context lives inside Intent.

## Context vs Intent Engineering

| Aspect   | Context Engineering            | Intent Engineering           |
| -------- | ------------------------------ | ---------------------------- |
| Solves   | The feeding problem            | The direction problem        |
| Controls | What information the model has | What the model optimizes for |
| Asks     | What does it need to know?     | What must be accomplished?   |
| Risk     | Can still optimize wrong thing | Prevents wrong optimization  |

**Key insight**: You can architect perfect information flow and still build a system that optimizes for the wrong metrics.

## The 7-Component Framework

### 1. Objective

What problem are you solving and why does it matter?

### 2. Desired Outcomes

What observable changes should happen from the user's perspective?

### 3. Health Metrics

What metrics must **not** degrade while pursuing the goal?

> This is the game-changer. It's what prevents optimizing speed while sacrificing satisfaction.

### 4. Strategic Context

The operating environment the agent needs to understand.

### 5. Constraints

- **Soft constraints**: Guide behavior
- **Hard constraints**: Enforced in code

### 6. Decision Autonomy

Which decisions can the agent make alone vs. which require human approval?

### 7. Stop Rules

When should the agent hold, escalate, or mark a task as complete?

---

Define all seven, and your agent knows not just what to do, but **what to protect while doing it**.

## Practical Example: Customer Support Agent

### Without Intent Engineering

```
Instruction: Handle customer tickets
```

**Result**: Optimizes for speed, closes tickets fast, generic answers everywhere.

### With Intent Engineering

| Component            | Definition                                                     |
| -------------------- | -------------------------------------------------------------- |
| **Objective**        | Help customers resolve issues without frustration              |
| **Desired Outcomes** | Customer confirms issue resolved; no repeat tickets within 24h |
| **Health Metrics**   | Satisfaction above 4.2; escalation quality stable              |
| **Constraints**      | Never offer refunds over $50 without human approval            |
| **Stop Rules**       | If customer expresses frustration → escalate immediately       |

**Same agent, same AI model. Completely different behavior.** The technology didn't change. The intent did.

## Intent vs Instructions

Many organizations think they have intent defined. What they actually have are **instructions**—and those are not the same thing.

| Instructions                   | Intent                                                          |
| ------------------------------ | --------------------------------------------------------------- |
| "Handle tickets fast"          | "Resolve issues while keeping satisfaction > 4.2"               |
| "Generate a financial summary" | "Enable leadership to make a funding decision within 5 minutes" |
| Tell AI what to generate       | Tell AI what to want                                            |

Intent engineering makes the **implicit explicit**.

## Why Formalize It?

1. **Teachable**: Others can learn and apply the framework
2. **Repeatable**: Consistent approach across projects
3. **Auditable**: Can verify intent was properly defined
4. **Prevents silent failures**: Catches optimization for wrong metrics

If everyone already knew how to do this, 95% of AI pilots wouldn't fail.

## Quick Start

Start with one agent. Define these four things:

1. **Objective** — What problem is it solving?
2. **Desired Outcomes** — What changes when it succeeds?
3. **Health Metrics** — What must not get worse?
4. **Stop Rules** — When should it halt?

That's it. Four definitions to prevent your AI from optimizing for the wrong thing.

---

## Summary Table

| Layer   | Tells AI...      | Question                       |
| ------- | ---------------- | ------------------------------ |
| Prompt  | What to generate | "What should I say?"           |
| Context | What to know     | "What information do I need?"  |
| Intent  | What to want     | "What does success look like?" |

---

_Source: Synthesized from "Intent Engineering vs Context Engineering: Which Actually Works?"_
