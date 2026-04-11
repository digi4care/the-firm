---
name: "Java Coding"
description: "Java coding conventions and best practices"
owner: "The Firm Architecture Team"
language: Java
---

Follow the Google Java Style Guide.
Use `Optional` instead of returning null for possibly-absent values.
Prefer immutability: use `final`, `record`, and immutable collections.
Use dependency injection consistently; avoid `new` for service objects.
Keep methods under 30 lines; extract helper methods early.
