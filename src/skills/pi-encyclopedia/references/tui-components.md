# TUI Components Overview

All built-in TUI components from `@mariozechner/pi-tui`.

## Layout

| Component | Purpose |
|-----------|---------|
| `Container` | Groups child components vertically |
| `Box` | Container with padding and background |
| `Spacer` | Empty vertical space |

## Text Display

| Component | Purpose |
|-----------|---------|
| `Text` | Multi-line text with word wrap |
| `TruncatedText` | Single-line text that truncates |
| `Markdown` | Renders markdown with syntax highlighting |

## Input

| Component | Purpose |
|-----------|---------|
| `Input` | Single-line text input |
| `Editor` | Multi-line editor with autocomplete |

## Selection

| Component | Purpose |
|-----------|---------|
| `SelectList` | Interactive selection list |
| `SettingsList` | Settings panel with value cycling |

## Feedback

| Component | Purpose |
|-----------|---------|
| `Loader` | Animated loading spinner |
| `CancellableLoader` | Loader with abort support |

## Media

| Component | Purpose |
|-----------|---------|
| `Image` | Inline images (Kitty, iTerm2) |

## Quick Reference

```typescript
import {
  Container, Box, Spacer,
  Text, TruncatedText, Markdown,
  Input, Editor,
  SelectList, SettingsList,
  Loader, CancellableLoader,
  Image
} from "@mariozechner/pi-tui";
```

See full documentation at: `<ai_docs>/coding-agent/docs/tui.md`
