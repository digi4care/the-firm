# Verification Command Reference

Reference for the `verification-before-completion` skill. Contains platform-specific verification commands, evidence standards, and failure response patterns.

---

## Verification Commands by Stack

### JavaScript / TypeScript (Bun)

| What to verify | Command | Success signal |
|---|---|---|
| Tests pass | `bun test` | exit 0, 0 failures |
| Lint clean | `bun run lint` | exit 0, 0 errors |
| Build succeeds | `bun run build` | exit 0 |
| Type check | `bunx tsc --noEmit` | exit 0, 0 errors |
| Format check | `bun run format:check` | exit 0 |

### JavaScript / TypeScript (npm)

| What to verify | Command | Success signal |
|---|---|---|
| Tests pass | `npm test` | exit 0, 0 failures |
| Lint clean | `npm run lint` | exit 0, 0 errors |
| Build succeeds | `npm run build` | exit 0 |

### Python

| What to verify | Command | Success signal |
|---|---|---|
| Tests pass | `pytest` | exit 0, 0 failures |
| Lint clean | `ruff check .` | exit 0 |
| Type check | `mypy .` | exit 0 |
| Format check | `ruff format --check .` | exit 0 |

### Rust

| What to verify | Command | Success signal |
|---|---|---|
| Tests pass | `cargo test` | exit 0, 0 failures |
| Lint clean | `cargo clippy` | exit 0, no warnings |
| Build succeeds | `cargo build` | exit 0 |
| Format check | `cargo fmt --check` | exit 0 |

### Go

| What to verify | Command | Success signal |
|---|---|---|
| Tests pass | `go test ./...` | exit 0, 0 failures |
| Vet clean | `go vet ./...` | exit 0 |
| Build succeeds | `go build ./...` | exit 0 |

### Generic / Make

| What to verify | Command | Success signal |
|---|---|---|
| All checks | `make check` or `just check` | exit 0 |
| Tests | `make test` or `just test` | exit 0 |
| Lint | `make lint` or `just lint` | exit 0 |

---

## Evidence Standards

### What counts as evidence

| Level | Example | Acceptable |
|---|---|---|
| Fresh command output | `[Run bun test] → 34/34 pass, exit 0` | ✅ Yes |
| Cached/previous run | "Tests passed 5 minutes ago" | ❌ No |
| Agent's word | "I believe the tests pass" | ❌ No |
| Partial output | "First 10 tests passed" | ❌ No (need full run) |
| CI green | "CI shows all green" | ⚠️ Only if you also ran locally |

### Evidence format

When claiming verification, always include:

```
✅ [claim] — verified:
   [command run] → [key output line] + exit code
```

Example:

```
✅ All tests pass — verified:
   bun test → 34 tests, 34 passed, 0 failed (exit 0)
```

---

## Failure Response Patterns

### When verification fails

1. **Report honestly**: "Tests are failing. Here's what I see:"
2. **Show the failure**: Include relevant error output
3. **Fix immediately**: Don't move on to the next task
4. **Re-verify**: Run the same command again after fixing
5. **Only then**: Claim completion

### When verification is ambiguous

- Exit code is 0 but output has warnings → investigate warnings before claiming success
- Tests pass but with skips → check if skipped tests are relevant
- Build succeeds but with deprecation warnings → note them, don't ignore

### Rationalization trap

Common rationalizations and their counters:

| Rationalization | Counter |
|---|---|
| "It worked before" | Run it NOW |
| "I only changed a comment" | Verify anyway — it takes 10 seconds |
| "The CI will catch it" | You're not done until it passes locally |
| "I'm 99% sure" | Run the command |
| "It's too slow to run" | Run it in background, wait for result |
