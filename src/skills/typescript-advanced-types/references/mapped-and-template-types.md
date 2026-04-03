# Mapped and Template Types

Use mapped types to transform object shapes and template literal types to build string-based contracts.

## Mapped Types

Good for:
- readonly or optional variants
- picking keys by value shape
- key remapping

```ts
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

## Template Literal Types

Good for:
- event names
- nested path strings
- key remapping helpers

```ts
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;
```

## Guidance

- use key remapping when names carry real semantics
- do not generate giant string unions unless the API truly benefits
- prefer explicit unions when the generated shape is small and easier to read directly
