/**
 * compact-widget.ts — Always-visible status widget above the editor
 *
 *   ● phase │ model turn N hook:name tool:name evt: N
 */

import { DEBUG_PALETTE, fg, formatDuration, statusIcon } from "./lib/debug-theme.ts";
import type { DashboardState } from "./lib/types.ts";

export class CompactWidget {
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(private readonly getState: () => DashboardState) {}

	public render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const state = this.getState();
		const P = DEBUG_PALETTE;
		const parts: string[] = [];

		parts.push(statusIcon(state.agent.phase));
		parts.push(fg(P.text, this.phaseLabel(state.agent.phase)));
		parts.push(fg(P.dim, "│"));

		if (state.agent.model) {
			parts.push(fg(P.agent, state.agent.model.split("/").pop()!));
		}

		if (state.agent.totalTurns > 0) {
			parts.push(fg(P.dim, "turn"));
			parts.push(fg(P.turn, `${state.agent.turnIndex + 1}/${state.agent.totalTurns}`));
		}

		if (state.activeHook) {
			parts.push(fg(P.hook, `hook:${state.activeHook.name}`));
		}

		const tools = [...state.activeTools.values()];
		if (tools.length > 0) {
			const names = [...new Set(tools.map(t => t.name))].join(",");
			parts.push(fg(P.tool, `tool:${names}`));
		}

		parts.push(fg(P.dim, "evt:"));
		parts.push(fg(P.text, `${state.totalEventCount}`));

		if (state.agent.startedAt && state.agent.phase !== "idle") {
			parts.push(fg(P.dim, formatDuration(Date.now() - state.agent.startedAt)));
		}

		this.cachedLines = [parts.join(" ")];
		this.cachedWidth = width;
		return this.cachedLines;
	}

	public invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

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
