/**
 * Theme and appearance settings provider.
 * Theme, images, terminal display, editor settings, status line, token display.
 *
 * Upstream comparison (oh-my-pi Appearance tab):
 * ┌───────────────────────────────────┬──────────┬──────────────────────────────┐
 * │ Setting                           │ Upstream │ The Firm                     │
 * ├───────────────────────────────────┼──────────┼──────────────────────────────┤
 * │ theme                             │ ✓ (2)    │ ✓ (1 combined)               │
 * │ theme.dark                        │ ✓        │ ✓                            │
 * │ theme.light                       │ ✓        │ ✓                            │
 * │ terminal.showImages               │ ✓        │ ✓                            │
 * │ images.autoResize                 │ ✓        │ ✓                            │
 * │ images.blockImages                │ ✓        │ ✓                            │
 * │ showHardwareCursor                │ ✗        │ ✓ (The Firm unique)          │
 * │ clearOnShrink                     │ ✗        │ ✓ (The Firm unique)          │
 * │ editorPaddingX                    │ ✗        │ ✓ (The Firm unique)          │
 * │ autocompleteMaxVisible            │ ✗        │ ✓ (The Firm unique)          │
 * └───────────────────────────────────┴──────────┴──────────────────────────────┘
 *
 * Removed settings (no runtime wiring in The Firm's TUI):
 * - statusLine.preset, statusLine.separator, statusLine.showHookStatus
 * - display.tabWidth, display.showTokenUsage
 *
 * Conscious divergences:
 * - theme: The Firm keeps the combined 'theme' setting AND adds theme.dark/theme.light
 *   for per-background-type theme selection (upstream only has the split)
 * - showHardwareCursor/clearOnShrink/editorPaddingX/autocompleteMaxVisible:
 *   The Firm unique TUI configuration options
 */
import { getCapabilities } from "@digi4care/the-firm-tui";
import type { SettingsProvider } from "../../core/settings-registry.js";

export const themeSettings: SettingsProvider = {
	id: "theme",
	settings: {
		// ─── Theme ────────────────────────────────────────────────
		theme: {
			type: "string",
			default: "dark",
			ui: {
				tab: "appearance",
				label: "Theme",
				description: "Color theme for the interface",
				submenu: true,
			},
		},

		"theme.dark": {
			type: "string",
			default: "dark",
			ui: {
				tab: "appearance",
				label: "Dark Theme",
				description: "Theme used when terminal has dark background",
				submenu: true,
			},
		},

		"theme.light": {
			type: "string",
			default: "light",
			ui: {
				tab: "appearance",
				label: "Light Theme",
				description: "Theme used when terminal has light background",
				submenu: true,
			},
		},

		// ─── Images ───────────────────────────────────────────────
		"terminal.showImages": {
			type: "boolean",
			default: true,
			ui: {
				tab: "appearance",
				label: "Show Images",
				description: "Render images inline in terminal",
				condition: () => !!getCapabilities().images,
			},
		},

		"images.autoResize": {
			type: "boolean",
			default: true,
			ui: {
				tab: "appearance",
				label: "Auto-Resize Images",
				description: "Resize large images to 2000x2000 max for better model compatibility",
			},
		},

		"images.blockImages": {
			type: "boolean",
			default: false,
			ui: {
				tab: "appearance",
				label: "Block Images",
				description: "Prevent images from being sent to LLM providers",
			},
		},

		// ─── Editor (The Firm unique) ─────────────────────────────
		showHardwareCursor: {
			type: "boolean",
			default: false,
			ui: {
				tab: "appearance",
				label: "Show Hardware Cursor",
				description: "Show the terminal cursor while still positioning it for IME support",
			},
		},

		clearOnShrink: {
			type: "boolean",
			default: false,
			ui: {
				tab: "appearance",
				label: "Clear on Shrink",
				description: "Clear empty rows when content shrinks (may cause flicker)",
			},
		},

		editorPaddingX: {
			type: "number",
			default: 0,
			ui: {
				tab: "appearance",
				label: "Editor Padding",
				description: "Horizontal padding for input editor (0-3)",
				submenu: true,
			},
		},

		autocompleteMaxVisible: {
			type: "number",
			default: 5,
			ui: {
				tab: "appearance",
				label: "Autocomplete Items",
				description: "Max visible items in autocomplete dropdown (3-20)",
				submenu: true,
			},
		},
	},
	options: {
		editorPaddingX: [
			{ value: "0", label: "None" },
			{ value: "1", label: "1 space" },
			{ value: "2", label: "2 spaces" },
			{ value: "3", label: "3 spaces" },
		],
		autocompleteMaxVisible: [
			{ value: "3", label: "3 items" },
			{ value: "5", label: "5 items" },
			{ value: "7", label: "7 items" },
			{ value: "10", label: "10 items" },
			{ value: "15", label: "15 items" },
			{ value: "20", label: "20 items" },
		],
	},
};
