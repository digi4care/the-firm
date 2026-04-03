# Triage Investigation Reference

Reference for the `triage-issue` skill. Contains investigation patterns, root cause analysis techniques, and TDD fix plan templates.

---

## Investigation Patterns

### Entry Point Tracing

Start from where the bug manifests and trace backwards:

1. **UI/API response**: What does the user see?
2. **Controller/Handler**: Which code handles this request?
3. **Service/Business logic**: What processing happens?
4. **Data access**: What data is read/written?
5. **External dependencies**: APIs, databases, file systems

At each step: "Does the data look correct here?" If yes, go deeper. If no, you've found the boundary.

### Binary Search Debugging

When the bug is in a long flow:

1. Check the midpoint — is the data correct there?
2. If yes: bug is in the second half
3. If no: bug is in the first half
4. Repeat until isolated

### Diff-Based Investigation

Use git to find when the bug was introduced:

```bash
git log --oneline -- <affected-file>
git diff <last-known-good>..<current> -- <affected-area>
```

### Pattern Matching

Look for similar bugs that were fixed before:

```bash
git log --grep="<symptom keyword>"
git log --grep="fix" -- <affected-directory>
```

---

## Root Cause Classification

| Type | Pattern | Example |
|---|---|---|
| **Off-by-one** | Loop bounds, array indexing | `for (i = 0; i <= length` instead of `i < length` |
| **State mutation** | Shared state modified unexpectedly | Global variable changed by unrelated code |
| **Race condition** | Timing-dependent failure | Two async operations completing in wrong order |
| **Missing validation** | No input check at boundary | API accepts empty string where non-empty required |
| **Wrong assumption** | Code assumes something that isn't always true | "User always has an email" — but OAuth users might not |
| **Stale data** | Cached or stored data is outdated | Config cached at startup, not refreshed |
| **Integration mismatch** | Two systems disagree on contract | API returns `user_id` but consumer expects `userId` |

---

## TDD Fix Plan Template

### RED-GREEN Cycle Format

Each cycle describes ONE test and ONE minimal fix:

```markdown
1. **RED**: Write test `should reject order when item is out of stock`
   - Create order with item quantity > available stock
   - Assert: response status 400 with error "Out of stock"
   **GREEN**: Add stock validation in OrderService.create()
   - Before saving order, check item.stock >= order.quantity
   - If insufficient: throw OutOfStockError

2. **RED**: Write test `should decrement stock when order is placed`
   - Create order with quantity 3, item has stock 10
   - Assert: item.stock becomes 7 after order
   **GREEN**: Add stock decrement in OrderService.create()
   - After validation passes: item.stock -= order.quantity
```

### Durability Rules

- Tests assert on **observable outcomes**: API responses, database state, events emitted
- Tests do NOT assert on: private method calls, internal variable names, file paths
- Fix descriptions describe **behavior changes**, not code changes
- A good fix plan reads like a **spec**, not a **diff**

---

## Investigation Checklist

Before creating the GitHub issue, verify:

- [ ] Root cause is identified (not just the symptom)
- [ ] You've traced the full code path from entry to failure
- [ ] You've checked for similar patterns elsewhere in the codebase
- [ ] You've reviewed recent changes to affected files
- [ ] You've assessed test coverage for the affected area
- [ ] The fix plan has concrete RED-GREEN cycles
- [ ] Acceptance criteria are observable and testable
