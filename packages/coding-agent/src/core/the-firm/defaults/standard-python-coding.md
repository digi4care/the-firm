---
name: "Python Coding"
description: "Python coding conventions and best practices"
owner: "The Firm Architecture Team"
language: Python
---

Follow PEP 8; use `ruff` for linting and formatting.
Use type hints for all function signatures.
Prefer `pathlib` over `os.path`.
Use dataclasses or Pydantic models over raw dicts for structured data.
Avoid mutable default arguments.
Use `asyncio` for I/O-bound work; keep synchronous code simple.
