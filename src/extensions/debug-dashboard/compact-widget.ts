/**
 * compact-widget.ts — Always-visible status widget above the editor
 *
 * Shows a compact single-line summary:
 *   ● agent-phase | model | turn N | tools: N running | events: N
 *
 * Uses raw ANSI colors from debug-theme so it's theme-independent.
 */

import { DEBUG_PALETTE, fg, formatDuration, statusIcon } from "../../lib/debug/debug-theme.ts";
import type { DashboardState } from "../../lib/debug/types.ts";

export class CompactWidget {
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(private readonly getState: () => DashboardState) {}

	/** Render the widget lines */
	public render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const state = this.getState();
		const P = DEBUG_PALETTE;

		const parts: string[] = [];

		// Phase icon
		const phaseIcon = statusIcon(state.agent.phase);
		parts.push(phaseIcon);

		// Phase label
		const phaseLabel = this.phaseLabel(state.agent.phase);
		parts.push(fg(P.text, phaseLabel));

		// Separator
		parts.push(fg(P.dim, "│"));

		// Model
		if (state.agent.model) {
			const shortModel = state.agent.model.split("/").pop() ?? state.agent.model;
			parts.push(fg(P.agent, shortModel));
		}

		// Turn info
		if (state.agent.totalTurns > 0) {
			parts.push(fg(P.dim, "turn"));
			parts.push(fg(P.turn, `${state.agent.turnIndex + 1}/${state.agent.totalTurns}`));
		}

		// Active hook
		if (state.activeHook) {
			const hookDur = formatDuration(Date.now() - state.activeHook.startedAt);
			parts.push(fg(P.dim, "hook"));
			parts.push(fg(P.hook, state.activeHook.name));
			parts.push(fg(P.dim, hookDur));
		}

		// Active tools
		const runningTools = this.countRunningTools(state);
		const totalTools = state.activeTools.size;
		if (totalTools > 0) {
			parts.push(fg(P.dim, "tools"));
			if (runningTools > 0) {
				parts.push(fg(P.running, `${runningTools}●`));
				parts.push(fg(P.dim, "/"));
				parts.push(fg(P.tool, `${totalTools}`));
			} else {
				parts.push(fg(P.tool, `${totalTools}`));
			}
		}

		// Events counter
		parts.push(fg(P.dim, "evt"));
		parts.push(fg(P.text, `${state.totalEventCount}`));

		// Duration
		if (state.agent.startedAt && state.agent.phase !== "idle") {
			const elapsed = Date.now() - state.agent.startedAt;
			parts.push(fg(P.dim, formatDuration(elapsed)));
		}

		const line = parts.join(" ");

		// Truncate to width
		this.cachedLines = [this.truncateAnsi(line, width)];
		this.cachedWidth = width;
		return this.cachedLines;
	}

	/** Invalidate cached render (call when state changes) */
	public invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	/** Render as a function compatible with ctx.ui.setWidget() */
	public asRenderFunction = (): string[] => {
		// Use a default width of 120 — will be overridden by actual widget render
		return this.render(120);
	};

	// ── Helpers ───────────────────────────────────────────────────────────

	private phaseLabel(phase: string): string {
		switch (phase) {
			case "idle":
				return "idle";
			case "starting":
				return "starting";
			case "running":
				return "running";
			case "turn":
				return "in turn";
			case "ending":
				return "ending";
			default:
				return phase;
		}
	}

	private countRunningTools(state: DashboardState): number {
		let count = 0;
		for (const tool of state.activeTools.values()) {
			if (tool.status === "running") count++;
		}
		return count;
	}

	private truncateAnsi(text: string, maxWidth: number): string {
		// Simple approach: if visible length exceeds width, slice the raw string
		// For a more robust solution we'd use visibleWidth from pi-tui
		const visibleLen = text.replace(/\x1b\[[0-9;]*m/g, "").length;
		if (visibleLen <= maxWidth) return text;

		// Trim from the front, keeping ANSI codes intact
		let pos = 0;
		let visible = 0;
		const target = visibleLen - maxWidth;
		while (pos < text.length && visible < target) {
			if (text[pos] === "\x1b") {
				// Skip ANSI escape sequence
				const semiPos = text.indexOf("m", pos);
				if (semiPos !== -1) {
					pos = semiPos + 1;
				} else {
					pos++;
				}
			} else {
				visible++;
				pos++;
			}
		}
		return text.slice(pos);
	}
}
