/**
 * Compaction settings provider.
 * Context maintenance, compaction strategy, handoff behavior.
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const compactionSettings: SettingsProvider = {
	id: "compaction",
	settings: {
		"compaction.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "context",
				label: "Auto-Compact",
				description: "Automatically compact context when it gets too large",
			},
		},
		"compaction.strategy": {
			type: "enum",
			values: ["context-full", "handoff", "off"] as const,
			default: "context-full",
			ui: {
				tab: "context",
				label: "Compaction Strategy",
				description: "How to reduce context: summarize in-place or generate handoff and start a new session",
				submenu: true,
			},
		},
		"compaction.handoffAutoContinue": {
			type: "boolean",
			default: true,
			ui: {
				tab: "context",
				label: "Handoff Auto-Continue",
				description: "After handoff, automatically prompt the agent to continue working in the new session",
			},
		},
		"compaction.handoffSaveToDisk": {
			type: "boolean",
			default: false,
			ui: {
				tab: "context",
				label: "Save Handoff Docs",
				description: "Save generated handoff documents to markdown files",
			},
		},
		"compaction.reserveTokens": {
			type: "number",
			default: 16384,
		},
		"compaction.keepRecentTokens": {
			type: "number",
			default: 20000,
		},
	},
	options: {
		"compaction.strategy": [
			{ value: "context-full", label: "Context-full", description: "Summarize in-place and keep the current session" },
			{ value: "handoff", label: "Handoff", description: "Generate handoff and continue in a new session" },
			{ value: "off", label: "Off", description: "Disable automatic context maintenance" },
		],
	},
};
