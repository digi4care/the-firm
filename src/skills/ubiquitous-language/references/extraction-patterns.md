# Ubiquitous Language Patterns

Reference for the `ubiquitous-language` skill. Contains term extraction patterns, ambiguity classification, and glossary writing guidelines.

---

## Term Extraction Patterns

### Where to Look for Domain Terms

1. **Nouns used consistently**: "order", "customer", "shipment" — these are entities
2. **Verbs with business meaning**: "fulfill", "dispatch", "cancel" — these are actions/events
3. **Adjectives that qualify state**: "pending", "confirmed", "delivered" — these are statuses
4. **Compound terms**: "order line", "shipping address" — these might be value objects
5. **Phrases people repeat**: "batch processing", "end of day" — these might be domain concepts

### What to Skip

- Generic programming terms (array, function, endpoint)
- UI elements (button, dropdown, modal) — unless they represent a domain concept
- Technical infrastructure (database, cache, queue) — unless domain-specific
- Variables names in code that don't match business language

---

## Ambiguity Classification

### Type 1: Same Word, Different Meaning

Example: "account" means both "customer account" and "user login account"

Resolution: Pick distinct terms for each meaning.

| Ambiguous Term | Meaning A | Meaning B | Resolution |
|---|---|---|---|
| Account | Customer's business relationship | Authentication identity | **Customer** vs **User** |
| Order | Purchase request | Sort command | **Order** (purchase) vs **Sort** |
| Product | Physical item | Software product | **Item** vs **Product** |

### Type 2: Different Words, Same Meaning

Example: "client", "customer", "buyer" all mean the same thing

Resolution: Pick ONE canonical term, list others as "aliases to avoid".

### Type 3: Vague/Overloaded Term

Example: "process" could mean a workflow, a function, or a business procedure

Resolution: Replace with a specific term that clarifies the meaning.

---

## Glossary Writing Guidelines

### Definition Format

One sentence max. Define what it IS, not what it DOES.

| Good | Bad |
|---|---|
| "A Customer's request to purchase one or more Items" | "Something that represents the purchase workflow through various states" |
| "A person or organization that places Orders" | "An entity in the system that can have multiple relationships" |

### Relationship Format

Express cardinality where it's clear:

- "An **Order** contains one or more **Order Lines**"
- "A **Customer** may have zero or more **Orders**"
- "Each **Order Line** references exactly one **Product**"

### Example Dialogue Guidelines

A good example dialogue:

1. Uses 4-6 terms from the glossary naturally
2. Shows a dev asking a domain expert for clarification
3. Demonstrates precision in term usage
4. Clarifies a boundary between related concepts
5. Is 3-5 exchanges long

---

## Grouping Strategy

When to create separate groups vs. one table:

| Situation | Approach |
|---|---|
| All terms belong to one subdomain | Single table with one heading |
| Clear subdomain boundaries (e.g., billing vs. shipping) | Separate tables per subdomain |
| Terms have different lifecycle phases | Group by lifecycle (e.g., "Order lifecycle", "Payment lifecycle") |
| Terms are about different actors | Group by actor (e.g., "People", "System entities") |

Don't force groupings. If terms are cohesive, keep them together.

---

## Re-running Protocol

When updating an existing glossary:

1. **Read existing** `UBIQUITOUS_LANGUAGE.md` first
2. **Mark changes**: "(new)" for new entries, "(updated)" for changed definitions
3. **Preserve accepted terms** — don't rename something that was already agreed upon
4. **Re-flag** only NEW ambiguities
5. **Update example dialogue** to incorporate new terms
6. **State commitment**: "From this point forward I will use these terms consistently"
