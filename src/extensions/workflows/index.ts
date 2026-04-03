/**
 * Pi Extension: /tf-intake
 *
 * Triggers the Intake Office conversation.
 * - If no config exists: starts intake via agent conversation
 * - If config exists: shows project status
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

			// Check if already initialized
			if (existsSync(configPath)) {
				try {
					const content = readFileSync(configPath, "utf-8");
					if (content.trim()) {
						const nameMatch = content.match(/name:\s*["']?(.+?)["']?\s*$/m);
						const statusMatch = content.match(/status:\s*(\w+)/m);
						const projectName = nameMatch?.[1] || "unknown";
						const status = statusMatch?.[1] || "active";

						ctx.ui.notify(
							`Project "${projectName}" already initialized (${status}).\nAsk me to update if needed.`,
							"info",
						);
						return;
					}
				} catch {
					// Can't read file, fall through to start intake
				}
			}

			// Start intake conversation via agent
			pi.sendUserMessage(
				"Ik wil een intake starten voor dit project. " +
				"Lees eerst package.json als die bestaat, " +
				"stel me dan een paar vragen om me op te nemen als client. " +
				"Sla het resultaat op in .firm/config.yml.",
			);
		},
	});
}
