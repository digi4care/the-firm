# Type Guards and Testing

Use runtime guards and assertion functions to justify compile-time narrowing.

## Type Guards

```ts
function isString(value: unknown): value is string {
  return typeof value === "string";
}
```

## Assertion Functions

```ts
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new Error("Not a string");
}
```

## Type Tests

For reusable helper types, add compile-time tests so regressions fail early.

```ts
type AssertEqual<T, U> = [T] extends [U]
  ? [U] extends [T]
    ? true
    : false
  : false;
```

## Guidance

- prefer guards over `as` casts
- use assertions only when you are enforcing a real invariant
- add type tests for public helpers, utility libraries, and tricky inference behavior
