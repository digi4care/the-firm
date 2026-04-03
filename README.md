# The Firm

Portable engineering operating system for AI-assisted software development.

## Why The Firm Exists

One developer, large projects, not enough expertise in every domain.

The Firm simulates what a professional software organization does: specialized roles, structured workflows, proper handoffs, QA gates. Each department owns its layer and stays out of the others.

## Who The Firm Is For

Developers who know their craft but don't have the expertise a full tech company would have.

You know what you're doing. You know roughly what to ask. What you lack is the depth in every domain -- security, database design, QA, compliance -- that a professional team would have. The Firm gives you that expertise as if you had a team around you. Not by doing it for you, but by asking the right questions and presenting the right options.

Not for vibe coders. Not for "build me something, I don't know what". For developers who know enough to know what they don't know.

## What The Firm Does

The Firm turns generic AI coding into a governable software organization. Work is issue-driven, role-specialized, and QA-gated—executed through a mechanical control plane rather than chat-driven improvisation.

Built on Beads (issue graph), Dolt (versioned truth), and Pi (execution runtime).

## Core Principles

- **Issue-first execution** — No work without a tracked issue
- **Versioned truth** — State lives in Dolt, not chat memory
- **Role specialization** — Product, Architecture, Engineering, QA, Workflow Ops each own their layer
- **Artifact-based handoffs** — Explicit outputs at phase boundaries
- **QA as a gate** — Independent verification blocks closure
- **Risk-tiered verification** — Match proof depth to risk
- **Parallelization by design** — Safe concurrent work through clear contracts
- **Portability** — Same doctrine, any repo

## What The Firm Is NOT

- Not a loose prompt library
- Not a generic task list
- Not a replacement for engineering judgment
- Not maximum testing for every trivial change


## Stack

- **Runtime:** bun
- **Issue graph:** Beads
- **Versioned truth:** Dolt
- **Execution:** Pi

## Why This Stack

Pi is a coding agent that writes code in your terminal (30K+ stars, MIT). The Firm extends Pi with organizational structure: departments, QA gates, handoffs, compliance.

The stack is deliberate: Pi is the executor and The Firm is the organization. Other frameworks like Mastra build AI applications -- The Firm builds process around an agent. Different layers, different goals.

## Quick Start

```bash
bun install        # Install dependencies
bun run dev        # Dev mode (syncs src/ to .pi/)
bun run prod       # Production sync (scripts/sync-prod.sh)
bun run lint       # Biome + markdownlint check
bun run lint:fix   # Auto-fix lint issues
bun run format     # Format all files
bun run update-deps # Update dependencies
```

## Project Structure

```
├── AGENTS.md             # Project rules (permanent truths)
├── src/                  # Source layer (synced to .pi/)
├── design/             # Design docs (vision, doctrine)
├── docs/                 # User documentation
├── scripts/              # Build/sync scripts
```

## License

MIT © Digi4Care