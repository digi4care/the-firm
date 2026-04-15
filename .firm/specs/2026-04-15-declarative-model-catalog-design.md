# Declarative Model Catalog Design

**Date:** 2026-04-15
**Status:** Draft
**Issue:** the-firm-xus
**Packages:** `the-firm-catalog`, `the-firm-ai`

## Problem

Model metadata (costs, sampling capabilities, rate limits, context windows) is hardcoded in `packages/ai/src/models.generated.ts`. This creates multiple issues:

1. **Unsupported parameter errors** — sampling params like `temperature` are blindly forwarded to all models. OpenAI reasoning models (o-series, codex) reject `temperature`, causing `Error: Unsupported parameter: temperature`.
2. **Stale data** — costs change weekly, new models appear daily. A generated TypeScript file in the repo can't keep up.
3. **No community contribution** — correcting a cost or capability requires cloning the entire Firm monorepo and editing a generated file.
4. **No subscription awareness** — providers have tiers (OpenAI Free/Plus/Pro) with different rate limits. The Firm doesn't know about them.
5. **No rate limiting** — The Firm sends requests without any awareness of per-model or per-subscription limits.

## Vision

Replace the hardcoded model registry with a **declarative, community-driven YAML catalog** published as a separate npm package and consumed only by `@digi4care/the-firm-ai`.

```
digi4care/the-firm-catalog    ← pure data (YAML → JSON), community PRs
        ↓ npm dependency
@digi4care/the-firm-ai        ← consumes catalog, builds Model objects
        ↓
@digi4care/the-firm-agent     ← uses AI package, no catalog knowledge
        ↓
@digi4care/the-firm           ← TUI/CLI, no catalog knowledge
```

**Key principles:**

- **Zero cognitive debt for users** — catalog ships as npm dependency, updates come with normal The Firm updates. No `firm catalog update`, no startup hints, no extra commands.
- **Community-driven** — separate repo, simple YAML files, easy PRs.
- **Small kernel** — catalog dependency stops at `the-firm-ai`. No other package knows it exists.
- **Offline-first** — catalog is bundled in the npm package. Always works.

## Repository: `digi4care/the-firm-catalog`

### Structure

```
the-firm-catalog/
  package.json              ← @digi4care/the-firm-catalog
  schema/
    provider.schema.json    ← JSON schema for validation
    models.schema.json
  src/
    providers/
      openai-codex/
        provider.yaml       ← provider-level config
        models.yaml         ← all models, compact
      openai/
        provider.yaml
        models.yaml
      anthropic/
        provider.yaml
        models.yaml
      google/
        provider.yaml
        models.yaml
      google-gemini-cli/
        provider.yaml
        models.yaml
      google-vertex/
        provider.yaml
        models.yaml
      amazon-bedrock/
        provider.yaml
        models.yaml
      mistral/
        provider.yaml
        models.yaml
      ...
    build.ts                ← YAML → JSON compiler
  dist/
    providers/              ← compiled JSON (shipped in npm package)
    index.js                ← exports catalog data
  CONTRIBUTING.md           ← community guide
  LICENSE
```

### Why one `models.yaml` per provider (not per model)

| | Per-model file | One models.yaml |
|---|---|---|
| Add new model | create new file | add a line |
| Update 20 model costs | edit 20 files | edit 20 lines in 1 file |
| Provider-wide change | open every file | change `defaults` section |
| Total files (all providers) | ~200+ | ~20 |

### Sentinel value convention

Three states for any value:

| Value | Meaning | Behavior |
|-------|---------|----------|
| Specific value / `true` | Known and supported | Use it |
| `false` / `0` | Known and NOT supported | Strip it |
| `-1` | Unknown | Forward to provider, let it decide |

This enables partial data contributions without requiring complete knowledge.

### YAML Schema

#### `provider.yaml`

