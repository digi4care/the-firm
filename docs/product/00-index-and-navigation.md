# The Firm — Documentation Index

> **Product:** The Firm — Pi-native governed AI work foundation  
> **Repository:** digi4care/the-firm  
> **Last Updated:** 2026-04-12

---

## Quick Start

> **Canonical documents**
> - Vision: [`pd-the-firm.md`](pd-the-firm.md)
> - Requirements: [`prd-the-firm.md`](prd-the-firm.md)
> - Current implementation status: [`07-current-state-brownfield-assessment.md`](07-current-state-brownfield-assessment.md)
> - Terminology: [`99-glossary-terminology.md`](99-glossary-terminology.md)

| If you want to... | Read... |
|-------------------|---------|
| Understand what The Firm is | [`pd-the-firm.md`](pd-the-firm.md) |
| See the requirements | [`prd-the-firm.md`](prd-the-firm.md) |
| Understand the architecture | [`02-architecture-three-layer-model.md`](02-architecture-three-layer-model.md) *(file name retained for continuity; content describes four layers)* |
| See the `.firm/` structure | [`04-knowledge-base-directory-structure.md`](04-knowledge-base-directory-structure.md) |
| Learn context operations | [`11-context-operations.md`](11-context-operations.md) |
| See the roadmap | [`10-vision-and-evolution-roadmap.md`](10-vision-and-evolution-roadmap.md) |
| Look up terminology | [`99-glossary-terminology.md`](99-glossary-terminology.md) |

---

## Documentation Overview

### 1. Product Definition
- **PD** [Product Description](pd-the-firm.md) — What The Firm is and why *(canonical vision source)*
- **PRD** [Product Requirements Document](prd-the-firm.md) — How The Firm works, functional requirements, resolved design decisions *(canonical requirements source)*

### 2. Architecture & Structure
- **02** [Architecture](02-architecture-three-layer-model.md) — Layered model and component boundaries *(four-layer overview; file name retained for continuity)*
- **04** [Directory Structure](04-knowledge-base-directory-structure.md) — `.firm/` layout and naming conventions

### 3. Capabilities
- **05** [Governance & Engagement](05-governance-engagement-flow.md) — How work flows through The Firm
- **11** [Context Operations](11-context-operations.md) — CLI and in-session commands for context management

### 4. Implementation & Integration
- **06** [Technical Stack](06-technical-stack-and-dependencies.md) — Stack, SDK, dependencies
- **07** [Current State](07-current-state-brownfield-assessment.md) — What exists now vs what's planned
- **08** [Integration Points](08-integration-points-omp-and-cli.md) — Pi, Archon, and external integrations

### 5. Direction & Reference
- **09** [Use Cases](09-use-cases-and-target-users.md) — Target users and scenarios
- **10** [Roadmap](10-vision-and-evolution-roadmap.md) — Redirect to the PRD roadmap summary
- **99** [Glossary](99-glossary-terminology.md) — Terminology and definitions *(canonical terminology source)*

---

## Core Design Principles

1. **Pi-native** — Built on Pi as runtime, The Firm SDK as contract
2. **Archon-compatible** — Backwards compatible with Archon workflows
3. **Opiniated defaults, fully overridable** — Best practices out of the box
4. **Governance first** — Context, protocols, memory, model policy as differentiators
5. **MVI compliance** — <200 lines per file, <30s scannable
6. **Entropy → structure** — Raw input becomes governed, repeatable output

---

## .firm/ Directory

```
.firm/
├── agents/          ← all agent definitions
├── commands/        ← all slash commands
├── templates/       ← all communication templates
├── context/         ← all structured context
├── workflows/       ← all workflow YAMLs (Archon-compatible)
├── memory/          ← all durable knowledge
└── config/          ← project config (model policy, etc.)
```
