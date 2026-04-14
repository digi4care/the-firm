# Image Provider Port Design

Date: 2026-04-13
Issue: `the-firm-7vj.8.6`
Reference repo: `https://github.com/can1357/oh-my-pi`
Worktree: `/home/digi4care/projects/the-firm/.worktrees/the-firm-7vj.8`

## Decision summary
Use oh-my-pi as the implementation reference, but do not copy the public settings shape blindly.

### Recommendation
- Port the upstream image-generation tool implementation and provider preference logic as the technical baseline.
- Do **not** expose the setting as `providers.image` in the Providers tab.
- Expose it in The Firm as `image.provider` in the `tools` tab.
- Treat it as an image-generation tool backend preference, not as a primary LLM/provider transport setting.

## What upstream actually does
The upstream `Image Provider` setting is not a generic image toggle. It is tied to a real image-generation tool.

Relevant upstream evidence:
- `packages/coding-agent/src/config/settings-schema.ts:1628-1638`
  - setting key `providers.image`
  - values: `auto | gemini | openrouter`
- `packages/coding-agent/src/modes/controllers/selector-controller.ts:367-371`
  - live updates call `setPreferredImageProvider(...)`
- `packages/coding-agent/src/sdk.ts:678-680`
  - runtime seeds the preference from settings at startup
- `packages/coding-agent/src/tools/gemini-image.ts`
  - real image-generation tool implementation
  - internal preference state via `preferredImageProvider`
  - real provider selection logic in `findImageApiKey(...)`
  - actual tool exported as `generate_image`

### Important upstream nuance
Internally upstream supports these image backends:
- `antigravity`
- `gemini`
- `openrouter`

But the public setting only exposes:
- `auto`
- `gemini`
- `openrouter`

That means upstream already treats one provider (`antigravity`) as an internal fallback in auto mode rather than a stable public preference value.

## What The Firm currently has
Current The Firm image-related settings are about display and request safety, not generation backend routing.

Relevant code:
- `packages/coding-agent/src/features/settings/theme.ts`
  - `terminal.showImages`
  - `images.autoResize`
  - `images.blockImages`
- `packages/coding-agent/src/core/sdk.ts`
  - `images.blockImages` is enforced before provider-bound requests

What is missing on the current The Firm branch:
- no image-generation tool
- no image provider preference state
- no image-generation runtime port
- no `providers.image` or equivalent setting

So right now The Firm has **image display/input controls**, not an **image generation provider subsystem**.

## Why this should not live in Providers
The same reasoning as web search applies, maybe even more strongly.

This setting does not choose the main LLM provider.
It chooses the backend for a capability/tool: image generation.

So semantically it belongs with tools/capabilities.

### Best public shape for The Firm
- key: `image.provider`
- tab: `tools`
- label: `Image Provider`
- description: `Preferred backend for The Firm-owned image generation features`

That is more truthful than `providers.image`.

## Recommended technical approach

### 1. Port upstream image-generation tool logic
Use upstream `tools/gemini-image.ts` as the starting point.

Core pieces to port/adapt:
- provider preference state (`preferredImageProvider`)
- `setPreferredImageProvider(...)`
- provider/key resolution logic (`findImageApiKey(...)`)
- actual tool definition (`generate_image`)
- provider-specific execution branches

### 2. Preserve upstream provider behavior where possible
Publicly exposed values should remain:
- `auto`
- `gemini`
- `openrouter`

Internal-only fallback/provider behavior can remain implementation detail, including any `antigravity` preference within auto mode if we port that branch.

### 3. Keep current image settings where they are
These should stay in `appearance` because they solve different problems:
- `terminal.showImages`
- `images.autoResize`
- `images.blockImages`

So the final split should be:
- `appearance` tab → how images are shown/sent
- `tools` tab → which backend generates images

## Exact design recommendation

### Public setting
- `image.provider`
- enum: `auto | gemini | openrouter`
- tab: `tools`
- submenu: yes

### Runtime state
Add a The Firm-owned image provider preference state, analogous to the new search provider port.
Likely location:
- `packages/coding-agent/src/core/image/provider.ts`
or, if we keep it tool-local initially:
- `packages/coding-agent/src/core/tools/image-provider.ts`

### Tool
Add a real built-in tool:
- `generate_image`

This is essential. Without a real tool, the setting would be dishonest.

### Startup + live update
Same pattern as search:
- seed preference in `core/sdk.ts`
- live update from `interactive-mode.ts`

## What should be ported vs adapted

### Reuse from upstream
- provider preference model
- provider/key resolution logic
- the actual image tool execution flow
- the hidden/internal `antigravity` fallback behavior if feasible

### Adapt for The Firm
- setting key and tab placement
- imports and local runtime architecture
- credential access via The Firm auth/model registry paths
- keep our existing image display/blocking settings separate

## Why not implement only the setting
Because then we would repeat the exact problem we rejected for web search:
- UI claims a capability exists
- runtime does not actually route a tool/backend with it

So if we implement this, we should implement both:
- `image.provider`
- a real The Firm-owned `generate_image` tool

## Final recommendation
Yes, this should likely be implemented.
But not as a Providers-tab copy.

The correct The Firm version is:
- port upstream image-generation tool capability
- expose the preference as `image.provider` in `tools`
- keep existing appearance/image safety settings where they already are

That gives us:
- upstream technical reuse
- semantically clean The Firm UX
- no fake settings row
