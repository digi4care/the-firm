/**
 * Pi Extension: /tf-intake
 *
 * Triggers the Intake Office conversation using the intake skill.
 * - If no config exists: starts intake via agent conversation
 * - If config exists and complete: shows project status
 * - If config exists but incomplete: resumes intake
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function register(pi: ExtensionAPI) {
	pi.registerCommand("tf-intake", {
		description: "Start intake for The Firm — initializes your project",
		handler: async (_args, ctx) => {
			const cwd = process.cwd();
			const configPath = join(cwd, ".firm", "config.yml");

			// Check if already initialized and complete
			if (existsSync(configPath)) {
				try {
					const content = readFileSync(configPath, "utf-8");
					if (content.trim()) {
						const nameMatch = content.match(/name:\s*["']?(.+?)["']?\s*$/m);
						const statusMatch = content.match(/status:\s*(\w+)/m);
						const classifiedMatch = content.match(/classified:\s*(true|false)/);
						const projectName = nameMatch?.[1] || "unknown";
						const status = statusMatch?.[1] || "active";
						const classified = classifiedMatch?.[1] === "true";

						if (classified) {
							// Config is complete — show status
							ctx.ui.notify(
								`Project "${projectName}" already initialized (${status}).\nAsk me to update if needed.`,
								"info",
							);
							return;
						}
						// Config exists but incomplete — resume intake
					}
				} catch {
					// Can't read file, fall through to start intake
				}
			}

			// Start intake conversation via agent
			// The prompt triggers the intake skill automatically
			pi.sendUserMessage(
				"Start de intake voor dit project. " +
					"Gebruik de intake skill. " +
					"Lees eerst package.json als die bestaat, " +
					"voer dan het intake gesprek met de klant. " +
					"Sla het resultaat op in .firm/config.yml.",
			);
		},
	});
}
