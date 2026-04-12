# Declarative Settings API — Design Spec

**Date:** 2026-04-12
**Status:** Draft
**Decision:** Incremental, distributed provider registry, adapter layer for backwards compat

## Problem

Current `SettingsManager` has ~40 hand-written getters/setters. `SettingsSelectorComponent` has a hardcoded `SettingItem[]` with a giant `switch/case`. Adding a setting means touching 3+ files. No tabs, no data-driven UI, no extensibility.

## Approach

Distributed **Registry** pattern with **Provider** interface. Each feature module owns its settings definition. A bootstrap file wires providers into the registry. The UI component derives everything from the registry — zero manual wiring.

### Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| Registry | `SettingsRegistry` | Key-based dispatch, no switch/case |
| Provider | `SettingsProvider` interface | OCP — new settings = new file + 2 lines bootstrap |
| Strategy | Per-type rendering in component | boolean toggle, enum cycle, submenu picker, text input |
| Facade | `SettingsManager.get(path)/set(path, value)` | Simple API over registry + storage |
| Adapter | Existing typed getters/setters → one-liners delegating to generic get/set | Backwards compat |
| Observer | `onPreview`/`onPreviewCancel` hooks on schema defs | Live preview where useful |

### SOLID Compliance

- **S** — Each provider owns one domain's settings
- **O** — New setting = new entry in provider file. New domain = new provider + 2 lines bootstrap
- **L** — All providers satisfy the same `SettingsProvider` interface
- **I** — `SettingDef` variants are small, specific interfaces per type
- **D** — Component depends on `SettingsRegistry` abstraction, not concrete providers

## Architecture

### File Structure

```
src/core/
  settings-registry.ts      # SettingsRegistry singleton, SettingsProvider interface
  settings-schema.ts         # SettingDef types, UiMeta, SettingTab, TAB_METADATA
  settings-manager.ts        # Refactored: generic get/set + adapter layer
  settings-bootstrap.ts      # Wires all providers into registry

src/features/
  compaction/settings.ts     # compactionSettings provider
  theme/settings.ts          # themeSettings provider
  interaction/settings.ts    # interactionSettings provider (steering, followUp, etc)
  editing/settings.ts        # editingSettings provider
  tools/settings.ts          # toolsSettings provider
  image/settings.ts          # imageSettings provider
  retry/settings.ts          # retrySettings provider
  general/settings.ts        # generalSettings provider (shellPath, quietStartup, etc)

src/modes/interactive/components/
  settings-selector.ts       # Rewritten: tabbed, data-driven from registry
```

### Core Types (`settings-schema.ts`)

```typescript
export type SettingTab =
  | "appearance" | "model" | "interaction"
  | "context" | "editing" | "tools" | "tasks";

export const SETTING_TABS: SettingTab[] = [
  "appearance", "model", "interaction",
  "context", "editing", "tools", "tasks",
];

export const TAB_METADATA: Record<SettingTab, { label: string; icon: string }> = {
  appearance:  { label: "Appearance",  icon: "◆" },
  model:       { label: "Model",       icon: "◈" },
  interaction: { label: "Interaction", icon: "◇" },
  context:     { label: "Context",     icon: "◎" },
  editing:     { label: "Editing",     icon: "△" },
  tools:       { label: "Tools",       icon: "□" },
  tasks:       { label: "Tasks",       icon: "○" },
};

export interface UiMeta {
  tab: SettingTab;
  label: string;
  description: string;
  submenu?: boolean;
  condition?: () => boolean;
  onPreview?: (value: unknown) => void;
  onPreviewCancel?: (original: unknown) => void;
}

// Type definitions
interface BooleanDef  { type: "boolean"; default: boolean; ui?: UiMeta }
interface StringDef   { type: "string";  default: string | undefined; ui?: UiMeta }
interface NumberDef   { type: "number";  default: number; ui?: UiMeta }
interface EnumDef<T extends readonly string[]> { type: "enum"; values: T; default: T[number]; ui?: UiMeta }
interface ArrayDef<T=unknown>  { type: "array";  default: T[] }
interface RecordDef<T=unknown> { type: "record"; default: Record<string, T> }

export type SettingDef = BooleanDef | StringDef | NumberDef | EnumDef<readonly string[]> | ArrayDef | RecordDef;
```

### Registry (`settings-registry.ts`)

```typescript
export interface SettingsProvider {
  readonly id: string;
  readonly settings: Record<string, SettingDef>;
}

class SettingsRegistry {
  #providers = new Map<string, SettingsProvider>();
  #merged = new Map<string, SettingDef>();
  #dirty = true;

  register(provider: SettingsProvider): void {
    if (this.#providers.has(provider.id)) {
      throw new Error(`Settings provider "${provider.id}" already registered`);
    }
    this.#providers.set(provider.id, provider);
    this.#dirty = true;
  }

  get(path: string): SettingDef | undefined { /* lazy rebuild */ }
  getPaths(): string[] { /* lazy rebuild */ }
  getPathsForTab(tab: SettingTab): string[] { /* filtered */ }
  getActiveTabs(): SettingTab[] { /* only tabs with settings */ }
}

export const settingsRegistry = new SettingsRegistry();
```

