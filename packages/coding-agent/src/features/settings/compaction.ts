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
		"compaction.thresholdPercent": {
			type: "number",
			default: -1,
			ui: {
				tab: "context",
				label: "Compaction Threshold",
				description: "Percent threshold for context maintenance; set to Default to use legacy reserve-based behavior",
				submenu: true,
			},
		},
		"compaction.thresholdTokens": {
			type: "number",
			default: -1,
			ui: {
				tab: "context",
				label: "Compaction Token Limit",
				description: "Fixed token limit for context maintenance; overrides percentage if set",
				submenu: true,
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
			{
				value: "context-full",
				label: "Context-full",
				description: "Summarize in-place and keep the current session",
			},
			{ value: "handoff", label: "Handoff", description: "Generate handoff and continue in a new session" },
			{ value: "off", label: "Off", description: "Disable automatic context maintenance" },
		],
		"compaction.thresholdPercent": [
			{ value: -1, label: "Default", description: "Use legacy reserve-based behavior" },
			{ value: 30, label: "30%", description: "Compact at 30% of context window" },
			{ value: 35, label: "35%", description: "Compact at 35% of context window" },
			{ value: 40, label: "40%", description: "Compact at 40% of context window" },
			{ value: 45, label: "45%", description: "Compact at 45% of context window" },
			{ value: 50, label: "50%", description: "Compact at 50% of context window" },
			{ value: 55, label: "55%", description: "Compact at 55% of context window" },
			{ value: 60, label: "60%", description: "Compact at 60% of context window" },
			{ value: 65, label: "65%", description: "Compact at 65% of context window" },
			{ value: 70, label: "70%", description: "Compact at 70% of context window" },
			{ value: 75, label: "75%", description: "Compact at 75% of context window" },
			{ value: 80, label: "80%", description: "Compact at 80% of context window" },
			{ value: 85, label: "85%", description: "Compact at 85% of context window" },
			{ value: 90, label: "90%", description: "Compact at 90% of context window" },
			{ value: 95, label: "95%", description: "Compact at 95% of context window" },
		],
	},
};
