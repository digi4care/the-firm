# oh-my-pi Provider Settings Research

Date: 2026-04-13
Source repo: `https://github.com/can1357/oh-my-pi`
Analysis method: repo-analysis skill workflow with shallow clone at `/tmp/oh-my-pi-research`

## Scope
Focused on the upstream `Providers` settings tab and these options:
- Hide Secrets
- Web Search Provider
- Image Provider
- Kimi API Format
- OpenAI WebSockets
- Parallel Fetch

## Primary upstream sources
- `packages/coding-agent/src/config/settings-schema.ts`
- `packages/coding-agent/src/modes/components/settings-defs.ts`
- `packages/coding-agent/src/sdk.ts`
- `packages/coding-agent/src/modes/controllers/selector-controller.ts`
- `packages/coding-agent/src/tools/fetch.ts`
- `packages/coding-agent/src/web/scrapers/youtube.ts`

## Upstream: exact provider-tab settings

### 1. Hide Secrets
- Key: `secrets.enabled`
- Type: boolean
- Default: `false`
- UI label: `Hide Secrets`
- Description: `Obfuscate secrets before sending to AI providers`
- Source: `settings-schema.ts:1595-1599`
- Use site: `sdk.ts:705-710`
- Meaning: upstream enables a secret obfuscator in the session pipeline before provider calls.

### 2. Web Search Provider
- Key: `providers.webSearch`
- Type: enum
- Default: `auto`
- Values: `auto`, `exa`, `brave`, `jina`, `kimi`, `zai`, `perplexity`, `anthropic`, `gemini`, `codex`, `tavily`, `kagi`, `synthetic`, `parallel`
- Source: `settings-schema.ts:1602-1627`
- UI option labels/descriptions: `settings-defs.ts:321-338`
- Use sites:
  - `sdk.ts:672-676`
  - `selector-controller.ts:362-366`
- Meaning: upstream stores a preferred search provider and wires it into runtime provider selection.

### 3. Image Provider
- Key: `providers.image`
- Type: enum
- Default: `auto`
- Values: `auto`, `gemini`, `openrouter`
- Source: `settings-schema.ts:1628-1638`
- UI option labels/descriptions: `settings-defs.ts:339-343`
- Use sites:
  - `sdk.ts:678-681`
  - `selector-controller.ts:367-370`
- Meaning: upstream has a provider preference for image generation, not image display.

### 4. Kimi API Format
- Key: `providers.kimiApiFormat`
- Type: enum
- Default: `anthropic`
- Values: `openai`, `anthropic`
- Source: `settings-schema.ts:1640-1650`
- UI option labels/descriptions: `settings-defs.ts:344-347`
- Use site: `sdk.ts:1518`
- Meaning: upstream exposes a runtime switch for the Kimi compatibility layer.

### 5. OpenAI WebSockets
- Key: `providers.openaiWebsockets`
- Type: enum
- Default: `auto`
- Values: `auto`, `off`, `on`
- Source: `settings-schema.ts:1652-1662`
- UI option labels/descriptions: `settings-defs.ts:348-351`
- Use sites:
  - `sdk.ts:1485-1519`
  - `command-controller.ts:334-336`
- Meaning: upstream has a Codex/OpenAI-specific websocket preference, distinct from a global transport setting.

### 6. Parallel Fetch
- Key: `providers.parallelFetch`
- Type: boolean
- Default: `true`
- Source: `settings-schema.ts:1664-1672`
- Use sites:
  - `tools/fetch.ts:556-560`
  - `web/scrapers/youtube.ts:114-118`
- Meaning: upstream can route URL extraction through Parallel when credentials are present.

## Current The Firm comparison

### Current settings-tab structure
Current The Firm tabs are:
- `appearance`
- `model`
- `interaction`
- `compaction`
- `editing`
- `tools`
- `tasks`

Source: `packages/coding-agent/src/features/settings/*.ts`

There is currently no dedicated `providers` tab.

### Current support by option

#### Hide Secrets
- Current status: absent as a user-facing setting
- The Firm has provider logging controls, but no equivalent `secrets.enabled` obfuscation toggle in the settings model
- Nearest existing setting is unrelated: `providerLogging.level`

#### Web Search Provider
- Current status: absent
- No current Settings API key like `providers.webSearch`
- No current runtime preference wiring like upstream `setPreferredSearchProvider(...)`

#### Image Provider
- Current status: absent
- The Firm does have image-related settings, but they are different:
  - `terminal.showImages`
  - `images.autoResize`
  - `images.blockImages`
- These control display and sending images to models, not choosing an image generation provider

#### Kimi API Format
- Current status: partially present in backend, not exposed in settings
- Backend capability exists:
  - `packages/ai/src/providers/kimi.ts` defines `KimiApiFormat = "openai" | "anthropic"`
- But current runtime hardcodes Anthropiс mode:
  - `packages/ai/src/stream.ts:292-297` passes `format: "anthropic"`
- This is the cleanest upstream provider option to adopt because the backend seam already exists.

#### OpenAI WebSockets
- Current status: partially adjacent, not provider-specific
- The Firm has a global interaction setting:
  - `transport` with `sse | websocket | auto`
  - Source: `packages/coding-agent/src/features/settings/interaction.ts:30-39`
- But this is broader than upstream’s Codex-specific websocket policy
- So upstream’s setting is not a direct duplicate; it is a more targeted override.

#### Parallel Fetch
- Current status: absent as a setting and absent as an exposed fetch capability
- The Firm currently only shows a partial auth-level trace of Parallel:
  - `packages/ai/src/utils/oauth/index.ts:86-87`
  - `packages/ai/src/utils/oauth/parallel.ts`
- No current The Firm fetch tool wiring uses Parallel extraction.

## Initial migration fit assessment

### Best fit to adopt first
1. `Kimi API Format`
- Reason: backend capability already exists in The Firm
- Change shape: mostly Settings API + runtime plumbing

2. `OpenAI WebSockets`
- Reason: concept already overlaps with existing `transport`
- Caveat: needs a product decision about precedence between global transport and provider-specific override

### Worth discussing, but not as direct carry-over
3. `Hide Secrets`
- Valuable, but broader than a provider-tab cosmetic option
- It changes pre-provider request shaping and should probably be treated as a privacy/safety capability, not merely a provider toggle

4. `Web Search Provider`
- Only makes sense if The Firm wants a first-class provider-selection layer for web search, not just a copy of upstream UI
- This is a larger product decision than a simple settings import

5. `Image Provider`
- Only relevant if The Firm plans a first-class image generation tool/provider abstraction
- Not the same as current image display/blocking settings

6. `Parallel Fetch`
- Only makes sense if The Firm adopts Parallel-backed extraction/fetch as a productized capability
- Not worth adding as a lonely toggle without the actual fetch pipeline behind it

## Recommended discussion order
1. Kimi API Format
2. OpenAI WebSockets
3. Hide Secrets
4. Web Search Provider
5. Parallel Fetch
6. Image Provider

## Notes
- Upstream groups these under `Providers`, but some are really transport, privacy, or tool-routing concerns rather than pure provider settings.
- If The Firm adopts them, it should probably do so intentionally instead of mirroring the upstream tab 1:1.
