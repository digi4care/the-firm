/**
 * Command registration for Andre (orchestrator)
 *
 * Commands:
 *   /firm-pause   — pause The Firm, Andre takes over with ad-hoc mode
 *   /firm-resume  — resume The Firm, Andre routes to departments
 *   /chain-status — show current mode and available chains
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getFirmState, setFirmState } from "./mode.js";

export function registerCommands(pi: ExtensionAPI): void {
	pi.registerCommand("firm-pause", {
		description: "Pause The Firm — Andre handles work in ad-hoc mode",
		handler: async (_args, ctx) => {
			const cwd = process.cwd();
			const { hasFirm } = getFirmState(cwd);

			if (!hasFirm) {
				ctx.ui.notify("No The Firm engagement to pause. Already in ad-hoc mode.", "info");
				return;
			}

			setFirmState(cwd, "paused");
			ctx.ui.setStatus("orchestrator", "Andre (The Firm paused)");
			ctx.ui.notify(
				"The Firm paused. Andre handles work in ad-hoc mode.\nUse /firm-resume to reactivate.",
				"info",
			);
		},
	});

	pi.registerCommand("firm-resume", {
		description: "Resume The Firm — Andre routes work to departments",
		handler: async (_args, ctx) => {
			const cwd = process.cwd();
			const { hasFirm } = getFirmState(cwd);

			if (!hasFirm) {
				ctx.ui.notify("No The Firm engagement. Use /tf-intake to start one.", "warning");
				return;
			}

			setFirmState(cwd, "active");
			ctx.ui.setStatus("orchestrator", "Andre (The Firm active)");
			ctx.ui.notify("The Firm resumed. Andre routes work to departments.", "info");
		},
	});

	pi.registerCommand("chain-status", {
		description: "Show Andre's current mode and available agents",
		handler: async (_args, ctx) => {
			const { mode, hasFirm } = getFirmState(process.cwd());
			const modeLabel = mode === "firm" ? "The Firm active" : "Ad-hoc mode";

			const lines = [
				`Andre — ${modeLabel}`,
				`Chain: brainstorm → research (parallel) → plan → build → review (parallel)`,
			];

			if (hasFirm) {
				lines.push(
					mode === "firm"
						? "/firm-pause     Pause The Firm → ad-hoc mode"
						: "/firm-resume    Resume The Firm",
				);
			}

			ctx.ui.notify(lines.join("\n"), "info");
		},
	});
}
