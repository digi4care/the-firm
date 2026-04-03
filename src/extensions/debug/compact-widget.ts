/**
 * compact-widget.ts — Always-visible status widget above the editor
 *
 * Shows a compact single-line summary:
 *   ● agent-phase | model | turn N | tools | evt: N
 *
 * Uses raw ANSI colors from debug-theme so it's theme-independent.
 */

import { DEBUG_PALETTE, fg, formatDuration, statusIcon } from "./lib/debug-theme.ts";
import type { DashboardState } from "./lib/types.ts";

export class CompactWidget {
	constructor(private readonly getState: () => DashboardState) {}

	/** Render the widget lines — always fresh, no cache */
	public render(_width: number): string[] {
		const state = this.getState();
		const P = DEBUG_PALETTE;
		const parts: string[] = [];

		// Phase
		parts.push(statusIcon(state.agent.phase));
		parts.push(fg(P.text, this.phaseLabel(state.agent.phase)));
		parts.push(fg(P.dim, "│"));

		// Model
		if (state.agent.model) {
			parts.push(fg(P.agent, state.agent.model.split("/").pop()!));
		}

		// Turn
		if (state.agent.totalTurns > 0) {
			parts.push(fg(P.dim, "turn"));
			parts.push(fg(P.turn, `${state.agent.turnIndex + 1}/${state.agent.totalTurns}`));
		}

		// Hook
		if (state.activeHook) {
			parts.push(fg(P.dim, "hook:"));
			parts.push(fg(P.hook, state.activeHook.name));
			parts.push(fg(P.dim, formatDuration(Date.now() - state.activeHook.startedAt)));
		}

		// Tools — altijd namen tonen uit toolHistory
		const tools = state.toolHistory ?? [...state.activeTools.values()];
		for (const tool of tools) {
			parts.push(fg(P.dim, "tool:"));
			parts.push(fg(P.tool, tool.name));
		}

		// Events
		parts.push(fg(P.dim, "evt"));
		parts.push(fg(P.text, `${state.totalEventCount}`));

		// Duration
		if (state.agent.startedAt && state.agent.phase !== "idle") {
			parts.push(fg(P.dim, formatDuration(Date.now() - state.agent.startedAt)));
		}

		return [parts.join(" ")];
	}

	/** No-op, kept for API compat */
	public invalidate(): void {}

	private phaseLabel(phase: string): string {
		switch (phase) {
			case "idle": return "idle";
			case "starting": return "starting";
			case "running": return "running";
			case "turn": return "in turn";
			case "ending": return "ending";
			default: return phase;
		}
	}
}
