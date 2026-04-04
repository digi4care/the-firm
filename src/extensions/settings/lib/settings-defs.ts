/**
 * settings-defs.ts — Declarative UI definitions derived from the schema
 *
 * Inspired by oh-my-pi's settings-defs.ts pattern:
 * - Converts schema entries into UI-ready definitions
 * - boolean → inline toggle
 * - enum (with submenu) → dropdown with options
 * - Pure functions, no TUI/Pi SDK dependencies
 *
 * To add a new setting to /settings:
 * 1. Add it to settings-schema.ts with a `ui` field
 * 2. (Optional) Add option providers here for submenu types
 * 3. Done — it appears in the UI automatically
 */

import {
	getEnumValues,
	getPathsForTab,
	getType,
	getUi,
	SETTING_TABS,
	type SettingPath,
	type SettingTab,
} from "./settings-schema";

// ═══════════════════════════════════════════════════════════════
// UI definition types
// ═══════════════════════════════════════════════════════════════

interface BaseSettingDef {
	path: SettingPath;
	label: string;
	description: string;
	tab: SettingTab;
}

export interface BooleanSettingDef extends BaseSettingDef {
	type: "boolean";
	condition?: () => boolean;
}

export interface EnumSettingDef extends BaseSettingDef {
	type: "enum";
	values: readonly string[];
}

export interface SubmenuSettingDef extends BaseSettingDef {
	type: "submenu";
	options: ReadonlyArray<{ value: string; label: string; description?: string }>;
}

export interface TextInputSettingDef extends BaseSettingDef {
	type: "text";
}

export type SettingDef =
	| BooleanSettingDef
	| EnumSettingDef
	| SubmenuSettingDef
	| TextInputSettingDef;

// ═══════════════════════════════════════════════════════════════
// Submenu option providers — explicit choices for dropdown settings
// ═══════════════════════════════════════════════════════════════

type OptionList = ReadonlyArray<{ value: string; label: string; description?: string }>;
type OptionProvider = (() => OptionList) | OptionList;

const OPTION_PROVIDERS: Partial<Record<SettingPath, OptionProvider>> = {
	"theFirm.symbolPreset": [
		{ value: "emoji", label: "Emoji", description: "Rich emoji icons (default)" },
		{ value: "unicode", label: "Unicode", description: "Standard unicode symbols" },
		{ value: "ascii", label: "ASCII", description: "Maximum compatibility, no special chars" },
	],
	"theFirm.workflows.compactionStrategy": [
		{
			value: "context-full",
			label: "Context-full",
			description: "Samenvatten in huidige sessie, doorgaan in dezelfde context",
		},
		{
			value: "handoff",
			label: "Handoff",
			description:
				"Samenvatting opslaan + notificatie. Start zelf een nieuwe sessie om verder te gaan",
		},
		{ value: "off", label: "Off", description: "Geen automatische compaction" },
	],
	"theFirm.compaction.thresholdPercent": [
		{ value: "-1", label: "Default", description: "Use Pi's built-in threshold" },
		{ value: "50", label: "50%", description: "Compact when half the context is used" },
		{ value: "60", label: "60%", description: "Compact at 60% usage" },
		{ value: "70", label: "70%", description: "Compact at 70% usage" },
		{ value: "80", label: "80%", description: "Compact at 80% usage" },
		{ value: "90", label: "90%", description: "Compact at 90% usage (aggressive)" },
	],
	"theFirm.compaction.thresholdTokens": [
		{ value: "-1", label: "Default", description: "Use Pi's built-in token limit" },
		{ value: "50000", label: "50K tokens", description: "Compact at 50K tokens" },
		{ value: "100000", label: "100K tokens", description: "Compact at 100K tokens" },
		{ value: "150000", label: "150K tokens", description: "Compact at 150K tokens" },
		{ value: "200000", label: "200K tokens", description: "Compact at 200K tokens (most models)" },
	],
	"theFirm.compaction.reserveTokens": [
		{ value: "4096", label: "4K tokens", description: "Minimal context after compaction" },
		{ value: "8192", label: "8K tokens", description: "Small context reserve" },
		{ value: "16384", label: "16K tokens (default)", description: "Standard reserve" },
		{ value: "32768", label: "32K tokens", description: "Large context reserve" },
		{ value: "65536", label: "64K tokens", description: "Very large context reserve" },
	],
	"theFirm.compaction.keepRecentTokens": [
		{ value: "5000", label: "5K tokens", description: "Keep only very recent messages" },
		{ value: "10000", label: "10K tokens", description: "Keep recent messages" },
		{ value: "20000", label: "20K tokens (default)", description: "Standard recent window" },
		{ value: "40000", label: "40K tokens", description: "Large recent window" },
	],
};

// ═══════════════════════════════════════════════════════════════
// Schema → UI conversion
// ═══════════════════════════════════════════════════════════════

function pathToSettingDef(path: SettingPath): SettingDef | null {
	const ui = getUi(path);
	if (!ui) return null;

	const schemaType = getType(path);
	const base = { path, label: ui.label, description: ui.description, tab: ui.tab };

	if (schemaType === "boolean") {
		return { ...base, type: "boolean" };
	}

	if (schemaType === "enum") {
		const values = getEnumValues(path) ?? [];

		if (ui.submenu) {
			const provider = OPTION_PROVIDERS[path];
			if (!provider) return null;
			const options = typeof provider === "function" ? provider() : provider;
			return { ...base, type: "submenu", options };
		}

		return { ...base, type: "enum", values };
	}

	// Numbers with submenu
	if (schemaType === "number" && ui.submenu) {
		const provider = OPTION_PROVIDERS[path];
		if (provider) {
			const options = typeof provider === "function" ? provider() : provider;
			return { ...base, type: "submenu", options };
		}
	}

	// Strings with submenu (theme etc — options injected at runtime)
	if (schemaType === "string" && ui.submenu) {
		const provider = OPTION_PROVIDERS[path];
		if (provider) {
			const options = typeof provider === "function" ? provider() : provider;
			return { ...base, type: "submenu", options };
		}
		return { ...base, type: "submenu", options: [] };
	}

	// Plain string setting — free-text input
	if (schemaType === "string") {
		return { ...base, type: "text" };
	}

	return null;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/** Cache of generated definitions */
let cachedDefs: SettingDef[] | null = null;

/** Get all setting definitions with UI */
export function getAllSettingDefs(): SettingDef[] {
	if (cachedDefs) return cachedDefs;

	const defs: SettingDef[] = [];
	for (const tab of SETTING_TABS) {
		for (const path of getPathsForTab(tab)) {
			const def = pathToSettingDef(path);
			if (def) defs.push(def);
		}
	}
	cachedDefs = defs;
	return defs;
}

/** Get settings for a specific tab */
export function getSettingsForTab(tab: SettingTab): SettingDef[] {
	return getAllSettingDefs().filter((def) => def.tab === tab);
}

/** Get a setting definition by path */
export function getSettingDef(path: SettingPath): SettingDef | undefined {
	return getAllSettingDefs().find((def) => def.path === path);
}
