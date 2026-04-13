# Interaction Tab Comparison: The Firm vs oh-my-pi

**Bead:** the-firm-7vj.3  
**Date:** 2026-04-13  
**Upstream source:** `can1357/oh-my-pi` @ `packages/coding-agent/src/config/settings-schema.ts`

---

## Current The Firm Interaction Settings

Source: `packages/coding-agent/src/features/settings/interaction.ts`

| Setting | Type | Default | UI | Notes |
|---------|------|---------|-----|-------|
| `steeringMode` | enum | `one-at-a-time` | ✅ Yes | How steering messages are sent |
| `followUpMode` | enum | `one-at-a-time` | ✅ Yes | How follow-up messages are delivered |
| `transport` | enum | `sse` | ✅ Yes | `sse`, `websocket`, `auto` |
| `quietStartup` | boolean | `false` | ✅ Yes | Disable verbose printing |
| `collapseChangelog` | boolean | `false` | ✅ Yes | Condensed changelog |
| `doubleEscapeAction` | enum | `tree` | ✅ Yes | `tree`, `fork`, `none` |
| `treeFilterMode` | enum | `default` | ✅ Yes | Session tree filter |

**Note:** `autocompleteMaxVisible` is in The Firm's **Appearance** tab, not Interaction.

---

## Upstream oh-my-pi Interaction Settings

Source: `packages/coding-agent/src/config/settings-schema.ts` (lines ~570–730)

| Setting | Type | Default | UI | Notes |
|---------|------|---------|-----|-------|
| `steeringMode` | enum | `one-at-a-time` | ✅ Yes | Same |
| `followUpMode` | enum | `one-at-a-time` | ✅ Yes | Same |
| `interruptMode` | enum | `immediate` | ✅ Yes | `immediate`, `wait` |
| `doubleEscapeAction` | enum | `tree` | ✅ Yes | Same |
| `treeFilterMode` | enum | `default` | ✅ Yes | Same |
| `autocompleteMaxVisible` | number | `5` | ✅ Yes | In **Interaction** tab |
| `startup.quiet` | boolean | `false` | ✅ Yes | Same as `quietStartup` |
| `startup.checkUpdate` | boolean | `true` | ✅ Yes | Skip update check |
| `collapseChangelog` | boolean | `false` | ✅ Yes | Same |
| `completion.notify` | enum | `on` | ✅ Yes | Notify on completion |
| `ask.timeout` | number | `30` | ✅ Yes | Auto-select timeout |
| `ask.notify` | enum | `on` | ✅ Yes | Notify when ask waiting |
| `stt.enabled` | boolean | `false` | ✅ Yes | Speech-to-text |
| `stt.language` | string | `en` | ✅ Yes | Whisper language |
| `stt.modelName` | enum | `base.en` | ✅ Yes | Whisper model size |

**Transport note:** oh-my-pi does NOT have a global `transport` setting in the Interaction tab. They have `providers.openaiWebsockets` in the Providers tab instead (provider-specific).

---

## Side-by-Side Diff

| Feature | The Firm | oh-my-pi | Assessment |
|---------|----------|----------|------------|
| Steering mode | ✅ Same | ✅ Same | Parity |
| Follow-up mode | ✅ Same | ✅ Same | Parity |
| Transport | `transport` (global) | Provider-specific | Different philosophy |
| Interrupt mode | ❌ Absent | `interruptMode` | oh-my-pi extra |
| Double-escape | ✅ Same | ✅ Same | Parity |
| Tree filter | ✅ Same | ✅ Same | Parity |
| Quiet startup | `quietStartup` | `startup.quiet` | Same, different key |
| Check updates | ❌ Absent | `startup.checkUpdate` | oh-my-pi extra |
| Autocomplete max | In **Appearance** | In **Interaction** | Tab difference |
| Collapse changelog | ✅ Same | ✅ Same | Parity |
| Completion notify | ❌ Absent | `completion.notify` | oh-my-pi extra |
| Ask timeout | ❌ Absent | `ask.timeout` | oh-my-pi extra |
| Ask notify | ❌ Absent | `ask.notify` | oh-my-pi extra |
| Speech-to-text | ❌ Absent | `stt.*` settings | oh-my-pi extra (Whisper) |

