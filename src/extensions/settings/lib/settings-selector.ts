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
	Container,
	matchesKey,
	type SelectItem,
	SelectList,
	type SettingItem,
	SettingsList,
	Text,
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

function getSelectListTheme(theme: ThemeLike) {
	return {
		selected: (text: string) => theme.fg("accent", text),
		unselected: (text: string) => theme.fg("dim", text),
		cursor: theme.fg("accent", "→ "),
		description: (text: string) => theme.fg("muted", text),
	};
}

// ═══════════════════════════════════════════════════════════════
// Submenu component — dropdown overlay for selecting a value
// ═══════════════════════════════════════════════════════════════

class SubmenuOverlay extends Container {
	#selectList: SelectList;

	constructor(
		title: string,
		options: ReadonlyArray<{ value: string; label: string; description?: string }>,
		currentValue: string,
		theme: ThemeLike,
		onSelect: (value: string) => void,
		onCancel: () => void,
	) {
		super();

		// Title
		this.addChild(new Text(theme.bold(theme.fg("accent", title)), 0, 0));
		this.addChild(new Text("", 0, 0));

		// Build select items
		const items: SelectItem[] = options.map((o) => ({
			value: o.value,
			label: o.description ? `${o.label} — ${o.description}` : o.label,
		}));

		this.#selectList = new SelectList(items, Math.min(items.length, 12), getSelectListTheme(theme));

		// Pre-select current value
		const currentIndex = items.findIndex((o) => o.value === currentValue);
		if (currentIndex !== -1) {
			this.#selectList.setSelectedIndex(currentIndex);
		}

		this.#selectList.onSelect = (item) => {
			onSelect(item.value);
		};
		this.#selectList.onCancel = onCancel;

		this.addChild(this.#selectList);

		// Hint
		this.addChild(new Text(theme.fg("dim", "  Enter to select · Esc to go back"), 0, 0));
	}

	handleInput(data: string): void {
		this.#selectList.handleInput(data);
	}
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
					const overlay = new SubmenuOverlay(
						def.label,
						def.options,
						cv,
						theme,
						(value) => {
							onChange(def.path, value);
							done(value);
						},
						() => done(),
					);
					return overlay;
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

			if (data === "\x1b" || data === "\x1b\x1b") {
				onCancel();
				return;
			}

			if (currentList) {
				currentList.handleInput(data);
			}
		},
	};
}
