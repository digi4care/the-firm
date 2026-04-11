---
name: "Svelte Components"
description: "Svelte component structure and conventions"
owner: "The Firm Architecture Team"
language: Svelte
---

One component per file; filename matches the primary export.
Script block first, then markup, then styles.
Use `$state` and `$derived` runes (Svelte 5+) over legacy stores.
Keep component props typed via `interface Props`.
Use `class:` directives over inline conditional styles.
Prefer slot composition over prop-driven rendering for layout components.
