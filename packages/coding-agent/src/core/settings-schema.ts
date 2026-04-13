/**
 * Declarative settings schema — type definitions for setting definitions,
 * UI metadata, tab structure, and submenu options.
 *
 * Inspired by oh-my-pi's settings-schema.ts but with distributed providers
 * (Registry pattern) instead of a monolithic object.
 *
 * Design patterns: Registry, Strategy, Builder
 * SOLID: OCP (add settings without changing existing code), SRP (each type has one job)
 */

// ═══════════════════════════════════════════════════════════════════════════
// Tab Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type SettingTab = "appearance" | "model" | "interaction" | "context" | "editing" | "tools" | "tasks";

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
	appearance: { label: "Appearance", icon: "◆" },
	model: { label: "Model", icon: "◈" },
	interaction: { label: "Interaction", icon: "◇" },
	context: { label: "Context", icon: "◎" },
	editing: { label: "Editing", icon: "△" },
	tools: { label: "Tools", icon: "□" },
	tasks: { label: "Tasks", icon: "○" },
};

// ═══════════════════════════════════════════════════════════════════════════
// UI Metadata
// ═══════════════════════════════════════════════════════════════════════════

export interface UiMeta {
	/** Which tab this setting appears in */
	tab: SettingTab;
	/** Display label (left side of setting row) */
	label: string;
	/** Description shown when setting is selected */
	description: string;
	/** Show as dropdown submenu instead of inline toggle/cycle */
	submenu?: boolean;
	/** Show a global/project scope selector inside the submenu. */
	scopeSelector?: boolean;
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

export type SettingDef = BooleanDef | StringDef | NumberDef | EnumDef<readonly string[]> | ArrayDef | RecordDef;

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
