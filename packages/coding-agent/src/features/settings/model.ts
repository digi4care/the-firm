/**
 * Model settings provider.
 * Thinking level, thinking display, retry behavior.
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const modelSettings: SettingsProvider = {
	id: "model",
	settings: {
		defaultThinkingLevel: {
			type: "enum",
			values: ["off", "minimal", "low", "medium", "high", "xhigh"] as const,
			default: "high",
			ui: {
				tab: "model",
				label: "Thinking Level",
				description: "Reasoning depth for thinking-capable models",
				submenu: true,
			},
		},
		hideThinkingBlock: {
			type: "boolean",
			default: false,
			ui: {
				tab: "model",
				label: "Hide Thinking",
				description: "Hide thinking blocks in assistant responses",
			},
		},
		"retry.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "model",
				label: "Auto-Retry",
				description: "Automatically retry on transient API errors",
			},
		},
		"retry.maxRetries": {
			type: "number",
			default: 3,
			ui: {
				tab: "model",
				label: "Retry Attempts",
				description: "Maximum retry attempts on API errors",
				submenu: true,
			},
		},
		"retry.baseDelayMs": {
			type: "number",
			default: 2000,
		},
		"retry.maxDelayMs": {
			type: "number",
			default: 60000,
		},
		thinkingBudgets: {
			type: "record",
			default: {} as Record<string, number>,
		},
	},
	options: {
		"retry.maxRetries": [
			{ value: "1", label: "1 retry" },
			{ value: "2", label: "2 retries" },
			{ value: "3", label: "3 retries", description: "Default" },
			{ value: "5", label: "5 retries" },
		],
	},
};
