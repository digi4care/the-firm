# 08 - Integration Points

> **Overview:** How The Firm integrates with external systems.

---

## 1. Upstream Pi (badlogic/pi-mono)

The Firm is a product fork. The relationship is:

```
badlogic/pi-mono (upstream)
        │
        │  git fetch + merge
        ▼
digi4care/the-firm (fork)
        │
        │  own features, own SDK, own CLI
        ▼
npm: @digi4care/the-firm
CLI: firm / firm-dev
```

**Sync strategy:**
- Daily upstream watch via `npm run upstream:watch`
- Intentional merge, not automatic
- Track baseline and adoption in `docs/upstream/`
- Keep divergence minimal and documented

**Reference:** [`docs/upstream/BASELINE.md`](../upstream/BASELINE.md), [`docs/upstream/ADOPTION-LOG.md`](../upstream/ADOPTION-LOG.md)

---

## 2. Archon Workflows

The Firm maintains **backwards compatibility** with Archon workflow definitions.

**What this means:**
- Archon YAML workflows work directly in The Firm
- The Firm adds extra layers on top (context profiles, model policy, templates)
- Community Archon workflows are importable via `firm workflow import <name>`

**Compatibility boundary:**

| Archon concept | The Firm equivalent |
|---------------|-------------------|
| Workflow YAML | Same YAML + The Firm extensions |
| Commands (prompt templates) | Templates (Markdown) |
| Artifacts | ContextProfiles + artifacts |
| Approval nodes | Same + The Firm governance layer |
| DAG execution | Same, via The Firm SDK |
| Worktree isolation | Same |

---

## 3. GitHub / GitLab

Used by `firm extract` for pulling context from repositories.

```bash
firm extract --from github.com/vercel/next.js
firm extract --from github.com/org/repo --focus packages/core
firm extract --from gitlab.com/org/project
```

**Mechanism:** Shallow clone to `.tmp/`, AI analyzes, result in `.firm/context/`.

---

## 4. Model Providers

The Firm uses Pi's provider system but adds its own model policy layer.

**Model reference format:** `[provider]/[model]`

| Provider | Example models |
|----------|---------------|
| `anthropic` | `anthropic/claude-opus`, `anthropic/claude-sonnet` |
| `openai` | `openai/gpt-4o`, `openai/gpt-4o-mini` |
| `google` | `google/gemini-2.5-pro` |
| `ollama` | `ollama/llama3` |
| `openrouter` | `openrouter/anthropic/claude-opus` |

Roles alias to provider/model pairs with fallback chains:

```json
{
  "creative": { "preferred": "anthropic/claude-opus", "fallback": ["anthropic/claude-sonnet"] }
}
```

---

## 5. Pi Extension Ecosystem

The Firm is compatible with Pi extensions that use the SDK:

- Extensions using `registerCommand()`, `registerTool()`, `pi.on()` work on The Firm
- The Firm extends the contract with its own SDK additions
- Existing Pi skills work unchanged

---

## 6. Beads (Issue Tracker)

Dolt-backed issue tracker for The Firm development:

```bash
bd ready        # find unblocked work
bd create       # create issues
bd update       # claim, add notes
bd close        # complete with reason
```

**Reference:** Beads is the canonical issue tracker for The Firm development.
