/**
 * Tools settings provider.
 * Search, grep, browser, fetch, web search, MCP, async.
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const toolsSettings: SettingsProvider = {
	id: "tools",
	settings: {
		"grep.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Grep",
				description: "Enable the grep tool for content searching",
			},
		},
		"find.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Find",
				description: "Enable the find tool for file searching",
			},
		},
		"fetch.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Read URLs",
				description: "Allow the read tool to fetch and process URLs",
			},
		},
		"browser.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Browser",
				description: "Enable the browser tool for web browsing",
			},
		},
		"browser.headless": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Headless Browser",
				description: "Launch browser in headless mode (disable to show browser UI)",
			},
		},
	},
};
