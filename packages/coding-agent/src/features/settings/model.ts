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
		"providerLogging.level": {
			type: "enum",
			values: ["off", "debug", "info", "warn", "error"] as const,
			default: "off",
			ui: {
				tab: "model",
				label: "Provider Logging",
				description: "Structured provider/model tracing written per session to project log files",
				submenu: true,
				scopeSelector: true,
			},
		},
		"thinkingBudgets.minimal": {
			type: "number",
			default: 1024,
		},
		"thinkingBudgets.low": {
			type: "number",
			default: 2048,
		},
		"thinkingBudgets.medium": {
			type: "number",
			default: 8192,
		},
		"thinkingBudgets.high": {
			type: "number",
			default: 16384,
		},
		"thinkingBudgets.xhigh": {
			type: "number",
			default: 32768,
		},
	},
	options: {
		"retry.maxRetries": [
			{ value: "1", label: "1 retry" },
			{ value: "2", label: "2 retries" },
			{ value: "3", label: "3 retries", description: "Default" },
			{ value: "5", label: "5 retries" },
		],
		"providerLogging.level": [
			{ value: "off", label: "off", description: "Disable provider logging" },
			{ value: "debug", label: "debug", description: "Log full provider tracing details" },
			{ value: "info", label: "info", description: "Log provider lifecycle and request summaries" },
			{ value: "warn", label: "warn", description: "Log retries, mappings, and warnings" },
			{ value: "error", label: "error", description: "Log provider failures only" },
		],
	},
};
