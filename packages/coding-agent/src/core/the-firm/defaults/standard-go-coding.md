---
name: "Go Coding"
description: "Go coding conventions and best practices"
owner: "The Firm Architecture Team"
language: Go
---

Follow standard Go project layout conventions.
Handle errors explicitly; never swallow with `_`.
Use `context.Context` as first parameter in all I/O functions.
Prefer interfaces defined at the consumer, not the provider.
Keep packages cohesive; avoid `util` or `helpers` packages.
