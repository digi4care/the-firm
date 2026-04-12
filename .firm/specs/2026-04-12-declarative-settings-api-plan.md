# Declarative Settings API Implementation Plan

> **For agentic workers:** REQUIRED: Use subagent-driven-development (if subagents available) or executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the imperative settings system with a declarative schema-driven approach using the Registry pattern, keeping full SDK backwards compatibility.

**Architecture:** Settings providers register typed definitions into a central registry. The UI component auto-generates its tabbed interface from the registry. SettingsManager becomes a facade with generic `get(path)`/`set(path, value)` and thin adapter wrappers for existing typed API.

**Tech Stack:** TypeScript, existing `@digi4care/the-firm-tui` components (SettingsList, SelectList, Container, TabBar), existing `proper-lockfile` storage layer.

**Design spec:** `.firm/specs/2026-04-12-declarative-settings-api-design.md`

## Architectural Decisions

- **Registry pattern:** `SettingsRegistry` singleton accepts `SettingsProvider` objects. Duplicate paths throw. Lazy rebuild on read.
- **Provider grouping:** One provider per feature domain (compaction, theme, interaction, etc.). Each provider is a separate file exporting a `SettingsProvider` object.
- **Adapter layer:** Existing typed getters/setters on `SettingsManager` become one-liners delegating to generic `get()`/`set()`. No breaking SDK changes.
- **Tab structure:** 7 tabs: appearance, model, interaction, context, editing, tools, tasks. Tabs only render if they have settings.
- **Preview:** Optional `onPreview`/`onPreviewCancel` hooks on `UiMeta`. Only theme uses it initially.
- **Storage:** JSON unchanged. `FileSettingsStorage` and `InMemorySettingsStorage` unchanged.
- **Submenu options:** A `getOptions()` function on enum/number defs that returns `SelectItem[]`. Can be static or dynamic.

---

## File Structure

```
packages/coding-agent/src/
  core/
    settings-schema.ts          # NEW — SettingDef types, SettingTab, UiMeta, etc.
    settings-registry.ts        # NEW — SettingsRegistry + SettingsProvider interface
    settings-manager.ts         # MODIFY — add generic get/set, adapter layer
    settings-bootstrap.ts       # NEW — register all providers
  features/
    settings/                   # NEW directory
      compaction.ts             # compaction.* settings provider
      theme.ts                  # theme, images, terminal display settings
      interaction.ts            # steering, follow-up, transport, startup
      editing.ts                # edit mode, line numbers, LSP, bash interceptor
      tools.ts                  # search, grep, browser, MCP, async
      model.ts                  # thinking, retry, sampling params
      tasks.ts                  # task delegation, isolation, skills, commands
  modes/interactive/components/
    settings-selector.ts        # REWRITE — declarative, tabbed, auto-generated from registry
```

---

### Task 1: Core Schema Types

**Files:**
- Create: `src/core/settings-schema.ts`

- [ ] **Step 1: Create settings-schema.ts with all types**

```typescript
/**
 * Declarative settings schema — single source of truth for setting types,
 * defaults, and UI metadata. Settings are registered via SettingsProvider
 * objects, not defined here directly.
 *
 * Inspired by oh-my-pi's settings-schema.ts but with distributed providers
 * (Registry pattern) instead of a monolithic object.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Tab Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type SettingTab =
  | "appearance"
  | "model"
  | "interaction"
  | "context"
  | "editing"
  | "tools"
  | "tasks";

/** Ordered tabs for UI rendering */
export const SETTING_TABS: SettingTab[] = [
  "appearance",
  "model",
  "interaction",
  "context",
  "editing",
  "tools",
  "tasks",
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

// ═══════════════════════════════════════════════════════════════════════════
// UI Metadata
// ═══════════════════════════════════════════════════════════════════════════

export interface UiMeta {
  tab: SettingTab;
  label: string;
  description: string;
  /** Show as dropdown submenu instead of inline toggle/cycle */
  submenu?: boolean;
  /** Only show when condition returns true */
  condition?: () => boolean;
  /** Live preview while browsing options */
  onPreview?: (value: unknown) => void;
  onPreviewCancel?: (original: unknown) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export interface BooleanDef {
  type: "boolean";
  default: boolean;
  ui?: UiMeta;
}

export interface StringDef {
  type: "string";
  default: string | undefined;
  ui?: UiMeta;
}

export interface NumberDef {
  type: "number";
  default: number;
  ui?: UiMeta;
}

export interface EnumDef<T extends readonly string[]> {
  type: "enum";
  values: T;
  default: T[number];
  ui?: UiMeta;
}

export interface ArrayDef<T = unknown> {
  type: "array";
  default: T[];
}

export interface RecordDef<T = unknown> {
  type: "record";
  default: Record<string, T>;
}

export type SettingDef =
  | BooleanDef
  | StringDef
  | NumberDef
  | EnumDef<readonly string[]>
  | ArrayDef
  | RecordDef;

// ═══════════════════════════════════════════════════════════════════════════
// Submenu Options
// ═══════════════════════════════════════════════════════════════════════════

/** An option for a submenu-style setting */
export interface SettingOption {
  value: string;
  label: string;
  description?: string;
}

/** Static or dynamic option provider */
export type OptionProvider = SettingOption[] | (() => SettingOption[]);
```

