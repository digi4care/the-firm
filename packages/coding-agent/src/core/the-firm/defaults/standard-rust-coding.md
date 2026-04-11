---
name: "Rust Coding"
description: "Rust coding conventions and best practices"
owner: "The Firm Architecture Team"
language: Rust
---

Use `clippy` with all lints enabled for CI.
Prefer `Result<T, E>` over panics for recoverable errors.
Use `thiserror` for library error types, `anyhow` for applications.
Keep `unwrap()` out of production code; use `expect()` with messages during development.
Follow the Rust API guidelines for naming conventions.