```yaml
# Unique provider identifier matching existing KnownProvider type
id: openai-codex

# Human-readable name
name: OpenAI Codex

# API type matching existing KnownApi type
api: openai-codex-responses

# Default base URL
base_url: https://api.openai.com

# Default sampling capabilities for all models under this provider
# Models override these when they deviate
sampling:
  temperature: true
  top_p: true
  top_k: false
  min_p: false
  presence_penalty: false
  repetition_penalty: false

# Subscription tiers with rate limits
# -1 for unknown values
subscriptions:
  free:
    rate_limits:
      requests_per_minute: 5
      tokens_per_minute: 10000
  plus:
    rate_limits:
      requests_per_minute: 30
      tokens_per_minute: 100000
  pro:
    rate_limits:
      requests_per_minute: 100
      tokens_per_minute: 500000
```

#### `models.yaml`

```yaml
# Defaults applied to all models unless overridden
defaults:
  reasoning: false
  input: [text]
  context_window: 128000
  max_tokens: 16384
  cost:
    input: -1         # unknown
    output: -1
    cache_read: -1
    cache_write: -1

# All models for this provider
# Only properties that differ from defaults need to be specified
models:
  gpt-5.4:
    name: GPT 5.4
    input: [text, image]
    reasoning: true
    context_window: 200000
    max_tokens: 100000
    cost:
      input: 2.50
      output: 10.00
      cache_read: 1.25

  gpt-5.4-mini:
    name: GPT 5.4 Mini
    input: [text, image]
    context_window: 128000
    max_tokens: 16384
    cost:
      input: 0.15
      output: 0.60
      cache_read: 0.075

  gpt-5.3-codex:
    name: GPT 5.3 Codex
    reasoning: true
    input: [text, image]
    context_window: 200000
    max_tokens: 100000
    # Override provider sampling: reasoning models reject temperature/top_p
    sampling:
      temperature: false
      top_p: false
    cost:
      input: 5.00
      output: 20.00
      cache_read: 2.50
    # Override subscription rate limits for this specific model
    subscriptions:
      free:
        rate_limits:
          requests_per_minute: 3
      pro:
        rate_limits:
          requests_per_minute: 50

  gpt-5.4-nano:
    name: GPT 5.4 Nano
    cost:
      input: 0.05
      output: 0.20
    # Everything else inherits from defaults

  some-new-model:
    name: Some New Model
    # Partial data — community still researching
    cost:
      input: -1
      output: -1
    context_window: -1
    sampling:
      temperature: -1   # unknown, forward and let provider decide
```

### Layered resolution

When The Firm resolves a model's effective configuration, it merges in this order (later wins):

```
1. Built-in hardcoded fallback   (models.generated.ts — the absolute minimum)
2. Provider defaults              (provider.yaml defaults + sampling)
3. Model entry                    (models.yaml — inherits provider, overrides)
4. Model sampling override        (models.yaml sampling — inherits provider sampling)
5. Model subscription override    (models.yaml subscriptions — inherits provider subscriptions)
6. Runtime user override          (user settings — e.g. custom temperature)
```

## Package: `@digi4care/the-firm-catalog`

### API

```typescript
// The catalog package exports pure data, no I/O

export interface CatalogProvider {
  id: string;
  name: string;
  api: string;
  base_url: string;
  sampling: ResolvedSampling;
  subscriptions: Record<string, SubscriptionTier>;
}

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  reasoning: boolean;
  input: ("text" | "image")[];
  context_window: number;
  max_tokens: number;
  cost: ModelCost;
  sampling?: Partial<ResolvedSampling>;
  subscriptions?: Record<string, SubscriptionTier>;
}

export interface ResolvedSampling {
  temperature: boolean | -1;
  top_p: boolean | -1;
  top_k: boolean | -1;
  min_p: boolean | -1;
  presence_penalty: boolean | -1;
  repetition_penalty: boolean | -1;
}

export interface SubscriptionTier {
  rate_limits: {
    requests_per_minute: number | -1;
    tokens_per_minute: number | -1;
  };
}

export interface ModelCost {
  input: number | -1;      // $/million tokens, -1 = unknown
  output: number | -1;
  cache_read: number | -1;
  cache_write: number | -1;
}

// Load entire catalog
export function loadCatalog(): Map<string, CatalogProvider>;

// Load models for a provider
export function loadModels(providerId: string): Map<string, CatalogModel>;

// Resolve effective model config (merges provider + model layers)
export function resolveModel(providerId: string, modelId: string): ResolvedModel;
```