- [ ] **Step 2: Commit**

```bash
git add src/core/settings-schema.ts
git commit -m "feat: add declarative settings schema types"
```

---

### Task 2: Settings Registry

**Files:**
- Create: `src/core/settings-registry.ts`

- [ ] **Step 1: Create settings-registry.ts**

```typescript
/**
 * Settings Registry — accepts SettingsProvider objects from feature modules.
 * Uses Registry pattern: providers register once at bootstrap,
 * UI and SettingsManager read schema on demand.
 */

import {
  type SettingDef,
  type SettingOption,
  type SettingTab,
  SETTING_TABS,
} from "./settings-schema.js";

// ═══════════════════════════════════════════════════════════════════════════
// Provider Interface
// ═══════════════════════════════════════════════════════════════════════════

export interface SettingsProvider {
  /** Unique identifier for this provider group (e.g. "compaction", "theme") */
  readonly id: string;
  /** Setting definitions keyed by dot-path */
  readonly settings: Record<string, SettingDef>;
  /** Optional submenu option overrides keyed by dot-path */
  readonly options?: Record<string, SettingOption[] | (() => SettingOption[])>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Registry
// ═══════════════════════════════════════════════════════════════════════════

class SettingsRegistry {
  #providers = new Map<string, SettingsProvider>();
  #mergedSchema = new Map<string, SettingDef>();
  #mergedOptions = new Map<string, SettingOption[] | (() => SettingOption[])>();
  #dirty = true;

  /** Register a settings provider. Throws on duplicate provider id or path. */
  register(provider: SettingsProvider): void {
    if (this.#providers.has(provider.id)) {
      throw new Error(`Settings provider "${provider.id}" already registered`);
    }
    this.#providers.set(provider.id, provider);
    this.#dirty = true;
  }

  /** Get a single setting definition by path */
  get(path: string): SettingDef | undefined {
    this.#rebuildIfDirty();
    return this.#mergedSchema.get(path);
  }

  /** All registered paths */
  getPaths(): string[] {
    this.#rebuildIfDirty();
    return [...this.#mergedSchema.keys()];
  }

  /** Paths filtered to a specific tab */
  getPathsForTab(tab: SettingTab): string[] {
    return this.getPaths().filter((p) => {
      const def = this.get(p);
      return def && this.hasUi(p) && this.getUi(p)?.tab === tab;
    });
  }

  /** All tabs that have at least one visible setting */
  getActiveTabs(): SettingTab[] {
    return SETTING_TABS.filter((tab) => this.getPathsForTab(tab).length > 0);
  }

  /** Check if a path has UI metadata */
  hasUi(path: string): boolean {
    const def = this.get(path);
    return def !== undefined && "ui" in def && def.ui !== undefined;
  }

  /** Get UI metadata for a path */
  getUi(path: string): import("./settings-schema.js").UiMeta | undefined {
    const def = this.get(path);
    if (!def || !("ui" in def)) return undefined;
    return (def as { ui?: import("./settings-schema.js").UiMeta }).ui;
  }

  /** Get submenu options for a path, if registered */
  getOptions(path: string): SettingOption[] | (() => SettingOption[]) | undefined {
    this.#rebuildIfDirty();
    return this.#mergedOptions.get(path);
  }

  /** Iterate all providers */
  getProviders(): IterableIterator<SettingsProvider> {
    return this.#providers.values();
  }

  #rebuildIfDirty(): void {
    if (!this.#dirty) return;
    this.#mergedSchema.clear();
    this.#mergedOptions.clear();
    for (const provider of this.#providers.values()) {
      for (const [path, def] of Object.entries(provider.settings)) {
        if (this.#mergedSchema.has(path)) {
          throw new Error(
            `Duplicate setting path "${path}" (from provider "${provider.id}")`,
          );
        }
        this.#mergedSchema.set(path, def);
      }
      if (provider.options) {
        for (const [path, opts] of Object.entries(provider.options)) {
          this.#mergedOptions.set(path, opts);
        }
      }
    }
    this.#dirty = false;
  }
}

/** Global singleton — populated by bootstrapSettings() */
export const settingsRegistry = new SettingsRegistry();
```

