# 06 - Technical Stack and Dependencies

> **Overview:** The technical foundation of The Firm.

---

## Runtime Stack

| Component | Technology | Role |
|-----------|-----------|------|
| **Runtime** | Pi (badlogic/pi-mono) | Agent loop, sessions, tools, TUI |
| **Language** | TypeScript | All code |
| **Package manager** | npm | Dependencies, scripts |
| **Build** | tsup | Compilation |
| **Binary** | `firm` / `firm-dev` | CLI entry point |
| **Config dir** | `~/.the-firm/` | User settings, auth, sessions |
| **Project dir** | `.firm/` | Project-level agents, workflows, context |

---

## The Firm SDK

The contract layer between Pi runtime and The Firm product features.

**Provides:**
- Extension API (registerCommand, registerTool, events, UI)
- Context management primitives
- Model policy resolution
- Workflow engine integration
- Agent lifecycle management

**Boundary:** The Firm SDK wraps Pi's ExtensionAPI and adds The Firm-specific constructs. Product features use the SDK, not raw Pi internals.

---

## Key Dependencies

| Dependency | Purpose |
|-----------|---------|
| Pi core | Runtime substrate |
| The Firm SDK | Product contract layer |
| Archon YAML format | Workflow definition compatibility |

---

## Monorepo Structure

```
the-firm/
├── packages/
│   ├── coding-agent/     ← Pi fork (agent loop, TUI, extensions)
│   ├── agent/            ← Agent runtime
│   ├── ai/               ← AI/provider layer
│   ├── tui/              ← Terminal UI
│   ├── web-ui/           ← Web UI
│   ├── mom/              ← Session/event management
│   └── pods/             ← Model definitions
├── docs/
│   ├── product/          ← Product documentation (you are here)
│   ├── architecture/     ← Architecture decisions
│   ├── upstream/         ← Upstream tracking
│   └── research/         ← Research artifacts
├── scripts/
│   └── upstream-watch.sh ← Daily upstream triage
└── .firm/                ← Project-level config
```

---

## Extension Points

The Firm extends Pi at these seams:

| Seam | Mechanism | Example |
|------|-----------|---------|
| Commands | `registerCommand()` | `/firm:extract`, `/firm:harvest` |
| Tools | `registerTool()` | Context operations |
| Events | `pi.on("tool_call", ...)` | Approval gates, permission checks |
| UI | `ctx.ui.select/confirm/input` | Interactive wizards |
| Compaction | Custom compaction strategy | Context-aware compaction |
| System prompt | `system_prompt_header` | Inject The Firm identity |
| Model policy | Settings overrides | Role-based model resolution |

---

## Fork Maintenance

| Activity | Frequency | Tool |
|----------|-----------|------|
| Upstream sync | Daily | `npm run upstream:watch` |
| Merge upstream | As needed | Git merge from badlogic/pi-mono |
| Divergence tracking | Per merge | `docs/upstream/BASELINE.md` |
| Adoption log | Per decision | `docs/upstream/ADOPTION-LOG.md` |
