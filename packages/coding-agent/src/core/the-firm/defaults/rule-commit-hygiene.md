---
name: "Commit Hygiene"
description: "Standards for git commits and branching"
alwaysApply: true
---

- Write commit messages that explain intent; imperative mood ("Add feature" not "Added feature")
- Keep commits atomic — one logical change per commit
- Do not commit generated files, build artifacts, or secrets
- Rebase before merging to maintain clean history
- Use conventional commit prefixes when the project adopts them
- Never force-push to shared branches
