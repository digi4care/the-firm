/**
 * Settings Registry — accepts SettingsProvider objects from feature modules.
 *
 * Registry pattern: providers register once at bootstrap,
 * UI and SettingsManager read schema on demand.
 *
 * Lazy rebuild: schema is only merged when first read after a registration.
 * Duplicate provider ids and duplicate paths throw at registration time.
 */

import { SETTING_TABS, type SettingDef, type SettingOption, type SettingTab, type UiMeta } from "./settings-schema.js";

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
			return def !== undefined && this.hasUi(p) && this.getUi(p)?.tab === tab;
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
	getUi(path: string): UiMeta | undefined {
		const def = this.get(path);
		if (!def || !("ui" in def)) return undefined;
		return (def as { ui?: UiMeta }).ui;
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
					throw new Error(`Duplicate setting path "${path}" (from provider "${provider.id}")`);
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
