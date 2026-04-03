/**
 * symbols.ts — The Firm symbol presets
 *
 * Provides themed symbols for The Firm UI (settings tabs, status, etc.)
 * Controlled by theFirm.symbolPreset setting: "emoji" | "unicode" | "ascii"
 */

import { getSetting } from "../extensions/settings/lib/settings-store";

type SymbolKey =
	| "tab.general"
	| "tab.guards"
	| "tab.workflows"
	| "tab.session"
	| "status.success"
	| "status.warning"
	| "status.error"
	| "status.info";

type SymbolPreset = Record<SymbolKey, string>;

const EMOJI: SymbolPreset = {
	"tab.general": "⚙️",
	"tab.guards": "🛡️",
	"tab.workflows": "📋",
	"tab.session": "💾",
	"status.success": "✅",
	"status.warning": "⚠️",
	"status.error": "❌",
	"status.info": "ℹ️",
};

const UNICODE: SymbolPreset = {
	"tab.general": "◆",
	"tab.guards": "▣",
	"tab.workflows": "▸",
	"tab.session": "●",
	"status.success": "✓",
	"status.warning": "△",
	"status.error": "✗",
	"status.info": "○",
};

const ASCII: SymbolPreset = {
	"tab.general": "[*]",
	"tab.guards": "[!]",
	"tab.workflows": "[>]",
	"tab.session": "[#]",
	"status.success": "[OK]",
	"status.warning": "[!!]",
	"status.error": "[XX]",
	"status.info": "[i]",
};

const PRESETS: Record<string, SymbolPreset> = {
	emoji: EMOJI,
	unicode: UNICODE,
	ascii: ASCII,
};

/** Get a symbol for the given key, using the current preset from settings */
export function getSymbol(key: SymbolKey): string {
	const presetName = getSetting("theFirm.symbolPreset") ?? "emoji";
	const preset = PRESETS[String(presetName)] ?? PRESETS["emoji"]!;
	return preset[key] ?? key;
}

/** Get all tab icons for the current preset */
export function getTabIcons(): Record<string, string> {
	return {
		general: getSymbol("tab.general"),
		guards: getSymbol("tab.guards"),
		workflows: getSymbol("tab.workflows"),
		session: getSymbol("tab.session"),
	};
}
