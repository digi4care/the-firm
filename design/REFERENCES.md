# References

Overview of relevant repositories for The Firm project.

## Pi SDK -- the platform

- <https://github.com/badlogic/pi-mono> -- the Pi SDK itself

### Quick links

**Coding agent:**

- <https://github.com/badlogic/pi-mono/raw/refs/heads/main/packages/coding-agent/README.md> -- coding agent docs
- <https://github.com/badlogic/pi-mono/raw/refs/heads/main/packages/coding-agent/examples/README.md> -- coding agent examples
- <https://github.com/badlogic/pi-mono/raw/refs/heads/main/packages/coding-agent/examples/rpc-extension-ui.ts> -- RPC extension UI example

**Web UI:**

- <https://github.com/badlogic/pi-mono/raw/refs/heads/main/packages/web-ui/README.md> -- web UI docs
- <https://github.com/badlogic/pi-mono/raw/refs/heads/main/packages/web-ui/example/README.md> -- web UI example

## Pi SDK extensions

- <https://github.com/can1357/oh-my-pi> -- Pi coding agent (The Firm builds on Pi)

### Quick links

**Pi docs:**

- <https://github.com/can1357/oh-my-pi/tree/main/docs> -- Pi documentation
- <https://github.com/can1357/oh-my-pi/tree/main/packages/swarm-extension> -- swarm extension

**GSD-2 docs:**

- <https://github.com/gsd-build/gsd-2/tree/main/docs> -- GSD-2 documentation
- <https://github.com/gsd-build/gsd-2> -- GSD (inspiration only, not a foundation)
- <https://github.com/gsd-build/get-shit-done> -- GSD predecessor (original GSD, precursor to gsd-2)

### Quick links

- <https://github.com/gsd-build/get-shit-done> -- original GSD (predecessor of gsd-2)

## Community resources

- <https://github.com/disler/pi-vs-claude-code> -- Pi vs Claude Code examples (fallback when official docs are insufficient)

## Own resources (digi4care)

Digi4Care repositories relevant to The Firm.

- <https://github.com/digi4care/Understand-Anything> -- codebase analysis via knowledge graph (inspiration for agent onboarding + impact analysis)
- <https://github.com/digi4care/agent-manifest> -- standard schema for agent capabilities (potentially usable for agent discovery + task routing)

## Comparable approaches

Projects that attempt to solve a comparable problem, but in The Firm's view do not go far enough in domain nuance and organizational structure.

- <https://github.com/bmad-code-org/BMAD-METHOD> -- AI-driven development methodology with agent roles
- <https://github.com/github/spec-kit> -- GitHub's spec-driven development toolkit
- <https://github.com/mastra-ai/mastra> -- TypeScript AI agent framework
- <https://github.com/AndyMik90/Aperant> -- autonomous multi-agent coding framework (formerly Auto Claude)


## Pi SDK vs Mastra

| | **Pi SDK** (30.8K stars) | **Mastra** (22.6K stars) |
|---|---|---|
| **What** | Coding agent + agent toolkit (CLI, TUI, Web UI) | AI application framework (agents, workflows, RAG, memory) |
| **Goal** | Agent that writes code in your terminal | Framework for building AI-powered applications |
| **Type** | End-user tool + SDK | Developer framework (npm package) |
| **Runtime** | Terminal/CLI, local | Node.js server, Next.js, standalone |
| **Agent model** | Coding agent with tool calling | Graph-based workflows + autonomous agents |
| **License** | MIT | Apache 2.0 (+ Enterprise) |

**Why Pi SDK for The Firm**: The Firm builds process around a coding agent, not an AI application. Pi is the executor, The Firm is the governance. Mastra would be relevant if The Firm were building a product -- but The Firm builds organizational structure.

## Workflow tooling

- <https://github.com/gastownhall/beads> -- issue tracking + Git integration

## Relationship diagram

```
```
Pi SDK (pi-mono)
  ├── Pi (oh-my-pi)       ← The Firm builds on Pi
  │     └── The Firm        ← extends + overrides Pi
  └── GSD (gsd-2)           ← inspiration only, not a foundation
      └── get-shit-done     ← predecessor of gsd-2
```
```

## Summary

| Repository | Role | Relationship |
|------------|-----|---------|
| pi-mono | Platform | Base SDK |
| oh-my-pi | Pi agent | Direct foundation |
| gsd-2 | Workflow | Inspiration |
| get-shit-done | Workflow | Predecessor of gsd-2 |
| beads | Issue tracking | Planned integration |
| pi-vs-claude-code | Community | Fallback examples |
| Understand-Anything | Own | Inspiration for codebase analysis |
| Aperant (Auto Claude) | Competition | Autonomous multi-agent orchestration (Claude Code) |
| agent-manifest | Own | Agent capability schema |

---
*Last updated: 2026-04-03*
*Version: 0.1.0*
