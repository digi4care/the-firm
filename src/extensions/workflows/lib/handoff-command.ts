/**
 * /handoff command — Transfer context to a new focused session
 *
 * Based on OMP's handoff.ts example, adapted for The Firm:
 * - Generates focused prompt via LLM
 * - User edits the prompt in the editor
 * - Creates new session with parent tracking
 * - Optionally saves handoff doc to .local/HANDOFF.md
 *
 * Usage:
 *   /handoff now implement this for teams as well
 *   /handoff execute phase one of the plan
 *   /handoff continue from where we left off
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { BorderedLoader } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../../settings/lib/settings-store";
import { generateFocusedHandoff } from "./handoff-generator";

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

			const goal = args.trim();
			if (!goal) {
				ctx.ui.notify("Usage: /handoff <goal for new session>", "error");
				return;
			}

			// Gather conversation context
			const branch = ctx.sessionManager.getBranch();
			const currentSessionFile = ctx.sessionManager.getSessionFile();

			if (branch.length === 0) {
				ctx.ui.notify("No conversation to hand off", "error");
				return;
			}

			// Generate focused handoff prompt with loading UI
			const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				const loader = new BorderedLoader(tui, theme, `Generating handoff for: ${goal}`);
				loader.onAbort = () => done(null);

				const doGenerate = async () => {
					return await generateFocusedHandoff(
						branch,
						goal,
						ctx.modelRegistry,
						ctx.model,
						loader.signal,
					);
				};

				doGenerate()
					.then(done)
					.catch((err) => {
						console.error("[handoff] Generation failed:", err);
						done(null);
					});

				return loader;
			});

			if (result === null) {
				ctx.ui.notify("Handoff cancelled", "info");
				return;
			}

			// Let user edit the generated prompt
			const editedPrompt = await ctx.ui.editor("Edit handoff prompt before sending", result);

			if (editedPrompt === undefined) {
				ctx.ui.notify("Handoff cancelled", "info");
				return;
			}

			// Save handoff doc to disk if configured
			if (getSetting("theFirm.compaction.handoffSaveToDisk") === true) {
				try {
					const localDir = join(process.cwd(), ".local");
					if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });

					writeFileSync(
						join(localDir, "HANDOFF.md"),
						`# Handoff — Manual\n\nGenerated: ${new Date().toISOString()}\nGoal: ${goal}\n\n${editedPrompt}`,
						"utf-8",
					);
				} catch {
					// Best effort
				}
			}

			// Create new session with parent tracking
			const newSessionResult = await ctx.newSession({
				parentSession: currentSessionFile,
			});

			if (newSessionResult.cancelled) {
				ctx.ui.notify("New session cancelled", "info");
				return;
			}

			// Put the edited prompt in the editor for user to submit
			ctx.ui.setEditorText(editedPrompt);
			ctx.ui.notify("Handoff ready. Review and submit when ready.", "info");
		},
	});
}
