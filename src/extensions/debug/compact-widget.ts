/**
 * compact-widget.ts — Always-visible status widget above the editor
 *
 * Shows a compact single-line summary:
 *   ● agent-phase | model | turn N | tools | events: N
 *
 * Uses raw ANSI colors from debug-theme so it's theme-independent.
 */

import { DEBUG_PALETTE, fg, formatDuration, statusIcon } from "./lib/debug-theme.ts";
import type { DashboardState } from "./lib/types.ts";

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
		parts.push(statusIcon(state.agent.phase));

		// Phase label
		parts.push(fg(P.text, this.phaseLabel(state.agent.phase)));

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
			parts.push(fg(P.dim, "hook:"));
			parts.push(fg(P.hook, state.activeHook.name));
			parts.push(fg(P.dim, hookDur));
		}

		// Tools — show ALL names (running + done), not just counts
		const allTools = [...state.activeTools.values()];
		if (allTools.length > 0) {
			for (const tool of allTools) {
				parts.push(statusIcon(tool.status));
				parts.push(fg(P.tool, tool.name));
			}
		}

		// Events counter
		parts.push(fg(P.dim, "evt:"));
		parts.push(fg(P.text, `${state.totalEventCount}`));

		// Duration
		if (state.agent.startedAt && state.agent.phase !== "idle") {
			parts.push(fg(P.dim, formatDuration(Date.now() - state.agent.startedAt)));
		}

		const line = parts.join(" ");

		this.cachedLines = [line];
		this.cachedWidth = width;
		return this.cachedLines;
	}

	/** Invalidate cached render (call when state changes) */
	public invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

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
}
