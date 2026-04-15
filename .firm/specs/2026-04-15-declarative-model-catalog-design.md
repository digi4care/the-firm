# Declarative Model Catalog Design

**Date:** 2026-04-15
**Status:** Active
**Issues:** the-firm-xus, the-firm-9vl, the-firm-9ud
**Packages:** `the-firm-catalog`, `the-firm-ai`

## Status

| Phase | Status | Issue |
|-------|--------|-------|
| 1. Catalog foundation | Done | the-firm-9vl |
| Provider migration (827 models) | Done | the-firm-9ud |
| Lazy loading | Next | -- |
| Rate limiter + subscriptions | Planned | -- |
| Community tooling | Planned | -- |

## Problem

Model metadata (costs, sampling capabilities, rate limits, context windows) is hardcoded in `packages/ai/src/models.generated.ts`. This creates multiple issues:

1. **Unsupported parameter errors** -- sampling params like `temperature` are blindly forwarded to all models. OpenAI reasoning models (o-series, codex) reject `temperature`, causing `Error: Unsupported parameter: temperature`.
2. **Stale data** -- costs change weekly, new models appear daily. A generated TypeScript file in the repo cannot keep up.
3. **No community contribution** -- correcting a cost or capability requires cloning the entire Firm monorepo and editing a generated file.
4. **No subscription awareness** -- providers have tiers (OpenAI Free/Plus/Pro) with different rate limits. The Firm does not know about them.
5. **No rate limiting** -- The Firm sends requests without any awareness of per-model or per-subscription limits.
6. **Eager loading** -- all 827 models loaded into memory at import time. Typical session uses 1 model.

## Vision

Replace the hardcoded model registry with a **declarative, community-driven YAML catalog** published as a separate npm package and consumed only by `@digi4care/the-firm-ai`.

```
digi4care/the-firm-catalog    <- pure data (YAML -> JSON), community PRs
        | npm dependency
@digi4care/the-firm-ai        <- consumes catalog, builds Model objects
        |
@digi4care/the-firm-agent     <- uses AI package, no catalog knowledge
        |
@digi4care/the-firm           <- TUI/CLI, no catalog knowledge
```

**Key principles:**

- **Zero cognitive debt for users** -- catalog ships as npm dependency, updates come with normal The Firm updates. No `firm catalog update`, no startup hints, no extra commands.
- **Community-driven** -- separate repo, simple YAML files, easy PRs.
- **Small kernel** -- catalog dependency stops at `the-firm-ai`. No other package knows it exists.
- **Offline-first** -- catalog is bundled in the npm package. Always works.
- **Lazy by default** -- only load the model data you actually use, not all 827.

## Repository: `digi4care/the-firm-catalog`

### Structure

```
the-firm-catalog/
  package.json              <- @digi4care/the-firm-catalog
  schema/
    provider.schema.json    <- JSON schema for validation
    models.schema.json
  src/
    providers/
      openai-codex/
        provider.yaml       <- provider-level config
        models.yaml         <- all models, compact
      openai/
        provider.yaml
        models.yaml
      anthropic/
        provider.yaml
        models.yaml
      ...                   <- 23 providers total
    build.ts                <- YAML -> JSON compiler
    catalog.ts              <- resolveModel() merge logic
    loader.ts               <- YAML file reader
    generate-from-ts.ts     <- Model -> YAML converter
    migrate-from-generated.ts <- one-time migration script
    types.ts                <- CatalogProvider, CatalogModel, ResolvedModel, etc.
  dist/
    index.json              <- Tier 1: provider index (lightweight)
    providers/              <- Tier 2+3: compiled JSON (shipped in npm package)
      openai-codex.json
      anthropic.json
      ...                   <- 23 JSON files
  CONTRIBUTING.md           <- community guide
  LICENSE
```

### Why one `models.yaml` per provider (not per model)

| | Per-model file | One models.yaml |
|---|---|---|
| Add new model | create new file | add a line |
| Update 20 model costs | edit 20 files | edit 20 lines in 1 file |
| Provider-wide change | open every file | change `defaults` section |
| Total files (all providers) | ~200+ | ~46 |

### Sentinel value convention

Three states for any value:

| Value | Meaning | Behavior |
|-------|---------|----------|
| Specific value / `true` | Known and supported | Use it |
| `false` / `0` | Known and NOT supported | Strip it |
| `-1` | Unknown | Forward to provider, let it decide |

This enables partial data contributions without requiring complete knowledge.

### Layered resolution

When The Firm resolves a model's effective configuration, it merges in this order (later wins):

```
1. Built-in hardcoded fallback   (models.generated.ts -- the absolute minimum)
2. Provider defaults              (provider.yaml defaults + sampling)
3. Model entry                    (models.yaml -- inherits provider, overrides)
4. Model sampling override        (models.yaml sampling -- inherits provider sampling)
5. Model subscription override    (models.yaml subscriptions -- inherits provider subscriptions)
6. Runtime user override          (user settings -- e.g. custom temperature)
```

## Lazy Loading

### Problem

The current implementation loads all 827 models into memory at import time via `mergeCatalogWithGenerated()`. A typical session uses 1 model. Load only what you use.

### Design

No tiers, no indices, no LRU caches. One simple rule:

