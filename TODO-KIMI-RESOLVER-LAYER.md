# TODO: Kimi Resolver Layer

## Status

Deferred analysis note.

The Firm currently models Kimi as fixed provider/model metadata rather than a provider-specific runtime switch. In contrast, `oh-my-pi` exposes a Kimi API format choice (`openai` vs `anthropic`) and wires that choice into runtime streaming.

This document captures the work needed if The Firm should gain the same capability later.

## Current State in The Firm

- Kimi models are bundled in generated model metadata.
- `kimi-coding` models currently resolve to `api: "anthropic-messages"`.
- Runtime provider dispatch in `packages/ai/src/stream.ts` is based on `model.api`.
- The Firm has a generic transport setting (`sse` / `websocket` / `auto`), but no Kimi-specific API-format setting.
- Existing hotfixes addressed tool-call/message transformation correctness, not Kimi protocol selection.

## Goal

Allow Kimi to be configured to use either:

- `openai`
- `anthropic`

without hardcoding the choice into generated model metadata.

## Proposed Work

### 1. Add a setting in The Firm config/UI

Introduce a user-facing setting for Kimi API format selection.

Possible shape:

- config key: `providers.kimiApiFormat`
- allowed values:
  - `openai`
  - `anthropic`

Potential work:

- extend The Firm settings model
- persist the setting in the existing JSON-backed settings system
- surface it in the interactive settings UI
- define a stable default

Questions:

- Should the default remain `anthropic` for compatibility?
- Should this setting be global only, or overrideable per project/session later?

### 2. Add runtime plumbing from settings to AI stream

Thread the Kimi format setting from configuration into the agent/AI runtime.

Potential work:

- expose getter/setter in `SettingsManager`
- include the setting where stream options are assembled
- ensure the selected Kimi format reaches the AI streaming layer
- keep the change isolated so other providers remain unaffected

Design constraint:

- prefer minimal plumbing over broad config refactors
- do not introduce a generalized provider-settings framework unless reuse is clear

### 3. Add a Kimi wrapper or resolver layer

Introduce a dedicated Kimi runtime seam that chooses OpenAI or Anthropic behavior based on settings.

Possible approaches:

#### Option A: Dedicated wrapper

Create a Kimi-specific stream wrapper similar to `oh-my-pi`:

- detect Kimi models
- read requested Kimi API format
- route to OpenAI-compatible or Anthropic-compatible stream implementation

Pros:

- explicit behavior
- easy to reason about
- aligns with existing `oh-my-pi` mental model

Cons:

- adds provider-specific branching in runtime

#### Option B: Resolver layer

Add a small resolver that converts Kimi model metadata into an effective runtime API before dispatch.

Pros:

- keeps `stream.ts` dispatch generic
- may be reusable for future dual-protocol providers

Cons:

- introduces another abstraction seam
- should only be added if justified beyond Kimi alone

Recommended direction:

- start with the smallest explicit Kimi wrapper that solves the current problem
- only generalize into a reusable resolver seam if a second real provider needs the same pattern

### 4. Add regression tests for both modes

Add test coverage for:

- Kimi with `anthropic` format
- Kimi with `openai` format

Minimum coverage:

- runtime routing chooses the expected underlying API path
- tool-call handling remains correct in both modes
- message transformation stays valid across both modes
- settings value is respected end-to-end
- default behavior is preserved when setting is absent

Suggested test areas:

- settings manager tests
- model/runtime dispatch tests
- provider transformation tests
- targeted integration tests for Kimi tool-call flows

## Non-Goals for This TODO

- changing unrelated provider settings architecture
- rewriting the full settings system to match `oh-my-pi`
- broad model metadata regeneration changes unless required
- introducing a generic abstraction without a concrete second use case

## Recommended Implementation Order

1. Add config storage and UI setting
2. Thread setting through runtime options
3. Implement minimal Kimi-specific routing layer
4. Add regressions for both formats
5. Verify current default behavior remains unchanged

## Acceptance Criteria

- user can select Kimi API format in The Firm
- selected value is persisted and loaded correctly
- runtime uses the selected Kimi protocol
- default behavior remains backward-compatible
- both OpenAI-mode and Anthropic-mode Kimi paths are covered by tests

## Notes

Related prior findings:

- closed Beads task for hotfixes: `the-firm-e05`
- closed Beads task for settings/API comparison: `the-firm-ctb`

This file is intentionally a deferred implementation note, not an active work plan.
