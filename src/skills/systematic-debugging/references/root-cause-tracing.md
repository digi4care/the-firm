# Root Cause Tracing

## Overview

When an error occurs deep in the call stack, trace backward to find where the bad data originated.

**Core principle:** Fix at the source, not at the symptom.

## The Tracing Process

### Step 1: Identify the Error Point

Find where the error actually occurs:

- Read the stack trace
- Find the deepest frame where error is thrown
- Note the exact line and the bad value

### Step 2: Ask "Where Did This Come From?"

For the bad value, trace backward:

```
Error: undefined is not a function
  at processUser (user.ts:42)
    ← user parameter is undefined

  Where did user come from?
  ← loadUser (api.ts:28)
    ← API response parsing

  Where did response come from?
  ← fetch call (http.ts:15)
    ← Backend API
```

### Step 3: Check Each Layer

At each step, ask:

- Is the data correct here?
- If yes: Continue to next layer
- If no: Found the source

### Step 4: Fix at Source

Don't fix the symptom (checking for undefined everywhere).
Fix the source (why was it undefined in the first place?).

## Example Walkthrough

**Error:**

```
TypeError: Cannot read property 'name' of undefined
  at renderUser (UserCard.tsx:15)
```

**Trace:**

1. **renderUser** line 15: `user.name` - user is undefined
2. **Who called renderUser?** Parent component at line 42
3. **Parent component:** Gets user from props
4. **Props come from?** Container component
5. **Container:** Fetches from API, does `setUser(data)`
6. **API response:** Sometimes returns `{ user: null }` instead of user object

**Source:** API returns null for missing users instead of 404

**Fix:** Handle API null response properly, not undefined checks everywhere

## Common Tracing Patterns

| Error Location | Likely Source |
|----------------|---------------|
| Deep in utility | Wrong input from caller |
| Database query | Wrong parameters upstream |
| API response | Backend logic or data |
| UI component | Container/parent data flow |
| Test failure | Test setup or mock data |

## Gate Function

```
BEFORE fixing any bug:
  Ask: "Is this the source or just a symptom?"

  IF fixing symptom:
    STOP - Trace to source first
    Ask "Where did this bad value originate?"
    Keep tracing until you find the source
    Fix there instead

  IF unsure if symptom:
    Assume it's a symptom
    Trace backward anyway
```

## Tools for Tracing

1. **Debugger/Step-through** - Pause at error, step backward
2. **Console.log** - Log values at each layer
3. **Git blame** - What changed recently?
4. **Stack trace** - Follow the call chain

## The Rule

```
Fix at source → prevents bug everywhere
Fix at symptom → bug persists, workaround spreads
```