- [ ] **Step 2: Commit**

```bash
git add src/core/settings-registry.ts
git commit -m "feat: add settings registry with provider interface"
```

---

### Task 3: Feature Providers (initial set)

**Files:**
- Create: `src/features/settings/compaction.ts`
- Create: `src/features/settings/theme.ts`
- Create: `src/features/settings/interaction.ts`
- Create: `src/features/settings/model.ts`

These providers define all settings that currently appear in the settings selector, plus the ones that don't but should.

- [ ] **Step 1: Create compaction provider**

File: `src/features/settings/compaction.ts`

All compaction settings: `compaction.enabled`, `compaction.strategy`, `compaction.handoffAutoContinue`, `compaction.handoffSaveToDisk`, `compaction.reserveTokens`, `compaction.keepRecentTokens`.

- [ ] **Step 2: Create theme provider**

File: `src/features/settings/theme.ts`

All appearance settings: `theme`, `terminal.showImages`, `images.autoResize`, `images.blockImages`, `showHardwareCursor`, `clearOnShrink`, `showHardwareCursor`, `autocompleteMaxVisible`, `editorPaddingX`.

- [ ] **Step 3: Create interaction provider**

File: `src/features/settings/interaction.ts`

Steering, follow-up, transport, startup, changelog, double-escape, tree-filter settings.

- [ ] **Step 4: Create model provider**

File: `src/features/settings/model.ts`

Thinking level, hide thinking, retry settings.

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/
git commit -m "feat: add initial settings providers (compaction, theme, interaction, model)"
```

---

### Task 4: Bootstrap

**Files:**
- Create: `src/core/settings-bootstrap.ts`

- [ ] **Step 1: Create bootstrap file that registers all providers**

```typescript
import { settingsRegistry } from "./settings-registry.js";
import { compactionSettings } from "../features/settings/compaction.js";
import { themeSettings } from "../features/settings/theme.js";
import { interactionSettings } from "../features/settings/interaction.js";
import { modelSettings } from "../features/settings/model.js";

