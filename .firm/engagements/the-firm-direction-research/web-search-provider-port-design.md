# Web Search Provider Port Design

Date: 2026-04-13
Issue: `the-firm-7vj.8.5`
Reference repo: `https://github.com/can1357/oh-my-pi`
Worktree: `/home/digi4care/projects/the-firm/.worktrees/the-firm-7vj.8`

## Decision summary
We should port the upstream web search subsystem as the implementation reference, but expose it in The Firm with a product-correct surface.

### Recommendation
- Port upstream `coding-agent/src/web/search/*` as the internal implementation baseline.
- Do **not** expose the setting as `providers.webSearch` in the Providers tab.
- Expose it as `search.provider` in the `tools` tab.
- Treat it as a The Firm-owned tool/capability routing setting, not as a model/provider transport setting.

## Why this is the right split

### Upstream reality
oh-my-pi already has a mature internal subsystem:
- `coding-agent/src/web/search/types.ts`
- `coding-agent/src/web/search/provider.ts`
- `coding-agent/src/web/search/index.ts`
- `coding-agent/src/web/search/providers/*`
- `coding-agent/src/sdk.ts` initializes provider preference from settings
- `coding-agent/src/modes/controllers/selector-controller.ts` updates it live

This is not just a settings row. It is a real routing layer plus concrete backends.

### The Firm semantics
In The Firm, this setting does not control the primary LLM provider. It controls which backend a search capability should prefer.
That makes it conceptually closer to:
- tool routing
- capability routing
- backend preference for search features

So in The Firm the most truthful public shape is:
- key: `search.provider`
- tab: `tools`
- label: `Web Search Provider`

## Proposed The Firm architecture

### Public setting
- `search.provider`
- tab: `tools`
- type: enum
- default: `auto`

### Internal subsystem
Port upstream internal structure with minimal divergence:
- `packages/coding-agent/src/core/search/types.ts`
- `packages/coding-agent/src/core/search/provider.ts`
- `packages/coding-agent/src/core/search/index.ts`
- `packages/coding-agent/src/core/search/providers/*`

Reason for `core/search` instead of `web/search`:
- The Firm currently uses `core/*` for runtime subsystems.
- This keeps the code discoverable next to other runtime policy layers.

If we want to reduce divergence from upstream even more, `core/search` can mirror upstream file names closely.

### State and routing
Implement the same basic model as upstream:
- `SearchProviderId`
- `isSearchProviderId(...)`
- `isSearchProviderPreference(...)`
- `preferredProvider = "auto"` mutable runtime preference
- `setPreferredSearchProvider(...)`
- `getSearchProvider(...)`
- `resolveProviderChain(...)`

### Live updates
Wire the setting like upstream, but through our architecture:
- settings key stored in SettingsManager: `search.provider`
- initial runtime preference seeded in `core/sdk.ts`
- interactive-mode setting changes update the preference live

Decision update (2026-04-13): we will implement the full upstream provider set for the The Firm web search port, not a reduced subset.

## Why not use `providers.webSearch`
Three reasons:
1. It misclassifies the feature as a model/provider transport setting.
2. The Firm already has a dedicated `tools` tab where capability toggles live.
3. We already moved truly provider-facing items into `Providers`:
   - `providerLogging.level`
   - `providers.kimiApiFormat`
   - `providers.openaiWebsockets`
   - `secrets.enabled`

Adding search there would blur the boundary we just made cleaner.

## Supported provider IDs
Use upstream provider IDs where we port real implementations.
Current upstream set:
- `exa`
- `brave`
- `jina`
- `kimi`
- `zai`
- `anthropic`
- `perplexity`
- `gemini`
- `codex`
- `tavily`
- `parallel`
- `kagi`
- `synthetic`

### Decision for The Firm v1
	Implement the full upstream-aligned provider set behind the The Firm setting surface.

	That means The Firm v1 should expose all upstream-backed providers once the port lands:
	- `exa`
	- `brave`
	- `jina`
	- `kimi`
	- `zai`
	- `anthropic`
	- `perplexity`
	- `gemini`
	- `codex`
	- `tavily`
	- `parallel`
	- `kagi`
	- `synthetic`

	We should not ship a reduced enum if the implementation task is explicitly a full upstream-based port.

## Best implementation path

### Phase 1 — port the core routing layer
Port from oh-my-pi:
- `types.ts`
- `provider.ts`
- `index.ts`
- the provider base abstraction
- at least one or two concrete providers to prove the system

### Phase 2 — add the setting in The Firm
In The Firm settings:
- key: `search.provider`
- tab: `tools`
- live update support in interactive mode

### Phase 3 — connect one real consumer
This is essential.
The setting should not be a dead row.
A consumer can be:
- a The Firm-owned search helper
- a testable internal command path
- a future research/extract capability that explicitly uses the search port

Without a consumer, the setting is technically present but functionally misleading.

## What to reuse from upstream vs what to change

### Reuse upstream mostly as-is
- provider ID types
- provider chain resolver logic
- provider base abstraction
- provider-specific implementations where feasible
- runtime preferred provider state model

### Change for The Firm
- setting key: `search.provider` instead of `providers.webSearch`
- tab placement: `tools` instead of `providers`
- folder placement under our runtime architecture
- documentation and descriptions to say "The Firm-owned web search features"

## Exact recommended user-facing wording
- Label: `Web Search Provider`
- Description: `Preferred backend for The Firm-owned web search features`

That is intentionally narrower and more truthful than upstream's generic `Provider for web search tool`.

## Final recommendation
Yes, we should use oh-my-pi as the reference and port the logic.
But we should not copy the public settings shape blindly.

Best final shape:
- Upstream implementation ideas and most of the subsystem: yes
- The Firm public setting surface: our own
  - `search.provider`
  - in `tools`

That gives us:
- minimal architectural reinvention
- good upstream alignment
- truthful The Firm semantics
- a clean base for future research/fetch/extract capabilities
