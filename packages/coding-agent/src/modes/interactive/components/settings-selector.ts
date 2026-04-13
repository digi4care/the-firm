/**
 * Declarative Settings Selector Component
 *
 * Auto-generates a tabbed settings UI from the settings registry.
 * Each tab shows settings grouped by domain. Settings are read from
 * SettingsProvider objects registered at bootstrap time.
 *
 * To add a new setting:
 * 1. Add it to a provider in features/settings/*.ts
 * 2. It appears in the UI automatically under the configured tab
 */

import type { ThinkingLevel } from "@digi4care/the-firm-agent-core";
import {
	Container,
	matchesKey,
	type SelectItem,
	SelectList,
	type SelectListLayoutOptions,
	type SettingItem,
	SettingsList,
	Spacer,
	Text,
} from "@digi4care/the-firm-tui";
import type { SettingsScope, SettingValueSource } from "../../../core/settings-manager.js";
import { settingsRegistry } from "../../../core/settings-registry.js";
import { type SettingDef, type SettingOption, type SettingTab, TAB_METADATA } from "../../../core/settings-schema.js";
import { getSelectListTheme, getSettingsListTheme, theme } from "../theme/theme.js";
import { DynamicBorder } from "./dynamic-border.js";

const SETTINGS_SUBMENU_SELECT_LIST_LAYOUT: SelectListLayoutOptions = {
	minPrimaryColumnWidth: 12,
	maxPrimaryColumnWidth: 32,
};

const SCOPE_OPTIONS: SelectItem[] = [
	{ value: "global", label: "global", description: "Write to global settings" },
	{ value: "project", label: "project", description: "Write to project settings" },
];

class SelectSubmenu extends Container {
	private selectList: SelectList;

