/**
 * Orchestrator Extension — "Andre"
 *
 * Always-active orchestrator that is mode-aware:
 *   - The Firm ACTIVE → routes work to departments
 *   - The Firm PAUSED / no config → handles work via subagent chain
 *
 * Delegates chain execution to pi-subagents' `subagent` tool.
 * No own subprocess spawning, no own chain execution.
 *
 * Commands:
 *   /firm-pause     — pause The Firm, switch to ad-hoc mode
 *   /firm-resume    — resume The Firm
 *   /chain-status   — show current mode
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerCommands } from "./commands.js";
import { getFirmState } from "./mode.js";
import { buildSystemPrompt } from "./system-prompt.js";

export default function register(pi: ExtensionAPI) {
	// Register /firm-pause, /firm-resume, /chain-status
	registerCommands(pi);

	// Inject mode-aware system prompt on every agent turn
	pi.on("before_agent_start", async (_event, _ctx) => {
		const { mode } = getFirmState(_ctx.cwd);
		return {
			systemPrompt: buildSystemPrompt(mode),
		};
	});

	// On session start: set status bar and notify
	pi.on("session_start", async (_event, _ctx) => {
		const { mode, hasFirm } = getFirmState(_ctx.cwd);

		const modeLabel =
			mode === "firm" ? "The Firm active" : hasFirm ? "The Firm paused (ad-hoc)" : "Ad-hoc mode";

		_ctx.ui.setStatus("orchestrator", `Andre (${modeLabel})`);

		const lines = [
			`Andre — ${modeLabel}`,
			`Chain: brainstorm → research (∥) → plan → build → review (∥)`,
			"",
		];

		if (hasFirm) {
			lines.push(
				mode === "firm"
					? "/firm-pause     Pause The Firm → ad-hoc mode"
					: "/firm-resume    Resume The Firm",
			);
		}
		lines.push("/chain-status  Show mode and chain info");

		_ctx.ui.notify(lines.join("\n"), "info");
	});
}

export type { FirmMode, FirmStateResult } from "./mode.js";
// Re-export for testing
export { getFirmState, setFirmState } from "./mode.js";
export { buildSystemPrompt } from "./system-prompt.js";
