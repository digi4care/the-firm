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
			default: 90,
			ui: {
				tab: "context",
				label: "Compaction Threshold",
				description: "Percent threshold for context maintenance; default is 90%",
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
			{ value: 30, label: "30% — Very early", description: "Handoff early; safest for long sessions" },
			{ value: 35, label: "35% — Early", description: "Conservative threshold for large tasks" },
			{ value: 40, label: "40% — Moderately early", description: "Plenty of headroom for context growth" },
			{ value: 45, label: "45% — Cautious", description: "Safe balance for complex work" },
			{ value: 50, label: "50% — Halfway", description: "Compact when half the window is used" },
			{ value: 55, label: "55% — Moderate", description: "Predictable mid-point threshold" },
			{ value: 60, label: "60% — Comfortable", description: "Good room for conversation bursts" },
			{ value: 65, label: "65% — Relaxed", description: "Lets sessions grow before handoff" },
			{ value: 70, label: "70% — Balanced", description: "Typical balance of space and safety" },
			{ value: 75, label: "75% — Slightly aggressive", description: "Prefer keeping context over headroom" },
			{ value: 80, label: "80% — Aggressive", description: "Use most of the window before handoff" },
			{ value: 85, label: "85% — Very aggressive", description: "Push context usage close to the limit" },
			{
				value: 90,
				label: "90% — Near limit (default)",
				description: "Default: handoff when context is nearly full",
			},
			{ value: 95, label: "95% — Maximum", description: "Wait until the very edge of the window" },
		],
	},
};
