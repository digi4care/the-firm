# Patterns and State Machines

Advanced types are often most useful at API boundaries between states or events.

## Prefer Discriminated Unions

Use tagged unions for async state, reducers, workflows, and event streams.

```ts
type AsyncState<T> =
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
```

## Typical Good Fits

- typed event emitters
- reducers and state machines
- type-safe API clients
- builders that enforce required fields before `build()`

## Guidance

- model legal transitions explicitly
- avoid optional-field bags when variants are mutually exclusive
- keep the runtime API understandable; the types should clarify it, not hide it