### Build pipeline

```
YAML files → build.ts (validation + merge) → dist/ JSON → npm package
```

- `npm run build` — validates all YAML against schemas, compiles to JSON
- CI validates on PR
- npm publish from CI on merge to main

## Package: `@digi4care/the-firm-ai` changes

### What changes

1. **New dependency:** `@digi4care/the-firm-catalog`
2. **`models.generated.ts`** becomes a **fallback**, not the primary source. When catalog has data, catalog wins. When catalog is missing a model, fallback to generated.
3. **`sampling-capabilities.ts`** (just built) evolves to use catalog data instead of hardcoded `API_SAMPLING_CAPABILITIES`.
4. **New: rate limiter** — uses catalog subscription data to throttle requests.

### What does NOT change

- `Model<TApi>` interface — stays the same, catalog data maps into it
- Provider stream functions — they receive `StreamOptions` as before, just with filtered params
- Agent, coding-agent, TUI — no changes, they don't know catalog exists

### Integration point

```typescript
// packages/ai/src/catalog-adapter.ts (new file)
import { loadCatalog, resolveModel } from "@digi4care/the-firm-catalog";
import type { Model, Api } from "./types.js";

/**
 * Build the model registry from catalog data.
 * Falls back to models.generated.ts for models not in catalog.
 */
export function buildModelRegistry(): Map<string, Map<string, Model<Api>>> {
  const catalog = loadCatalog();
  const registry = new Map<string, Map<string, Model<Api>>>();

  // ... merge catalog models with generated fallback

  return registry;
}
```

### Rate limiter (new)

```typescript
// packages/ai/src/rate-limiter.ts (new file)
export class RateLimiter {
  constructor(
    private limits: { requests_per_minute: number; tokens_per_minute: number },
  ) {}

  async acquire(estimatedTokens: number): Promise<void> {
    // Token bucket algorithm
    // -1 limits = no limiting (unknown)
  }
}
```

## Migration path

### Phase 1: Catalog foundation (this PR)
- [x] Create `sampling-capabilities.ts` with hardcoded API capabilities
- [ ] Create `digi4care/the-firm-catalog` repo
- [ ] Define YAML schemas
- [ ] Migrate OpenAI-codex provider data as proof of concept
- [ ] Add `catalog-adapter.ts` to `the-firm-ai`
- [ ] Wire `buildBaseOptions` to catalog-resolved capabilities
- [ ] Tests

### Phase 2: Full migration
- [ ] Migrate all providers from `models.generated.ts` to YAML
- [ ] Implement rate limiter
- [ ] Subscription tier detection (per-provider API key → tier mapping)
- [ ] Remove `models.generated.ts` as primary source

### Phase 3: Community tooling
- [ ] AI research skill to auto-populate new model entries
- [ ] CI validation on catalog repo
- [ ] CONTRIBUTING.md with examples
- [ ] Automated cost scraping where provider APIs expose it

## Open questions

1. **Subscription detection** — how does The Firm know which tier the user's API key belongs to? Options: user setting, API key prefix detection, provider-specific endpoints. Needs research per provider.
2. **Cost calculation with -1** — when cost is unknown, we can't calculate usage cost. Options: show "unknown", show $0, skip cost line entirely.
3. **Custom models** — users with custom base URLs (Ollama, local models) won't be in the catalog. The fallback mechanism handles this, but needs documentation.
