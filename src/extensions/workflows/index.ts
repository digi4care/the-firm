/**
 * Pi Extension: /tf-intake + workflow settings + /handoff
 *
 * - /tf-intake: Triggers the Intake Office conversation using the intake skill.
 * - /handoff: Transfer context to a new focused session.
 * - Workflow settings: compaction, handoff, session lifecycle hooks.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { FirmConfigSchema } from "./lib/config.js";
import registerWorkflowSettings from "./workflow-settings.js";
import registerHandoffCommand from "./lib/handoff-command.js";

export default function register(pi: ExtensionAPI) {
	// Register workflow settings (autoSaveHandoff, compactionStrategy, autoCompact, saveOnExit)
	registerWorkflowSettings(pi);

	// Register /handoff command
	registerHandoffCommand(pi);

	pi.registerCommand("tf-intake", {
		description: "Start intake for The Firm — initializes your project",
		handler: async (_args, ctx) => {
			const cwd = process.cwd();
			const configPath = join(cwd, ".pi", "firm", "config.json");

			// Check if already initialized and complete
			if (existsSync(configPath)) {
				try {
					const content = readFileSync(configPath, "utf-8");
					if (content.trim()) {
						const raw = JSON.parse(content);
						const config = FirmConfigSchema.parse(raw);

						if (config.intake.classified) {
							// Config is complete — show status
							ctx.ui.notify(
								`Project "${config.project.name}" already initialized (${config.project.status}).\nAsk me to update if needed.`,
								"info",
							);
							return;
						}
						// Config exists but incomplete — resume intake
					}
				} catch {
					// Can't read or parse — fall through to start intake
				}
			}

			// Start intake conversation via agent
			// The prompt triggers the intake skill automatically
			pi.sendUserMessage(
				"Start de intake voor dit project. " +
					"Gebruik de intake skill. " +
					"Lees eerst package.json als die bestaat, " +
					"voer dan het intake gesprek met de klant. " +
					"Sla het resultaat op in .pi/firm/config.json.",
			);
		},
	});
}
