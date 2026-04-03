# Conditional Types and Infer

Use conditional types when the output type should vary based on the input type.

## Typical Uses

- extracting return values, parameters, or element types
- branching on string versus object versus function inputs
- filtering members of a union

```ts
type ElementType<T> = T extends (infer U)[] ? U : never;
type PromiseType<T> = T extends Promise<infer U> ? U : never;
```

## Guidance

- use `infer` to extract a type part, not as a default pattern for every utility
- remember that conditional types distribute over unions unless wrapped
- keep nested conditions readable by splitting them into helper aliases
- if the logic becomes opaque, step back and simplify the API shape instead
