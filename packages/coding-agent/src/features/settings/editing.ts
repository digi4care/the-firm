/**
 * Editing settings provider.
 * Edit mode, line numbers, hash lines, LSP, bash interceptor, python.
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const editingSettings: SettingsProvider = {
	id: "editing",
	settings: {
		"edit.mode": {
			type: "enum",
			values: ["replace", "patch", "hashline", "chunk"] as const,
			default: "hashline",
			ui: {
				tab: "editing",
				label: "Edit Mode",
				description: "Select the edit tool variant",
			},
		},
		"readLineNumbers": {
			type: "boolean",
			default: false,
			ui: {
				tab: "editing",
				label: "Line Numbers",
				description: "Prepend line numbers to read tool output by default",
			},
		},
		"readHashLines": {
			type: "boolean",
			default: true,
			ui: {
				tab: "editing",
				label: "Hash Lines",
				description: "Include line hashes in read output for hashline edit mode",
			},
		},
	},
};
