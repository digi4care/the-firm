/**
 * Theme Switcher — Switch Pi themes with color swatch preview
 *
 * Commands:
 *   /theme          — Open select picker to choose a theme
 *   /theme <name>   — Switch directly by name
 *
 * Features:
 *   - Color swatch widget appears after switch (3 seconds)
 *   - Shows theme name + color blocks (success, accent, warning, dim, muted)
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

export default function (pi: ExtensionAPI) {
	let swatchTimer: ReturnType<typeof setTimeout> | null = null;

	function showSwatch(ctx: ExtensionContext) {
		if (!ctx.hasUI) return;

		// Clear existing timer
		if (swatchTimer) {
			clearTimeout(swatchTimer);
			swatchTimer = null;
		}

		ctx.ui.setWidget(
			"theme-swatch",
			(_tui, theme) => ({
				invalidate() {},
				render(width: number): string[] {
					const block = "\u2588\u2588\u2588";
					const swatch =
						(theme.fg("success", block) ?? "") +
						" " +
						(theme.fg("accent", block) ?? "") +
						" " +
						(theme.fg("warning", block) ?? "") +
						" " +
						(theme.fg("dim", block) ?? "") +
						" " +
						(theme.fg("muted", block) ?? "");
					const label =
						(theme.fg("accent", " 🎨 ") ?? "") +
						(theme.fg("muted", ctx.ui.theme.name ?? "unknown") ?? "") +
						"  " +
						swatch;
					const border = theme.fg("borderMuted", "─".repeat(Math.max(0, width))) ?? "";
					return [border, truncateToWidth(`  ${label}`, width), border];
				},
			}),
			{ placement: "belowEditor" },
		);

		// Auto-dismiss after 3 seconds
		swatchTimer = setTimeout(() => {
			ctx.ui.setWidget("theme-swatch", undefined);
			swatchTimer = null;
		}, 3000);
	}

	function switchTheme(ctx: ExtensionContext, themeName: string): boolean {
		if (!ctx.hasUI) return false;

		const result = ctx.ui.setTheme(themeName);
		if (result.success) {
			showSwatch(ctx);
			ctx.ui.notify(`Theme: ${themeName}`, "info");
			return true;
		} else {
			ctx.ui.notify(`Theme not found: ${themeName}`, "error");
			return false;
		}
	}

	pi.registerCommand("theme", {
		description: "Switch theme: /theme or /theme <name>",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) return;

			const themes = ctx.ui.getAllThemes();
			const arg = args.trim();

			// Direct switch by name
			if (arg) {
				switchTheme(ctx, arg);
				return;
			}

			// Interactive select
			const items = themes.map((t) => {
				const active = t.name === ctx.ui.theme.name ? " ✓" : "";
				const source = t.path ? "custom" : "built-in";
				return `${t.name}${active} (${source})`;
			});

			const selected = await ctx.ui.select("Select Theme", items);
			if (!selected) return;

			const selectedName = selected.split(" ")[0];
			switchTheme(ctx, selectedName);
		},
	});

	pi.on("session_shutdown", async () => {
		if (swatchTimer) {
			clearTimeout(swatchTimer);
			swatchTimer = null;
		}
	});
}
