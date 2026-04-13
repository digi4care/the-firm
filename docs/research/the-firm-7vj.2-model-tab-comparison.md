# Model Tab Comparison: The Firm vs oh-my-pi

**Bead:** the-firm-7vj.2  
**Date:** 2026-04-13  
**Upstream source:** `can1357/oh-my-pi` @ `packages/coding-agent/src/config/settings-schema.ts`

---

## Current The Firm Model Settings

Source: `packages/coding-agent/src/features/settings/model.ts`

| Setting | Type | Default | UI |
|---------|------|---------|-----|
| `defaultThinkingLevel` | enum | `high` | ✅ Yes |
| `hideThinkingBlock` | boolean | `false` | ✅ Yes |
| `retry.enabled` | boolean | `true` | ✅ Yes |
| `retry.maxRetries` | number | `3` | ✅ Yes |
| `retry.baseDelayMs` | number | `2000` | ❌ No |
| `retry.maxDelayMs` | number | `60000` | ❌ No |
| `providerLogging.level` | enum | `off` | ✅ Yes |
| `thinkingBudgets` | record | `{}` | ❌ No |

**Settings that exist in `SettingsManager` but are NOT in the Model provider UI:**
- `defaultProvider` (string)
- `defaultModel` (string)
- `enabledModels` (string[])

---

## Upstream oh-my-pi Model Settings

Source: `packages/coding-agent/src/config/settings-schema.ts` (lines ~440–570)

| Setting | Type | Default | UI |
|---------|------|---------|-----|
| `defaultThinkingLevel` | enum | `high` | ✅ Yes |
| `hideThinkingBlock` | boolean | `false` | ✅ Yes |
| `repeatToolDescriptions` | boolean | `false` | ✅ Yes |
| `temperature` | number | `-1` | ✅ Yes |
| `topP` | number | `-1` | ✅ Yes |
| `topK` | number | `-1` | ✅ Yes |
| `minP` | number | `-1` | ✅ Yes |
| `presencePenalty` | number | `-1` | ✅ Yes |
| `repetitionPenalty` | number | `-1` | ✅ Yes |
| `serviceTier` | enum | `none` | ✅ Yes |
| `retry.enabled` | boolean | `true` | ❌ No |
| `retry.maxRetries` | number | `3` | ✅ Yes |
| `retry.baseDelayMs` | number | `2000` | ❌ No |
| `retry.fallbackChains` | record | `{}` | ❌ No |
| `retry.fallbackRevertPolicy` | enum | `cooldown-expiry` | ✅ Yes |
| `thinkingBudgets.minimal` | number | `1024` | ❌ No |
| `thinkingBudgets.low` | number | `2048` | ❌ No |
| `thinkingBudgets.medium` | number | `8192` | ❌ No |
| `thinkingBudgets.high` | number | `16384` | ❌ No |
| `thinkingBudgets.xhigh` | number | `32768` | ❌ No |

**Settings that exist in schema but have no `ui:` block (hidden):**
- `enabledModels` (array)
- `modelRoles` (record)
- `modelTags` (record)

---

## Side-by-Side Diff

| Feature | The Firm | oh-my-pi | Assessment |
|---------|----------|----------|------------|
| Thinking level | ✅ Same enum | ✅ Same enum | Parity |
| Hide thinking | ✅ Same boolean | ✅ Same boolean | Parity |
| Retry basics | ✅ Same | ✅ Same | Parity |
| Retry max delay | `retry.maxDelayMs` | ❌ Absent | The Firm extra |
| Retry fallback chains | ❌ Absent | `retry.fallbackChains` | oh-my-pi extra |
| Retry fallback revert | ❌ Absent | `retry.fallbackRevertPolicy` | oh-my-pi extra |
| Provider logging | `providerLogging.level` | ❌ Absent | The Firm extra |
| Thinking budgets | `thinkingBudgets` (record, no defaults) | Individual keys with defaults | Different shape |
| Tool descriptions repeat | ❌ Absent | `repeatToolDescriptions` | oh-my-pi extra |
| Sampling params | ❌ None | temp, topP, topK, minP, penalties | oh-my-pi extra |
| Service tier | ❌ Absent | `serviceTier` (OpenAI) | oh-my-pi extra |
| Default provider/model | Exists but hidden in UI | Exists but hidden in UI | Same |
| Enabled models | Exists but hidden in UI | Exists but hidden in UI | Same |