### SettingsManager Refactor

**Generic core:**
- `get(path)` — reads from merged settings, falls back to schema default via registry
- `set(path, value)` — writes to global, auto-creates intermediate objects, queues save

**Adapter layer (backwards compat):**
All existing typed getters/setters become one-liners delegating to `get()`/`set()`. Example:

```typescript
// Before (8 lines):
getCompactionEnabled(): boolean {
  return this.settings.compaction?.enabled ?? true;
}
setCompactionEnabled(enabled: boolean): void {
  if (!this.globalSettings.compaction) this.globalSettings.compaction = {};
  this.globalSettings.compaction.enabled = enabled;
  this.markModified("compaction", "enabled");
  this.save();
}

// After (2 lines):
getCompactionEnabled = () => this.get("compaction.enabled") as boolean;
setCompactionEnabled = (v: boolean) => this.set("compaction.enabled", v);
```

**New settings skip the adapter — consumers use `get(path)`/`set(path, value)` directly.**

### SettingsSelectorComponent Rewrite

Data-driven from registry:

1. **Tabs** — `settingsRegistry.getActiveTabs()` determines which tabs appear
2. **Items per tab** — `settingsRegistry.getPathsForTab(tab)` + `settingsManager.get(path)` for current value
3. **Rendering strategy per type:**
   - `boolean` → toggle (cycling true/false)
   - `enum` with `submenu: false` → inline cycle
   - `enum`/`number`/`string` with `submenu: true` → dropdown `SelectList`
   - `string` with no submenu → `TextInput` submenu
4. **Preview** — if def has `onPreview`, component calls it on selection change; `onPreviewCancel` on escape
5. **Conditions** — `def.ui.condition?.()` determines visibility

**Submenu option providers** live alongside the provider, not in a separate file:

```typescript
// features/compaction/settings.ts
export const COMPACTION_STRATEGY_OPTIONS = [
  { value: "context-full", label: "Context-full", description: "Summarize in-place" },
  { value: "handoff", label: "Handoff", description: "Continue in new session" },
  { value: "off", label: "Off", description: "Disable auto-compaction" },
];

export const compactionSettings: SettingsProvider = {
  id: "compaction",
  settings: {
    "compaction.strategy": {
      type: "enum",
      values: ["context-full", "handoff", "off"] as const,
      default: "context-full",
      ui: { tab: "context", label: "Compaction Strategy", description: "...", submenu: true },
    },
    // ...
  },
};
```

The component looks up option providers by convention or via an `optionsProvider` field on the def.

### Storage

**No changes.** JSON files, `proper-lockfile`, deep merge, project overrides global. Same as current.

### Migration Strategy

No migration needed for existing `settings.json` files — the schema is additive. Old settings that aren't in the registry still work via the generic `get()`/`set()` paths. The registry only adds UI metadata and typed defaults.

### Bootstrap

```typescript
// core/settings-bootstrap.ts
import { settingsRegistry } from "./settings-registry.js";
// Import all providers
import { compactionSettings } from "../features/compaction/settings.js";
import { themeSettings } from "../features/theme/settings.js";
import { interactionSettings } from "../features/interaction/settings.js";
import { editingSettings } from "../features/editing/settings.js";
import { toolsSettings } from "../features/tools/settings.js";
import { imageSettings } from "../features/image/settings.js";
import { retrySettings } from "../features/retry/settings.js";
import { generalSettings } from "../features/general/settings.js";

export function bootstrapSettings(): void {
  settingsRegistry.register(compactionSettings);
  settingsRegistry.register(themeSettings);
  settingsRegistry.register(interactionSettings);
  settingsRegistry.register(editingSettings);
  settingsRegistry.register(toolsSettings);
  settingsRegistry.register(imageSettings);
  settingsRegistry.register(retrySettings);
  settingsRegistry.register(generalSettings);
}
```

Called once during app startup before `SettingsManager` is used.

## Scope — Phase 1

**What we build now:**
- `settings-schema.ts` — core types
- `settings-registry.ts` — registry + provider interface
- `settings-bootstrap.ts` — wires providers
- 8 provider files — one per feature domain, covering all ~25 current settings
- `settings-manager.ts` refactor — generic get/set + adapter layer
- `settings-selector.ts` rewrite — tabbed, data-driven, with preview hooks
- Submenu option providers for enum/number settings that need them

**What we defer:**
- Plugin settings tab (oh-my-pi has this, we don't need it yet)
- Settings search/filter (the TUI `SettingsList` already supports `enableSearch`)
- Additional settings beyond current ~25 (incremental, no code changes needed)
- Migration from oh-my-pi's extended setting set (can cherry-pick later per provider)

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking SDK API | Adapter layer — existing getters/setters still work |
| Import order dependency | No side-effects in providers; explicit bootstrap |
| Tab explosion with few settings | `getActiveTabs()` hides empty tabs |
| Settings not in registry | Generic `get()`/`set()` still works for unregistered paths |
