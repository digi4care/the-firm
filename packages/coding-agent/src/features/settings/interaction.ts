/**
 * Interaction settings provider.
 * Steering, follow-up, transport, startup, changelog, navigation.
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const interactionSettings: SettingsProvider = {
	id: "interaction",
	settings: {
		steeringMode: {
			type: "enum",
			values: ["all", "one-at-a-time"] as const,
			default: "one-at-a-time",
			ui: {
				tab: "interaction",
				label: "Steering Mode",
				description: "How steering messages are sent while agent is working",
			},
		},
		followUpMode: {
			type: "enum",
			values: ["all", "one-at-a-time"] as const,
			default: "one-at-a-time",
			ui: {
				tab: "interaction",
				label: "Follow-Up Mode",
				description: "How follow-up messages are delivered after agent stops",
			},
		},
		transport: {
			type: "enum",
			values: ["sse", "websocket", "auto"] as const,
			default: "sse",
			ui: {
				tab: "interaction",
				label: "Transport",
				description: "Preferred transport for providers that support multiple transports",
			},
		},
		quietStartup: {
			type: "boolean",
			default: false,
			ui: {
				tab: "interaction",
				label: "Quiet Startup",
				description: "Disable verbose printing at startup",
			},
		},
		collapseChangelog: {
			type: "boolean",
			default: false,
			ui: {
				tab: "interaction",
				label: "Collapse Changelog",
				description: "Show condensed changelog after updates",
			},
		},
		doubleEscapeAction: {
			type: "enum",
			values: ["tree", "fork", "none"] as const,
			default: "tree",
			ui: {
				tab: "interaction",
				label: "Double-Escape Action",
				description: "Action when pressing Escape twice with empty editor",
			},
		},
		treeFilterMode: {
			type: "enum",
			values: ["default", "no-tools", "user-only", "labeled-only", "all"] as const,
			default: "default",
			ui: {
				tab: "interaction",
				label: "Tree Filter Mode",
				description: "Default filter when opening /tree",
			},
		},
	},
};
