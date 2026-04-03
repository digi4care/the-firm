# Generics and Constraints

Use generics when input and output types are related and should stay linked across a reusable API.

## Good Uses

- identity and transformation helpers
- reusable collections and repositories
- builders and fluent APIs
- wrappers that preserve caller-provided types

## Constraint Guidance

Use `extends` to describe the minimum structure required.

```ts
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(value: T): T {
  console.log(value.length);
  return value;
}
```

## Rules

- constrain only what the implementation truly needs
- prefer one well-named type parameter over several vague ones
- if the generic parameter does not connect two positions, it may not need to be generic at all
- avoid adding generics only to look flexible
