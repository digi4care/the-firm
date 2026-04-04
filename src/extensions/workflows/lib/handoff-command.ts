/**
 * /handoff command — Transfer context to a new session
 *
 * Based on OMP's core handoff() flow from agent-session.ts:
 * - Sends the handoff prompt as a developer message to the ACTIVE agent
 * - The agent writes the handoff document itself (no separate LLM call)
 * - Waits for agent_end, extracts the handoff text
 * - Starts a new session with handoff context injected
 *
 * Also supports /handoff <focus> for additional focus instructions.
 *
 * Usage:
 *   /handoff                          — full handoff to new session
 *   /handoff now implement this       — handoff with focus on specific task
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../../settings/lib/settings-store";
import { generateBasicHandoff, renderHandoffPrompt, wrapHandoffContext } from "./handoff-generator";

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

			// Gather current session entries
			const branch = ctx.sessionManager.getBranch();

			const messageCount = branch.filter((e) => e.type === "message").length;
			if (messageCount < 2) {
				ctx.ui.notify("Nothing to hand off (need at least 2 messages)", "error");
				return;
			}

			ctx.ui.notify("📋 Generating handoff document...", "info");

			// Build the handoff prompt — OMP's exact template
			const handoffPrompt = renderHandoffPrompt(additionalFocus);

			// Inject the handoff prompt as a developer message
			// The agent will write the handoff document as its response
			pi.sendUserMessage([
				{
					type: "text",
					text: handoffPrompt,
				},
			]);

			// The agent will now generate the handoff document.
			// After agent_end fires, the user can review it and then
			// run /handoff-accept to actually create the new session.
			// For now, we notify the user of next steps.
			ctx.ui.notify(
				"Handoff prompt sent to agent. After the document is generated, run /handoff-accept to start the new session.",
				"info",
			);
		},
	});

	// /handoff-now: One-shot handoff — generates basic handoff and creates new session immediately
	// This is the fallback when we can't use the agent to write the handoff
	pi.registerCommand("handoff-now", {
		description: "Create new session with basic handoff (no agent generation)",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("Handoff requires interactive mode", "error");
				return;
			}

			const branch = ctx.sessionManager.getBranch();
			const currentSessionFile = ctx.sessionManager.getSessionFile();

			if (branch.length < 2) {
				ctx.ui.notify("Nothing to hand off", "error");
				return;
			}

			// Generate basic handoff (no LLM call needed)
			const basicHandoff = generateBasicHandoff(branch);
			const handoffContent = wrapHandoffContext(basicHandoff);

			// Save to disk if configured
			saveHandoffToDisk(basicHandoff, ctx.sessionManager?.getSessionId?.());

			// Create new session with parent tracking
			const result = await ctx.newSession({
				parentSession: currentSessionFile ?? undefined,
				setup: async (sm) => {
					// Inject handoff as custom message entry
					sm.appendCustomMessageEntry?.("handoff", handoffContent, true, undefined, "agent");
				},
			});

			if (result.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
				return;
			}

			ctx.ui.notify("✅ New session started with handoff context", "success");
		},
	});
}

function saveHandoffToDisk(content: string, sessionId?: string): void {
	if (getSetting("theFirm.compaction.handoffSaveToDisk") !== true) return;

	try {
		const handoffDir = join(process.cwd(), ".pi", "firm", "handoffs");
		if (!existsSync(handoffDir)) mkdirSync(handoffDir, { recursive: true });

		const id = sessionId || "unknown";
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		const filename = `handoff-${id.slice(0, 8)}-${ts}.md`;

		writeFileSync(
			join(handoffDir, filename),
			`# Handoff — Manual\n\nSession: ${id}\nGenerated: ${new Date().toISOString()}\n\n${content}`,
			"utf-8",
		);
	} catch {
		// Best effort
	}
}