---

## Key Findings

### 1. `interruptMode` (immediate vs wait)
**Status:** Missing in The Firm.

**Description:** Controls when steering messages interrupt tool execution - immediately or wait for current tool to finish.

**Assessment:** Minor UX feature. The Firm currently has implicit behavior (likely "immediate"). Adding this gives users control over interruption timing.

**Recommendation:** Low priority but trivial to implement (enum setting + agent session plumbing).

### 2. `startup.checkUpdate`
**Status:** Missing in The Firm.

**Description:** Boolean to skip update check on startup.

**Assessment:** The Firm has `collapseChangelog` but no way to skip the update check entirely.

**Recommendation:** Low priority. Add if users request faster startup or offline mode.

### 3. Completion and Ask notifications (`completion.notify`, `ask.*`)
**Status:** Missing in The Firm.

**Description:** 
- `completion.notify`: Notify when agent completes (on/off)
- `ask.timeout`: Auto-select recommended option after N seconds
- `ask.notify`: Notify when ask tool waits for input

**Assessment:** These are platform integration features (desktop notifications). The Firm may not have notification infrastructure.

**Recommendation:** Only implement if The Firm has/plans notification support (system notifications, sounds, etc.).

### 4. Speech-to-Text (`stt.*`)
**Status:** Missing in The Firm.

**Description:** Full Whisper integration:
- Enable/disable STT
- Language selection
- Model size (tiny → large)

**Assessment:** Large feature requiring:
- Whisper model downloading/loading
- Microphone access
- Audio processing pipeline

**Recommendation:** Out of scope for core parity. Only add if product strategy includes voice input.

### 5. Transport setting location
**Status:** Different philosophy.

**The Firm:** Global `transport` setting (`sse` | `websocket` | `auto`) applies to all providers.

**oh-my-pi:** Provider-specific transport (e.g., `providers.openaiWebsockets`) in Providers tab. Global transport not exposed.

**Assessment:** The Firm's global transport is simpler. oh-my-pi's provider-specific allows fine-grained control.

**Recommendation:** Keep The Firm's global approach. The provider-specific override in oh-my-pi is primarily for OpenAI/Codex WebSockets which is a niche case.

### 6. `autocompleteMaxVisible` tab placement
**Status:** The Firm has it in Appearance, oh-my-pi in Interaction.

**Assessment:** Minor inconsistency. Both are reasonable placements.

**Recommendation:** Keep in Appearance (more "look and feel" than interaction flow).

---

## Recommendations (in order)

| Priority | Action | Effort | Notes |
|----------|--------|--------|-------|
| P4 | Add `interruptMode` | Small | Trivial enum setting + agent plumbing |
| P4 | Add `startup.checkUpdate` | Small | Boolean setting + startup logic |
| P5 | Add notification settings | Medium | Requires notification infrastructure first |
| P5 | Speech-to-Text | Large | Major feature, defer indefinitely |

---

## Conclusion

The Firm has **strong parity** with oh-my-pi on core interaction flow:
- Steering/follow-up modes
- Tree navigation
- Startup behavior

Main gaps are:
1. **interruptMode** — easy addition
2. **Notification settings** — requires infrastructure
3. **Speech-to-Text** — major feature

Unlike the Model tab (which had significant missing sampling parameters), the Interaction tab gaps are mostly UX conveniences rather than functional limitations. The Firm's simpler transport model (global vs provider-specific) is actually an advantage for most users.

**No urgent action required.** Consider `interruptMode` if users request more control over message interruption timing.
