/**
 * settings-selector.ts — The Firm settings selector TUI component
 *
 * Uses pi-tui's SettingsList for settings rendering.
 * Submenu settings (thresholds, tokens) get a SelectList dropdown overlay.
 * Tab bar is rendered inline.
 *
 * Pure component — receives settings as input, calls onChange/onCancel.
 */

import {
	matchesKey,
	type SelectItem,
	type SelectListTheme,
	SelectList,
	type SettingItem,
	SettingsList,
	truncateToWidth,
} from "@mariozechner/pi-tui";
import { getSettingsForTab, type SettingDef, type SubmenuSettingDef } from "./settings-defs";
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
	settings: Map<string, string>;
	theme: ThemeLike;
	onChange: (path: string, newValue: string) => void;
	onCancel: () => void;
}

// ═══════════════════════════════════════════════════════════════
// Inline tab bar rendering
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
// Theme helpers
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

function getSelectListTheme(theme: ThemeLike): SelectListTheme {
	return {
		selectedPrefix: (text: string) => theme.fg("accent", text),
		selectedText: (text: string) => theme.fg("accent", text),
		description: (text: string) => theme.fg("muted", text),
		scrollInfo: (text: string) => theme.fg("dim", text),
		noMatch: (text: string) => theme.fg("dim", text),
	};
}

// ═══════════════════════════════════════════════════════════════
// Setting def → SettingItem conversion
// ═══════════════════════════════════════════════════════════════

function getDefaultDisplay(def: SettingDef): string {
	const val = getDefault(def.path as SettingPath);
	if (typeof val === "boolean") return val ? "true" : "false";
	return String(val ?? "");
}

function defToSettingItem(
	def: SettingDef,
	currentValue: string,
	theme: ThemeLike,
	onChange: (path: string, newValue: string) => void,
): SettingItem | null {
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
				submenu: (cv, done) => {
					const selectItems: SelectItem[] = def.options.map((o) => ({
						value: o.value,
						label: o.label,
						description: o.description,
					}));

					const selectList = new SelectList(
						selectItems,
						Math.min(selectItems.length, 10),
						getSelectListTheme(theme),
					);

					const currentIndex = selectItems.findIndex((o) => o.value === cv);
					if (currentIndex !== -1) {
						selectList.setSelectedIndex(currentIndex);
					}

					selectList.onSelect = (item) => {
						onChange(def.path, item.value);
						done(item.value);
					};

					selectList.onCancel = () => {
						done();
					};

					return selectList;
				},
			};

		default:
			return null;
	}
}

// ═══════════════════════════════════════════════════════════════
// Component factory
// ═══════════════════════════════════════════════════════════════

function buildListForTab(
	tabId: SettingTab,
	settings: Map<string, string>,
	listTheme: ReturnType<typeof getSettingsListTheme>,
	theme: ThemeLike,
	onChange: (path: string, newValue: string) => void,
	onCancel: () => void,
): SettingsList {
	const defs = getSettingsForTab(tabId);
	const items: SettingItem[] = [];

	for (const def of defs) {
		const value = settings.get(def.path) ?? getDefaultDisplay(def);
		const item = defToSettingItem(def, value, theme, onChange);
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

export function createSettingsSelector(options: SettingsSelectorOptions) {
	const { settings, theme, onChange, onCancel } = options;
	const listTheme = getSettingsListTheme(theme);

	let currentTabIndex = 0;
	let currentList = buildListForTab(
		SETTING_TABS[0]!,
		settings,
		listTheme,
		theme,
		onChange,
		onCancel,
	);

	return {
		render(width: number): string[] {
			const lines: string[] = [];
			lines.push(...renderTabBar(theme, currentTabIndex, width));
			lines.push("");

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
					theme,
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
					theme,
					onChange,
					onCancel,
				);
				return;
			}

			// Escape → cancel (only if not in submenu — SettingsList handles submenu escape)
			if (data === "\x1b" || data === "\x1b\x1b") {
				onCancel();
				return;
			}

			// Everything else → settings list (handles up/down/enter/submenu)
			if (currentList) {
				currentList.handleInput(data);
			}
		},
	};
}
