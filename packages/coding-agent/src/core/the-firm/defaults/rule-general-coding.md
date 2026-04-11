---
name: "General Coding"
description: "Universal coding best practices applicable to any project"
alwaysApply: true
---

- Write self-documenting code; use comments only to explain why, not what
- Keep functions short and focused — one function, one job
- Use descriptive names that reveal intent; avoid abbreviations unless domain-standard
- Handle errors explicitly; never silently swallow exceptions
- Validate inputs at system boundaries (API endpoints, CLI args, config files)
- Avoid magic numbers and strings — extract into named constants
- Prefer immutability; mutate state only when necessary and document why
- Keep dependencies minimal; every dependency is a liability
- Write tests for edge cases, not just happy paths
- Delete dead code immediately; commented-out code is technical debt
