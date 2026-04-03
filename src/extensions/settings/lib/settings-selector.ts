/**
 * settings-selector.ts — The Firm settings selector TUI component
 *
 * Uses pi-tui's SettingsList for settings rendering.
 * Tab bar is rendered inline (no TabBar component in our pi-tui version).
 *
 * Pure component — receives settings as input, calls onChange/onCancel.
 * No direct file I/O or Pi SDK dependencies.
 */

import { matchesKey, type SettingItem, SettingsList, truncateToWidth } from "@mariozechner/pi-tui";
import { getSettingsForTab, type SettingDef } from "./settings-defs";
import {
	getDefault,
	SETTING_TABS,
	type SettingPath,
	type SettingTab,
	TAB_METADATA,
} from "./settings-schema";
import { getTabIcons } from "../../../shared/symbols";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

interface ThemeLike {
	fg: (color: string, text: string) => string;
	bold: (text: string) => string;
}

export interface SettingsSelectorOptions {
	/** Current setting values: path → display value (string) */
	settings: Map<string, string>;
	/** Theme object from ctx.ui.custom() callback */
	theme: ThemeLike;
	/** Called when a setting value changes */
	onChange: (path: string, newValue: string) => void;
	/** Called when user presses Escape */
	onCancel: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Inline tab bar rendering (TabBar not exported in our pi-tui)
// ═══════════════════════════════════════════════════════════════

function renderTabBar(theme: ThemeLike, activeIndex: number, width: number): string[] {
	const chunks: string[] = [theme.fg("muted", "Settings:"), "  "];
	const icons = getTabIcons();

	for (let i = 0; i < SETTING_TABS.length; i++) {
		const meta = TAB_METADATA[SETTING_TABS[i]!];
		const icon = icons[SETTING_TABS[i]!] ?? meta.icon;
		if (i === activeIndex) {
			chunks.push(theme.fg("accent", theme.bold(` ${icon} ${meta.label} `)));
		} else {
			chunks.push(theme.fg("dim", ` ${icon} ${meta.label} `));
		}
		if (i < SETTING_TABS.length - 1) {
			chunks.push("  ");
		}
	}

	chunks.push("  ");
	chunks.push(theme.fg("dim", "(tab to cycle)"));

	const line = chunks.join("");
	return [truncateToWidth(line, width)];
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function getSettingsListTheme(theme: ThemeLike) {
	return {
		label: (text: string, selected: boolean) => (selected ? theme.fg("accent", text) : text),
		value: (text: string, selected: boolean) =>
			selected ? theme.fg("accent", text) : theme.fg("dim", text),
		description: (text: string) => theme.fg("muted", text),
		cursor: theme.fg("accent", "→ "),
		hint: (text: string) => theme.fg("dim", text),
	};
}

function defToSettingItem(def: SettingDef, currentValue: string): SettingItem | null {
	switch (def.type) {
		case "boolean":
			return {
				id: def.path,
				label: def.label,
				description: def.description,
				currentValue,
				values: ["true", "false"],
			};
		case "enum":
			return {
				id: def.path,
				label: def.label,
				description: def.description,
				currentValue,
				values: [...def.values],
			};
		case "submenu":
			return {
				id: def.path,
				label: def.label,
				description: def.description,
				currentValue,
				values: def.options.map((o) => o.value),
			};
		case "text":
			return {
				id: def.path,
				label: def.label,
				description: def.description,
				currentValue,
			};
		default:
			return null;
	}
}

function getDefaultDisplay(def: SettingDef): string {
	const val = getDefault(def.path as SettingPath);
	if (typeof val === "boolean") return val ? "true" : "false";
	return String(val ?? "");
}

function buildListForTab(
	tabId: SettingTab,
	settings: Map<string, string>,
	listTheme: ReturnType<typeof getSettingsListTheme>,
	onChange: (path: string, newValue: string) => void,
	onCancel: () => void,
): SettingsList {
	const defs = getSettingsForTab(tabId);
	const items: SettingItem[] = [];

	for (const def of defs) {
		const value = settings.get(def.path) ?? getDefaultDisplay(def);
		const item = defToSettingItem(def, value);
		if (item) items.push(item);
	}

	return new SettingsList(
		items,
		Math.min(items.length + 2, 15),
		listTheme,
		(id, newValue) => {
			settings.set(id, newValue);
			onChange(id, newValue);
		},
		() => onCancel(),
	);
}

// ═══════════════════════════════════════════════════════════════
// Component factory
// ═══════════════════════════════════════════════════════════════

export function createSettingsSelector(options: SettingsSelectorOptions) {
	const { settings, theme, onChange, onCancel } = options;
	const listTheme = getSettingsListTheme(theme);

	let currentTabIndex = 0;
	let currentList = buildListForTab(SETTING_TABS[0]!, settings, listTheme, onChange, onCancel);

	return {
		render(width: number): string[] {
			const lines: string[] = [];

			// Tab bar
			lines.push(...renderTabBar(theme, currentTabIndex, width));
			lines.push("");

			// Settings list
			if (currentList) {
				lines.push(...currentList.render(width));
			}

			return lines;
		},

		invalidate(): void {
			currentList?.invalidate();
		},

		handleInput(data: string): void {
			// Tab / Right → next tab
			if (matchesKey(data, "tab") || matchesKey(data, "right")) {
				currentTabIndex = (currentTabIndex + 1) % SETTING_TABS.length;
				currentList = buildListForTab(
					SETTING_TABS[currentTabIndex]!,
					settings,
					listTheme,
					onChange,
					onCancel,
				);
				return;
			}

			// Shift+Tab / Left → previous tab
			if (matchesKey(data, "shift+tab") || matchesKey(data, "left")) {
				currentTabIndex = (currentTabIndex - 1 + SETTING_TABS.length) % SETTING_TABS.length;
				currentList = buildListForTab(
					SETTING_TABS[currentTabIndex]!,
					settings,
					listTheme,
					onChange,
					onCancel,
				);
				return;
			}

			// Escape → cancel
			if (data === "\x1b" || data === "\x1b\x1b") {
				onCancel();
				return;
			}

			// Everything else → settings list
			if (currentList) {
				currentList.handleInput(data);
			}
		},
	};
}
