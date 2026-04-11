---
status: active
description: "4-layer enforcement stack: standard → guide → agent override → rule. Each layer derives from the one above."
owner: The Firm Architecture Team
created: 2026-04-09
updated: 2026-04-09
review-cadence: quarterly
---

# Pattern: Knowledge Cascade

4-layer enforcement stack ensuring knowledge flows from source-of-truth standards to always-present rules.

## Problem

AI agents need both deep understanding (standards, rationale) and compact reminders (rules). Loading everything is too expensive; loading nothing loses critical context. When standards and rules diverge, agents follow stale or contradictory guidance.

## Solution

Organize knowledge in a cascade of 4 layers. Each layer derives from the one above. Lower layers are more compact and always-present:

| Layer | Location | What | Size | When Loaded |
|-------|----------|------|------|-------------|
| Standard | `.firm/lookup/standards/` | What + Why (full rationale) | ~50-200 lines | On demand |
| Guide | `.firm/guides/` | How (step-by-step) | ~50-150 lines | On demand |
| Agent Override | `.pi/agents/` | AI behavioral constraints | Varies | Session start |
| Rule | `.pi/rules/` | Compact directives | ~10-30 lines | Always |

## Cascade Rules

1. **Rules derive from standards.** A rule is the compressed form of a standard. Never change a rule independently — update the standard, regenerate the rule.
2. **Standards are source of truth.** If a rule contradicts a standard, the standard wins.
3. **Guides connect standards to practice.** They show how to apply a standard in real workflows.
4. **Agent overrides reference all three.** They load standards on demand, follow guides, and always have rules in context.

## Example

Standard: `yaml-frontmatter.md` ("All .firm/ files must have YAML frontmatter with these fields...")
→ Guide: `session-start.md` ("Load .firm/navigation.md to discover available knowledge...")
→ Agent Override: `task.md` (`<context-loading>` section references .firm/ paths)
→ Rule: None (frontmatter is validated by tooling, not a coding rule)

## Anti-Patterns

| Anti-Pattern | Problem |
|-------------|----------|
| Rule with no standard | No rationale, cannot be questioned or improved |
| Standard with no rule | Important guidance forgotten at session start |
| Rule changed independently | Diverges from standard, creates contradictions |
| Guide duplicates standard | Sync burden, one becomes stale |

---
*Navigation: [Back to parent](../navigation.md)*
