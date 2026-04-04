/**
 * /handoff command — Transfer context to a new session
 *
 * Sends the handoff prompt to the ACTIVE agent (OMP-style).
 * The agent writes the handoff document itself.
 * A basic handoff is saved to .pi/firm/handoffs/ as safety net.
 * The user starts a new session manually — auto-inject handles the rest.
 *
 * Usage:
 *   /handoff                          — full handoff
 *   /handoff implement this feature   — handoff with focus on specific task
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../../settings/lib/settings-store";
import { generateBasicHandoff, renderHandoffPrompt } from "./handoff-generator";

export default function registerHandoffCommand(pi: ExtensionAPI) {
	pi.registerCommand("handoff", {
		description: "Transfer context to a new focused session",
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Handoff requires interactive mode", "error");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			const additionalFocus = args.trim() || undefined;

			const branch = ctx.sessionManager.getBranch();

			const messageCount = branch.filter((e) => e.type === "message").length;
			if (messageCount < 2) {
				ctx.ui.notify("Nothing to hand off (need at least 2 messages)", "error");
				return;
			}

			// Save basic handoff to disk as safety net
			const sessionId = ctx.sessionManager?.getSessionId?.() || "unknown";
			const basicHandoff = generateBasicHandoff(branch);
			saveBasicHandoff(basicHandoff, sessionId);

			ctx.ui.notify("📋 Generating handoff document...", "info");

			// Build the handoff prompt — OMP's exact template
			const handoffPrompt = renderHandoffPrompt(additionalFocus);

			// Send prompt to agent — it writes the handoff document
			pi.sendUserMessage([
				{
					type: "text",
					text: handoffPrompt,
				},
			]);

			ctx.ui.notify(
				"Handoff prompt sent to agent. Close this session and start a new one to continue with handoff context.",
				"info",
			);
		},
	});
}

function saveBasicHandoff(content: string, sessionId: string): void {
	try {
		const handoffDir = join(process.cwd(), ".pi", "firm", "handoffs");
		if (!existsSync(handoffDir)) mkdirSync(handoffDir, { recursive: true });

		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const filename = `handoff-${sessionId.slice(0, 8)}-${ts}.md`;

		writeFileSync(
			join(handoffDir, filename),
			`# Handoff — Manual\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n${content}`,
			"utf-8",
		);
	} catch {
		// Best effort
	}
}
