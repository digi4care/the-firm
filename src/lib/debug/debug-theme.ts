/**
 * debug-theme.ts — Theme-independent color palette for debug UI
 *
 * Uses raw ANSI 24-bit RGB escape codes so the debug dashboard
 * looks consistent regardless of the active pi global theme.
 *
 * Palette: Cyberpunk Debug (high contrast, terminal-friendly)
 */

import type { ColorDef, DebugPalette, EventCategory } from "./types.ts";

// ── Color Helpers ──────────────────────────────────────────────────────────

/** Apply 24-bit foreground color */
export function fg(color: ColorDef, text: string): string {
	return `\x1b[38;2;${color.r};${color.g};${color.b}m${text}\x1b[39m`;
}

/** Apply 24-bit background color */
export function bgColor(color: ColorDef, text: string): string {
	return `\x1b[48;2;${color.r};${color.g};${color.b}m${text}\x1b[49m`;
}

/** Apply foreground + background together */
export function fgBg(fgColor: ColorDef, bgColor: ColorDef, text: string): string {
	return `\x1b[38;2;${fgColor.r};${fgColor.g};${fgColor.b};48;2;${bgColor.r};${bgColor.g};${bgColor.b}m${text}\x1b[39;49m`;
}

/** Bold text */
export function bold(text: string): string {
	return `\x1b[1m${text}\x1b[22m`;
}

/** Dim text (reduced intensity) */
export function dimText(text: string): string {
	return `\x1b[2m${text}\x1b[22m`;
}

/** Create a ColorDef from RGB values */
export function rgb(r: number, g: number, b: number): ColorDef {
	return { r, g, b };
}

// ── The Debug Palette ──────────────────────────────────────────────────────

export const DEBUG_PALETTE: DebugPalette = {
	// Category colors — each event type gets a distinct hue
	session: rgb(139, 233, 253), // cyan — session lifecycle
	agent: rgb(189, 147, 249), // purple — agent loop
	turn: rgb(241, 250, 140), // yellow — turns
	tool: rgb(80, 250, 123), // green — tools
	message: rgb(255, 184, 108), // orange — messages
	hook: rgb(255, 121, 198), // pink — hooks
	model: rgb(98, 214, 243), // sky — model changes
	input: rgb(248, 119, 208), // magenta — input events

	// Status colors
	success: rgb(80, 250, 123), // green
	error: rgb(255, 85, 85), // red
	warning: rgb(241, 250, 140), // yellow
	running: rgb(98, 214, 243), // sky blue
	pending: rgb(139, 148, 158), // gray

	// UI colors
	dim: rgb(88, 88, 112), // muted gray
	text: rgb(205, 214, 244), // light gray
	border: rgb(68, 71, 90), // dark border

	// Backgrounds
	bgPanel: rgb(24, 24, 37), // dark panel
	bgRow: rgb(30, 30, 46), // slightly lighter row
	bgSelected: rgb(49, 50, 68), // selected row
};

// ── Category → Color Mapping ───────────────────────────────────────────────

const CATEGORY_COLORS: Record<EventCategory, ColorDef> = {
	session: DEBUG_PALETTE.session,
	agent: DEBUG_PALETTE.agent,
	turn: DEBUG_PALETTE.turn,
	tool: DEBUG_PALETTE.tool,
	message: DEBUG_PALETTE.message,
	hook: DEBUG_PALETTE.hook,
	model: DEBUG_PALETTE.model,
	input: DEBUG_PALETTE.input,
};

/** Get the color for an event category */
export function categoryColor(category: EventCategory): ColorDef {
	return CATEGORY_COLORS[category] ?? DEBUG_PALETTE.text;
}

/** Format a category label with its color */
export function categoryLabel(category: EventCategory): string {
	return fg(categoryColor(category), category);
}

// ── Status Icons ───────────────────────────────────────────────────────────

export function statusIcon(status: string): string {
	const P = DEBUG_PALETTE;
	switch (status) {
		case "running":
			return fg(P.running, "●");
		case "done":
			return fg(P.success, "✓");
		case "error":
			return fg(P.error, "✗");
		case "blocked":
			return fg(P.warning, "⊘");
		case "pending":
			return fg(P.pending, "○");
		case "idle":
			return fg(P.dim, "—");
		default:
			return fg(P.dim, "?");
	}
}

// ── Formatting Helpers ─────────────────────────────────────────────────────

/** Format milliseconds to human-readable */
export function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	const sec = ms / 1000;
	if (sec < 60) return `${sec.toFixed(1)}s`;
	const min = Math.floor(sec / 60);
	const rem = Math.floor(sec % 60);
	return `${min}m${rem}s`;
}

/** Format a timestamp to HH:MM:SS */
export function formatTime(ts: number): string {
	return new Date(ts).toLocaleTimeString("nl-NL", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}