---

## Findings

### 1. Sampling parameters (temperature, topP, topK, minP, penalties)
**Status:** Not implemented in The Firm at all.

**Blocker:** `@digi4care/the-firm-ai` `streamSimple()` would need to accept and forward these parameters to providers. If the AI layer already supports them, adoption is trivial (settings + plumbing). If not, this requires AI package changes.

**Recommendation:** Check `packages/ai/src/stream.ts` for `temperature`, `topP`, etc. If supported, add as opt-in settings (default `-1` = omit). If not supported, defer.

### 2. `serviceTier`
**Status:** OpenAI-specific priority parameter.

**Assessment:** Very provider-specific. Not clearly aligned with The Firm's minimalism philosophy unless there is user demand.

**Recommendation:** Low priority. Skip unless explicit product request.

### 3. `repeatToolDescriptions`
**Status:** Missing in The Firm.

**Assessment:** Affects system prompt construction. Requires change to system prompt builder.

**Recommendation:** Low priority but easy to implement if system prompt builder already supports dynamic tool description inclusion.

### 4. Retry fallback chains / revert policy
**Status:** Missing in The Firm.

**Assessment:** The Firm has `enabledModels` for cycling but no explicit fallback-on-error chain logic. oh-my-pi has a dedicated fallback architecture.

**Recommendation:** Medium architectural effort. Defer unless The Firm wants explicit model fallback behavior.

### 5. `thinkingBudgets` shape difference
**Status:** Both have thinking budgets, but differently structured.

- The Firm: `thinkingBudgets` is a `record<string, number>` with `{}` default. Not shown in UI.
- oh-my-pi: `thinkingBudgets.minimal` … `thinkingBudgets.xhigh` are individual number settings with explicit defaults.

**Recommendation:** The oh-my-pi shape is more UI-friendly because each level gets its own default. Consider migrating The Firm from record to dotted keys if thinking budgets should become user-visible.

### 6. `providerLogging.level`
**Status:** The Firm has it; oh-my-pi doesn't.

**Assessment:** This is a Firm-specific capability. Chris is already working on moving provider logging to a Providers tab (`the-firm-7vj.8.1`). This may leave the Model tab.

**Recommendation:** Keep, but consider relocating to Providers tab as planned.

### 7. Hidden settings (`defaultProvider`, `defaultModel`, `enabledModels`)
**Status:** Both repos have these but neither exposes them in the Model settings UI.

**Assessment:** These are set via `/model` slash command and CLI flags. There may be no strong reason to duplicate them in the settings UI.

**Recommendation:** Keep hidden unless users request in-UI model selection.

---

## Recommendations (in order)

| Priority | Action | Effort | Notes |
|----------|--------|--------|-------|
| P3 | Verify AI layer supports sampling params | Small | If yes, add Model settings + forward them |
| P3 | Convert `thinkingBudgets` from record to dotted keys | Small | Aligns with oh-my-pi defaults; enables UI |
| P4 | Implement `repeatToolDescriptions` | Small | System prompt change only |
| P4 | Evaluate fallback chain architecture | Medium | Requires model fallback design |
| P5 | `serviceTier` | Small but niche | Skip unless requested |

---

## Conclusion

The Firm's Model tab has **near parity** with oh-my-pi on thinking and retry basics. The main gaps are:
1. **Sampling parameters** — requires AI layer verification
2. **Thinking budgets UI** — requires schema shape change
3. **Retry fallback logic** — requires new architecture

No critical missing features. Adoption should be driven by user demand and architectural fit, not 1:1 copying.
