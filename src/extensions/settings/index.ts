/**
 * The Firm Settings Extension
 *
 * Registers /firm command with a tabbed TUI settings panel.
 * Restores The Firm settings from .pi/settings.json on session start.
 *
 * Usage: /firm
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createSettingsSelector } from "./lib/settings-selector";
import { getSettingsMap, setSetting } from "./lib/settings-store";

export default function registerSettingsExtension(pi: ExtensionAPI) {
	// Restore settings on session start
	pi.on("session_start", async (_event, _ctx) => {
		// Settings are read on-demand from .pi/settings.json
		// This hook is here for future use (e.g., migrating old settings)
	});

	// Register /firm command
	pi.registerCommand("firm", {
		description: "Open The Firm settings panel (tabs: general, guards, workflows, session)",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Settings requires interactive mode", "warning");
				return;
			}

			const settings = getSettingsMap();

			await ctx.ui.custom((_tui, theme, _keybindings, done) => {
				return createSettingsSelector({
					settings,
					theme,
					onChange: (path, newValue) => {
						// Convert string back to appropriate type
						const boolValue = newValue === "true" || newValue === "false";
						setSetting(path, boolValue ? newValue === "true" : newValue);
					},
					onCancel: () => done(undefined),
				});
			});
		},
	});
}