	constructor(
		title: string,
		description: string,
		options: SelectItem[],
		currentValue: string,
		onSelect: (value: string) => void,
		onCancel: () => void,
		onSelectionChange?: (value: string) => void,
	) {
		super();
		this.addChild(new Text(theme.bold(theme.fg("accent", title)), 0, 0));
		if (description) {
			this.addChild(new Spacer(1));
			this.addChild(new Text(theme.fg("muted", description), 0, 0));
		}
		this.addChild(new Spacer(1));
		this.selectList = new SelectList(
			options,
			Math.min(options.length, 10),
			getSelectListTheme(),
			SETTINGS_SUBMENU_SELECT_LIST_LAYOUT,
		);
		const currentIndex = options.findIndex((o) => o.value === currentValue);
		if (currentIndex !== -1) {
			this.selectList.setSelectedIndex(currentIndex);
		}
		this.selectList.onSelect = (item) => onSelect(item.value);
		this.selectList.onCancel = onCancel;
		if (onSelectionChange) {
			this.selectList.onSelectionChange = (item) => onSelectionChange(item.value);
		}
		this.addChild(this.selectList);
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("dim", "  Enter to select · Esc to go back"), 0, 0));
	}

	handleInput(data: string): void {
		this.selectList.handleInput(data);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// Callbacks
// ═══════════════════════════════════════════════════════════════════════════

export interface SettingsCallbacks {
	/** Called when any setting value changes via the generic path-based setter */
	onChange: (path: string, newValue: unknown, scope: SettingsScope) => void;
	/** Called for theme preview while browsing */
	onThemePreview?: (themeName: string) => void;
	/** Called when settings panel is closed */
	onCancel: () => void;
}

/** Runtime data needed by the settings component that isn't in the registry */
export interface SettingsRuntimeContext {
	thinkingLevel: ThinkingLevel;
	availableThinkingLevels: ThinkingLevel[];
	currentTheme: string;
	availableThemes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export class SettingsSelectorComponent extends Container {
	private settingsList: SettingsList | null = null;
	private activeTab: SettingTab;
	private activeTabs: SettingTab[];
	private readonly scopeSelections = new Map<string, SettingsScope>();
	constructor(
		private readonly context: SettingsRuntimeContext,
		private readonly callbacks: SettingsCallbacks,
		private readonly getSettingValue: (path: string) => unknown,
		private readonly getScopedSettingValue: (path: string, scope: SettingsScope) => unknown,
		private readonly getSettingValueSource: (path: string) => SettingValueSource,
	) {
		super();

		this.activeTabs = settingsRegistry.getActiveTabs();
		this.activeTab = this.activeTabs[0] ?? "appearance";

		// Build component tree: border → content → border
		this.addChild(new DynamicBorder());
		this.addChild(new Text(this.renderTabHeader(), 0, 0));
		this.addChild(new Spacer(1));
		this.addSettingsList(this.activeTab);
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("dim", "  Tab/Shift+Tab or ←/→ to switch tabs · Esc to close"), 0, 0));
		this.addChild(new DynamicBorder());
	}

	// ── Tab Header Rendering ───────────────────────────────────────────────

	private renderTabHeader(): string {
		const parts = this.activeTabs.map((tab) => {
			const meta = TAB_METADATA[tab];
			if (tab === this.activeTab) {
				return theme.bg("selectedBg", theme.fg("accent", ` ${meta.icon} ${meta.label} `));
			}
			return theme.fg("muted", ` ${meta.icon} ${meta.label} `);
		});
		return parts.join(theme.fg("dim", " │ "));
	}

	// ── Schema → SettingItem Conversion ────────────────────────────────────

	private defToItems(path: string, def: SettingDef): SettingItem[] {
		const ui = settingsRegistry.getUi(path);
		if (!ui) return [];
		if (ui.condition && !ui.condition()) return [];

		const currentValue = this.getSettingValue(path);
		const displayValue = this.toDisplayString(currentValue);
		const selectedScope = this.getSelectedScope(path);
		const scopedValue = this.getScopedSettingValue(path, selectedScope);
		const scopedDisplayValue = this.toDisplayString(scopedValue ?? currentValue);

		const items: SettingItem[] = [];

		if (ui.scopeSelector) {
			items.push({
				id: `${path}.__scope`,
				label: `${ui.label} Scope`,
				description: `Choose whether ${ui.label.toLowerCase()} writes to global or project settings`,
				currentValue: selectedScope,
				submenu: (_cv, done) => this.createScopeSubmenu(path, ui.label, done),
			});
		}

		const options = settingsRegistry.getOptions(path);
		if (ui.submenu || options) {
			items.push({
				id: path,
				label: ui.scopeSelector ? `${ui.label} Level` : ui.label,
				description: ui.scopeSelector ? this.buildScopedDescription(path, ui.description) : ui.description,
				currentValue: ui.scopeSelector ? scopedDisplayValue : displayValue,
				submenu: (cv, done) => this.createSubmenu(path, def, cv, done),
			});
			return items;
		}

		if (def.type === "boolean") {
			items.push({
				id: path,
				label: ui.label,
				description: ui.description,
				currentValue: displayValue,
				values: ["true", "false"],
			});
			return items;
		}

		if (def.type === "enum") {
			items.push({
				id: path,
				label: ui.label,
				description: ui.description,
				currentValue: displayValue,
				values: [...def.values],
			});
		}

		return items;
	}

	private getSelectedScope(path: string): SettingsScope {
		return this.scopeSelections.get(path) ?? "global";
	}

	private buildScopedDescription(path: string, baseDescription: string): string {
		const selectedScope = this.getSelectedScope(path);
		const effectiveValue = this.toDisplayString(this.getSettingValue(path));
		const effectiveSource = this.getSettingValueSource(path);
		const scopedValue = this.getScopedSettingValue(path, selectedScope);
		const storedValue =
			scopedValue === undefined ? `inherited → ${effectiveValue}` : this.toDisplayString(scopedValue);
		return [
			baseDescription,
			`Effective: ${effectiveValue} (${effectiveSource})`,
			`Write target: ${selectedScope}`,
			`Stored in target: ${storedValue}`,
		].join("\n");
	}

	private toDisplayString(value: unknown): string {
		if (value === undefined || value === null) return "";
		if (typeof value === "boolean") return value ? "true" : "false";
		return String(value);
	}

	// ── Submenu Creation ───────────────────────────────────────────────────

	private createSubmenu(
		path: string,
		def: SettingDef,
		currentValue: string,
		done: (value?: string) => void,
	): Container {
		let options: SelectItem[] = [];

		if (path === "theme") {
			options = this.context.availableThemes.map((t) => ({ value: t, label: t }));
		} else if (path === "defaultThinkingLevel") {
			const descriptions: Record<string, string> = {
				off: "No reasoning",
				minimal: "Very brief reasoning (~1k tokens)",
				low: "Light reasoning (~2k tokens)",
				medium: "Moderate reasoning (~8k tokens)",
				high: "Deep reasoning (~16k tokens)",
				xhigh: "Maximum reasoning (~32k tokens)",
			};
			options = this.context.availableThinkingLevels.map((level) => ({
				value: level,
				label: level,
				description: descriptions[level],
			}));
		} else {
			const registeredOpts = settingsRegistry.getOptions(path);
			if (registeredOpts) {
				const resolved = typeof registeredOpts === "function" ? registeredOpts() : registeredOpts;
				options = resolved.map((o: SettingOption) => ({
					value: o.value,
					label: o.label,
					description: o.description,
				}));
			} else if (def.type === "enum") {
				options = def.values.map((v) => ({ value: v, label: v }));
			}
		}

		const ui = settingsRegistry.getUi(path);
		const label = ui?.scopeSelector ? `${ui?.label ?? path} Level` : (ui?.label ?? path);
		const description = ui?.scopeSelector
			? this.buildScopedDescription(path, ui.description)
			: (ui?.description ?? "");
		let onSelectionChange: ((value: string) => void) | undefined;
		if (path === "theme") {
			onSelectionChange = (value) => this.callbacks.onThemePreview?.(value);
		}

		return new SelectSubmenu(
			label,
			description,
			options,
			currentValue,
			(value: string) => {
				this.callbacks.onChange(path, value, this.getSelectedScope(path));
				done(value);
			},
			() => {
				if (path === "theme") {
					this.callbacks.onThemePreview?.(currentValue);
				}
				done();
			},
			onSelectionChange,
		);
	}

	private createScopeSubmenu(path: string, label: string, done: (value?: string) => void): Container {
		return new SelectSubmenu(
			`${label} Scope`,
			"Choose whether changes write to global or project settings",
			SCOPE_OPTIONS,
			this.getSelectedScope(path),
			(value: string) => {
				this.scopeSelections.set(path, value as SettingsScope);
				this.switchTab(this.activeTab);
				done(value);
			},
			() => done(),
		);
	}

	// ── Tab Rendering ──────────────────────────────────────────────────────

	private addSettingsList(tab: SettingTab): void {
		const paths = settingsRegistry.getPathsForTab(tab);
		const items: SettingItem[] = [];

		for (const path of paths) {
			const def = settingsRegistry.get(path);
			if (!def) continue;
			items.push(...this.defToItems(path, def));
		}

		if (items.length === 0) {
			this.addChild(new Text(theme.fg("dim", "  No settings available"), 0, 0));
			return;
		}

		this.settingsList = new SettingsList(
			items,
			10,
			getSettingsListTheme(),
			(id, newValue) => {
				this.callbacks.onChange(id, newValue, "global");
			},
			this.callbacks.onCancel,
			{ enableSearch: true },
		);

		this.addChild(this.settingsList);
	}

	private switchTab(tab: SettingTab): void {
		// Preserve border children (indices 0 and last)
		// Rebuild everything in between
		this.clear();
		this.activeTab = tab;
		this.settingsList = null;

		// Rebuild: border → header → spacer → settings → spacer → hint → border
		this.addChild(new DynamicBorder());
		this.addChild(new Text(this.renderTabHeader(), 0, 0));
		this.addChild(new Spacer(1));
		this.addSettingsList(tab);
		this.addChild(new Spacer(1));
		this.addChild(new Text(theme.fg("dim", "  Tab/Shift+Tab or ←/→ to switch tabs · Esc to close"), 0, 0));
		this.addChild(new DynamicBorder());
	}

	// ── Input Handling ─────────────────────────────────────────────────────

	getSettingsList(): SettingsList | null {
		return this.settingsList;
	}

	handleInput(data: string): void {
		// Tab switching: Tab/Shift+Tab cycle tabs, Left/Right arrows
		// Only switch tabs when not in a submenu (submenus need their own arrow handling)
		if (
			matchesKey(data, "tab") ||
			matchesKey(data, "shift+tab") ||
			matchesKey(data, "left") ||
			matchesKey(data, "right")
		) {
			const direction = matchesKey(data, "tab") || matchesKey(data, "right") ? 1 : -1;
			const idx = this.activeTabs.indexOf(this.activeTab);
			const nextIdx = idx + direction;
			if (nextIdx >= 0 && nextIdx < this.activeTabs.length) {
				this.switchTab(this.activeTabs[nextIdx]);
			}
			return;
		}

		// Delegate all other input to current settings list
		if (this.settingsList) {
			this.settingsList.handleInput(data);
		}
	}
}
