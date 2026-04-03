---
name: test-driven-development
description: Enforce Test-Driven Development discipline. Write failing test first, then minimal code, then refactor. Use when writing production code or implementing features. Do not use for debugging, documentation, or configuration tasks.
allowed-tools: Bash Read
---

# Test-Driven Development

**TDD discipline** - Write failing tests first, then minimal code, then refactor.

## When to Use This Skill

| Trigger | Action |
|---------|--------|
| "Create a new API endpoint" | Start with failing test |
| "Add user authentication" | Write test first |
| "Implement a new feature" | TDD cycle |
| "Write a login function" | Test-first approach |
| "Add a method to a class" | Test the behavior first |
| "Implement payment processing" | RED-GREEN-REFACTOR |

## When NOT to Use This Skill

| Trigger | Route To |
|---------|----------|
| "Debug this error" | Direct debugging |
| "Investigate why tests fail" | Systematic debugging |
| "Refactor this function" | Refactoring (no behavior change) |
| "Update the documentation" | Documentation task |
| "Configure the server" | Configuration task |
| "Explore this codebase" | Spike/exploration |
| "General programming question" | Direct help |

## The Iron Law

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

Write code before the test? Delete it. Start over.

## Workflow

### Step 1: RED - Write Failing Test

Write one minimal test showing what should happen.

**Good Example:**

```typescript
test("retries failed operations 3 times", async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error("fail");
    return "success";
  };

  const result = await retryOperation(operation);

  expect(result).toBe("success");
  expect(attempts).toBe(3);
});
```

> Clear name, tests real behavior, one thing

**Bad Example:**

```typescript
test("retry works", async () => {
  const mock = jest
    .fn()
    .mockRejectedValueOnce(new Error())
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce("success");
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
```

> Vague name, tests mock not code

**Requirements:**

- One behavior
- Clear name
- Real code (no mocks unless unavoidable)

### Step 2: Verify RED - Watch It Fail

**MANDATORY. Never skip.**

```bash
npm test path/to/test.test.ts
# or
bun test path/to/test.test.ts
```

**Confirm:**

- Test fails (not errors)
- Failure message is expected
- Fails because feature missing (not typos)

**Test passes?** You're testing existing behavior. Fix test.

**Test errors?** Fix error, re-run until it fails correctly.

### Step 3: GREEN - Minimal Code

Write simplest code to pass the test.

**Good Example:**

```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error("unreachable");
}
```

> Just enough to pass

**Rules:**

- Don't add features
- Don't refactor other code
- Don't "improve" beyond the test

### Step 4: Verify GREEN - Watch It Pass

**MANDATORY.**

```bash
npm test path/to/test.test.ts
```

**Confirm:**

- Test passes
- Other tests still pass
- Output pristine (no errors, warnings)

**Test fails?** Fix code, not test.

**Other tests fail?** Fix now.

### Step 5: REFACTOR - Clean Up

After green only:

- Remove duplication
- Improve names
- Extract helpers

**Keep tests green. Don't add behavior.**

### Step 6: Repeat

Next failing test for next feature.

## Error Handling

| Situation | Response |
|-----------|----------|
| **Code written before test exists** | STOP, request deletion, restart with test |
| **Test passes immediately** | Verify test tests the right thing, not existing behavior |
| **Multiple behaviors in one test** | Ask to split into separate tests |
| **Refactoring with failing tests** | STOP, require green tests first |
| **"I'll test after"** | STOP, TDD requires test first - no exceptions |
| **"Keeping code as reference"** | STOP, delete means delete |

## Testing Anti-Patterns to Avoid

### Anti-Pattern 1: Testing Mock Behavior

```typescript
// ❌ BAD: Testing that the mock exists
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});

// ✅ GOOD: Test real component or don't mock it
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

**Rule:** NEVER test mock behavior. Test what the code does, not what the mocks do.

### Anti-Pattern 2: Test-Only Methods in Production

```typescript
// ❌ BAD: destroy() only used in tests
class Session {
  async destroy() { /* only for tests */ }
}

// ✅ GOOD: Test utilities handle test cleanup
export async function cleanupSession(session: Session) {
  // cleanup logic in test-utils
}
```

**Rule:** NEVER add test-only methods to production classes.

### Anti-Pattern 3: Mocking Without Understanding

```typescript
// ❌ BAD: Mock breaks test logic
vi.mock("ToolCatalog", () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined),
}));
// Mock prevents config write that test depends on!

// ✅ GOOD: Mock at correct level, preserve behavior test needs
vi.mock("MCPServerManager"); // Just mock slow server startup
```

**Rule:** Understand dependencies first, mock minimally.

### Anti-Pattern 4: Incomplete Mocks

```typescript
// ❌ BAD: Partial mock - only fields you think you need
const mockResponse = {
  status: "success",
  data: { userId: "123" },
  // Missing: metadata that downstream code uses
};

// ✅ GOOD: Mirror real API completeness
const mockResponse = {
  status: "success",
  data: { userId: "123", name: "Alice" },
  metadata: { requestId: "req-789", timestamp: 1234567890 },
};
```

**Rule:** Mock the COMPLETE data structure as it exists in reality.

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Already manually tested" | Ad-hoc ≠ systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, start with TDD. |
| "Test hard = design unclear" | Listen to test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD faster than debugging. Pragmatic = test-first. |

## Verification Checklist

Before marking work complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for expected reason
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] No errors or warnings in output
- [ ] Edge cases covered

## Quick Tests

**Should trigger:**

- "Create a new API endpoint"
- "Add user authentication"
- "Implement payment processing"
- "Write a login function"
- "Implement a new endpoint with tests first"

**Should not trigger:**

- "Debug this error"
- "Investigate why tests fail"
- "Refactor this function (no behavior change)"
- "Update the documentation"
- "Configure the server"

## References

- `references/workflow-playbook.md` - RED-GREEN-REFACTOR cycle details
- `references/anti-patterns.md` - Testing anti-patterns to avoid
- `references/deep-modules.md` - Deep vs shallow modules (from "A Philosophy of Software Design")
- `references/mocking.md` - When and how to mock at system boundaries
- `references/tests.md` - Good vs bad test examples

## Related Skills

| Skill | Purpose | When to use |
|-------|---------|-------------|
| **systematic-debugging** | Debug existing issues | When tests fail unexpectedly |
| **code-review** | Review existing code | After implementation complete |