export function bootstrapSettings(): void {
  settingsRegistry.register(compactionSettings);
  settingsRegistry.register(themeSettings);
  settingsRegistry.register(interactionSettings);
  settingsRegistry.register(modelSettings);
}
```

- [ ] **Step 2: Call bootstrapSettings() in main.ts before SettingsManager.init()**

- [ ] **Step 3: Commit**

```bash
git add src/core/settings-bootstrap.ts src/main.ts
git commit -m "feat: add settings bootstrap, wire into main startup"
```

---

### Task 5: SettingsManager — Generic get/set + Adapter Layer

**Files:**
- Modify: `src/core/settings-manager.ts`

This is the biggest refactor but it's mechanical.

- [ ] **Step 1: Add generic `get(path)` and `set(path, value)` methods**

Add `getByPath()` / `setByPath()` helper functions (already exist in oh-my-pi reference). Wire them to `settingsRegistry` for default fallback.

- [ ] **Step 2: Convert existing typed getters to one-liners**

For every existing `getXxx()` / `setXxx()`, replace the body with a delegation to `this.get("path")` or `this.set("path", value)`. Keep the same signature. Examples:

```typescript
getCompactionEnabled = () => this.get("compaction.enabled") as boolean;
setCompactionEnabled = (v: boolean) => this.set("compaction.enabled", v);
```

Keep the existing `Settings` interface and all exported types untouched.

- [ ] **Step 3: Verify existing tests still pass**

Run: `cd packages/coding-agent && npx vitest run --reporter=verbose test/ 2>&1 | tail -40`

- [ ] **Step 4: Commit**

```bash
git add src/core/settings-manager.ts
git commit -m "refactor: SettingsManager generic get/set with adapter layer"
```

---

### Task 6: Rewrite SettingsSelectorComponent

**Files:**
- Rewrite: `src/modes/interactive/components/settings-selector.ts`

This is the big visual change. Replace the hardcoded `SettingItem[]` with auto-generated tabs from the registry.

- [ ] **Step 1: Implement tabbed layout with TabBar**

The component reads from `settingsRegistry.getActiveTabs()` and renders a `TabBar` at the top. Each tab shows a `SettingsList` populated from `settingsRegistry.getPathsForTab(tab)`.

- [ ] **Step 2: Implement schema-to-SettingItem conversion**

For each setting path, read the def from registry and create a `SettingItem`:
- `boolean` → toggle (values: ["true", "false"])
- `enum` with ≤4 values → inline cycle
- `enum`/`number`/`string` with `submenu: true` → submenu with SelectList
- Check `condition()` — skip if returns false

- [ ] **Step 3: Implement SelectSubmenu for submenu-type settings**

Reuse existing `SelectSubmenu` pattern from current code. When `options` are registered in the provider, use those. Otherwise, generate from enum values.

- [ ] **Step 4: Implement preview support**

For settings with `onPreview`/`onPreviewCancel`, wire them into the SelectSubmenu's `onSelectionChange` callback. Theme preview already works this way.

- [ ] **Step 5: Wire callbacks — simplified dispatch**

Instead of a giant switch/case, use `settingsManager.set(path, value)` generically. Special callbacks (like theme changes requiring `ui.invalidate()`) come from the `onPreview`/`onPreviewCancel` hooks or from the `SettingsCallbacks.onChange` callback.

Simplify `SettingsCallbacks` to:
```typescript
export interface SettingsCallbacks {
  /** Called when any setting value changes */
  onChange: (path: string, newValue: unknown) => void;
  /** Called for theme preview while browsing */
  onThemePreview?: (theme: string) => void;
  /** Called when settings panel is closed */
  onCancel: () => void;
}
```

- [ ] **Step 6: Update interactive-mode.ts call site**

Replace the `SettingsConfig` object + individual callbacks with the simplified `SettingsCallbacks`. The `onChange` callback dispatches side effects based on path.

- [ ] **Step 7: Verify TUI renders correctly**

Run the firm in interactive mode, open `/settings`, verify all tabs render, toggling works, submenus open/close.

- [ ] **Step 8: Commit**

```bash
git add src/modes/interactive/components/settings-selector.ts src/modes/interactive/interactive-mode.ts
git commit -m "feat: rewrite settings selector as declarative tabbed component"
```

---

### Task 7: Remaining Providers + Cleanup

**Files:**
- Create: `src/features/settings/editing.ts`
- Create: `src/features/settings/tools.ts`
- Create: `src/features/settings/tasks.ts`

- [ ] **Step 1: Create editing provider**

Edit mode, line numbers, hash lines, LSP settings, bash interceptor, python tool mode.

- [ ] **Step 2: Create tools provider**

Search, grep, browser, MCP, async, fetch, github, web search, notebook.

- [ ] **Step 3: Create tasks provider**

Task delegation, isolation, skills, commands.

- [ ] **Step 4: Add to bootstrap**

- [ ] **Step 5: Remove dead code from SettingsManager**

Remove individual getter/setter implementations that are now one-liners. Remove the `SettingsConfig` and old `SettingsCallbacks` interfaces.

- [ ] **Step 6: Run full test suite**

Run: `cd packages/coding-agent && npx vitest run --reporter=verbose 2>&1 | tail -40`

- [ ] **Step 7: Commit**

```bash
git add src/features/settings/ src/core/settings-bootstrap.ts src/core/settings-manager.ts
git commit -m "feat: add remaining settings providers, cleanup dead code"
```

---

### Task 8: Update Docs

**Files:**
- Modify: `docs/settings.md`
- Modify: `docs/sdk.md` (if needed)

- [ ] **Step 1: Update settings.md to document the new tab structure and provider system**

- [ ] **Step 2: Add provider authoring guide for extension developers**

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs: update settings docs for declarative API"
```
