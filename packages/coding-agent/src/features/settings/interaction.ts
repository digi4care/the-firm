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

		// ─── Steering interrupt mode ──────────────────────────────
		interruptMode: {
			type: "enum",
			values: ["immediate", "wait"] as const,
			default: "immediate",
			ui: {
				tab: "interaction",
				label: "Interrupt Mode",
				description: "When steering messages interrupt tool execution (immediate or wait for completion)",
				submenu: true,
			},
		},

		// ─── Startup ──────────────────────────────────────────────
		"startup.checkUpdate": {
			type: "boolean",
			default: true,
			ui: {
				tab: "interaction",
				label: "Check for Updates",
				description: "Check for updates on startup (disable for faster startup or offline usage)",
			},
		},

		// ─── Notifications ────────────────────────────────────────
		"completion.notify": {
			type: "boolean",
			default: true,
			ui: {
				tab: "interaction",
				label: "Completion Notifications",
				description: "Show notification when agent completes a task",
			},
		},

		"ask.notify": {
			type: "boolean",
			default: true,
			ui: {
				tab: "interaction",
				label: "Ask Notifications",
				description: "Show notification when agent asks a question",
			},
		},

		"ask.timeout": {
			type: "number",
			default: 30,
			ui: {
				tab: "interaction",
				label: "Ask Timeout",
				description: "Seconds to wait for user response (0 = no timeout)",
				submenu: true,
			},
		},

		// ─── Speech-to-text ───────────────────────────────────────
		"stt.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "interaction",
				label: "Speech to Text",
				description: "Enable speech-to-text input via Whisper",
			},
		},

		"stt.language": {
			type: "string",
			default: "en",
			ui: {
				tab: "interaction",
				label: "STT Language",
				description: "Language code for speech-to-text (e.g., en, nl, de)",
				submenu: true,
			},
		},

		"stt.modelName": {
			type: "enum",
			values: ["tiny", "tiny.en", "base", "base.en", "small", "small.en", "medium", "medium.en", "large"] as const,
			default: "base.en",
			ui: {
				tab: "interaction",
				label: "STT Model",
				description: "Whisper model size for speech-to-text",
				submenu: true,
			},
		},
	},
};
