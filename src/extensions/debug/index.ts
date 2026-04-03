/**
 * debug-dashboard — Pi extension for real-time lifecycle debugging
 *
 * Provides:
 *   - Compact widget above the editor (always visible)
 *   - /debug command opening a full overlay dashboard
 *
 * Tracks: session, agent, turns, tools, messages, hooks, model, input
 *
 * Usage: loaded via .pi/settings.json → extensions array (after sync)
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { CompactWidget } from "./compact-widget.ts";
import { DebugOverlay } from "./debug-overlay.ts";
import { EventCollector } from "./event-collector.ts";

/** Events that trigger a widget re-render */
const REFRESH_EVENTS = [
	"agent_start",
	"agent_end",
	"turn_start",
	"turn_end",
	"tool_execution_start",
	"tool_execution_end",
	"tool_call",
	"user_bash",
	"context",
	"before_provider_request",
] as const;

export default function debugDashboard(pi: ExtensionAPI) {
	const collector = new EventCollector(pi);
	const widget = new CompactWidget(() => collector.state);
	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let widgetCtx: ExtensionContext | undefined;

	// Start collector immediately to catch all events
	collector.start();

	// ── Session start: activate widget ────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		widgetCtx = ctx;
		applyWidget(ctx, widget);

		// Periodic refresh for live durations
		refreshTimer = setInterval(() => {
			widget.invalidate();
			if (widgetCtx) applyWidget(widgetCtx, widget);
		}, 500);
	});

	// ── /debug command: open overlay ──────────────────────────────────────

	pi.registerCommand("tf-debug", {
		description: "Open debug dashboard overlay (--detail for expanded view)",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) return;

			const detail = args.includes("--detail") || args.includes("-d");

			await ctx.ui.custom<void>(
				(tui, _theme, _keybindings, done) => {
					const overlay = new DebugOverlay(
						() => collector.state,
						() => done(undefined),
						detail,
					);

					return {
						render: (width: number, height: number) => {
							return overlay.render(width, height);
						},
						invalidate: () => overlay.invalidate(),
						handleInput: (data: string) => {
							overlay.handleInput(data, () => tui.requestRender());
						},
					};
				},
				{
					overlay: true,
					overlayOptions: {
						width: "80%",
						anchor: "center",
						maxHeight: "80%",
					},
				},
			);
		},
	});

	// ── Auto-refresh on key events ────────────────────────────────────────

	for (const eventName of REFRESH_EVENTS) {
		pi.on(eventName, () => {
			widget.invalidate();
			if (widgetCtx) applyWidget(widgetCtx, widget);
		});
	}

	// ── Cleanup on shutdown ───────────────────────────────────────────────

	pi.on("session_shutdown", () => {
		if (refreshTimer) {
			clearInterval(refreshTimer);
			refreshTimer = undefined;
		}
	});
}

// ── Widget Helper ─────────────────────────────────────────────────────────

function applyWidget(ctx: ExtensionContext, widget: CompactWidget): void {
	if (!ctx.hasUI) return;

	ctx.ui.setWidget(
		"debug-dashboard",
		(_tui, theme) => ({
			render: (width: number) => {
				const lines = widget.render(width);
				// Add background to make it non-transparent
				return lines.map(line => line.padEnd(width));
			},
			invalidate: () => widget.invalidate(),
		}),
		{ placement: "belowEditor" }
	);
}