**`getModel(provider, modelId)` loads one JSON file, resolves one model, done.**

```
Startup:   nothing loaded
getModel("openai-codex", "gpt-5.4")
  → read dist/providers/openai-codex.json   (~50KB for the whole provider)
  → find gpt-5.4 in the models array
  → return Model<TApi>
  → cache this provider for the session
```

### Consumer: `models.ts`

```typescript
// Current (eager — loads 827 models at import):
const modelRegistry = mergeCatalogWithGenerated();

// Target (lazy — loads nothing until getModel is called):
function getModel(provider, modelId) {
  // 1. Check cached provider data (already loaded this session?)
  // 2. If not, read dist/providers/<provider>.json (one file)
  // 3. Find model by id, return Model<TApi>
  // 4. Cache the provider data for subsequent calls
}
```

### Fallback

Custom models (Ollama, local) are never in the catalog:

1. `getModel("ollama", "llama3")` → catalog has no ollama provider
2. Fall back to `models.generated.ts` → not found
3. Return minimal Model with `-1` costs and unknown capabilities

### Caching

- Per-provider JSON: loaded once, cached for session lifetime
- `models.generated.ts`: loaded only if catalog doesn't cover a provider
- No startup cost — nothing happens until a model is actually needed

## Package: `@digi4care/the-firm-catalog`

### API

```typescript
// Load provider index (Tier 1 -- lightweight)
export function loadProviderIndex(): Map<string, { api: string; base_url: string }>;

// Load models for a single provider (Tier 2+3)
export function loadProviderModels(providerId: string): ResolvedModel[];

// Resolve effective model config (merges provider + model layers)
export function resolveModel(providerId: string, modelId: string): ResolvedModel;
```

### Build pipeline

```
YAML files -> build.ts (validation + merge) -> dist/ JSON -> npm package
```

- `npm run build` -- validates all YAML against schemas, compiles to JSON
- CI validates on PR
- npm publish from CI on merge to main

## Package: `@digi4care/the-firm-ai` changes

### What changes

1. **New dependency:** `@digi4care/the-firm-catalog`
2. **`models.generated.ts`** becomes a **fallback**, not the primary source. When catalog has data, catalog wins. When catalog is missing a model, fallback to generated.
3. **`sampling-capabilities.ts`** evolves to use catalog data instead of hardcoded `API_SAMPLING_CAPABILITIES`.
4. **New: rate limiter** -- uses catalog subscription data to throttle requests.
5. **`models.ts`** switches from eager registry to lazy `getModel()`.

### What does NOT change

- `Model<TApi>` interface -- stays the same, catalog data maps into it
- Provider stream functions -- they receive `StreamOptions` as before, just with filtered params
- Agent, coding-agent, TUI -- no changes, they do not know catalog exists

### Integration point

```typescript
// packages/ai/src/catalog-adapter.ts
// Lazy loads provider data on demand, caches per-provider
export function resolveModelFromCatalog(providerId: string, modelId: string): Model<Api> | undefined;
```

## Migration path

### Phase 1: Catalog foundation (done)
- [x] Create `sampling-capabilities.ts` with hardcoded API capabilities
- [x] Create `digi4care/the-firm-catalog` repo
- [x] Define YAML schemas
- [x] Migrate OpenAI-codex provider data as proof of concept
- [x] Add `catalog-adapter.ts` to `the-firm-ai`
- [x] Wire `buildBaseOptions` to catalog-resolved capabilities
- [x] Tests (29 tests, all passing)

### Phase 1b: Provider migration (done)
- [x] Migrate all 22 providers (827 models) from `models.generated.ts` to YAML
- [x] Migration script (`migrate-from-generated.ts`)
- [x] Generator with defaults computation (`generate-from-ts.ts`)
- [x] Build validates all providers (23 providers, 827 models)
- [x] Tests (19 tests, all passing)

### Phase 2: Lazy loading (next)
- [ ] Add `dist/index.json` (provider index) to catalog build
- [ ] Refactor `catalog-adapter.ts` for per-provider lazy loading
- [ ] Refactor `models.ts` to use lazy `getModel()` instead of eager registry
- [ ] LRU cache for provider data (max 10 providers)
- [ ] Remove `mergeCatalogWithGenerated()` (eager loading)
- [ ] Tests

### Phase 3: Rate limiting + subscriptions (planned)
- [ ] Implement rate limiter (token bucket)
- [ ] Subscription tier detection (per-provider API key to tier mapping)
- [ ] Wire rate limiter into agent loop
- [ ] Remove `models.generated.ts` as primary source

### Phase 4: Community tooling (planned)
- [ ] AI research skill to auto-populate new model entries
- [ ] CI validation on catalog repo
- [ ] CONTRIBUTING.md with examples
- [ ] Automated cost scraping where provider APIs expose it

## Open questions

1. **Subscription detection** -- how does The Firm know which tier the user's API key belongs to? Options: user setting, API key prefix detection, provider-specific endpoints. Needs research per provider.
2. **Cost calculation with -1** -- when cost is unknown, we cannot calculate usage cost. Options: show "unknown", show $0, skip cost line entirely.
3. **Custom models** -- users with custom base URLs (Ollama, local models) will not be in the catalog. The fallback mechanism handles this, but needs documentation.
