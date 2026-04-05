/**
 * Command Loader — Auto-registers slash commands from .pi/commands/*.md
 *
 * Scans all .md files in .pi/commands/, parses frontmatter for metadata,
 * and registers each as a Pi slash command. The body becomes the prompt
 * sent to the agent when the command is invoked.
 *
 * Frontmatter format:
 *   ---
 *   description: Short description (shown in autocomplete)
 *   hints:                        (optional — shows argument suggestions)
 *     - value: some-value
 *       label: What this value means
 *     - value: other-value
 *       label: Another option
 *   ---
 *
 * Command name = filename without .md extension.
 * Example: .pi/commands/skill-creator-plan.md → /skill-creator-plan
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionAPI, ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

interface AutocompleteHint {
	value: string;
	label: string;
}

interface CommandFrontmatter {
	description: string;
	hints?: AutocompleteHint[];
}

interface ParsedCommand {
	name: string;
	description: string;
	hints?: AutocompleteHint[];
	body: string;
}

interface AutocompleteOption {
	value: string;
	label: string;
}

function parseFrontmatter(content: string): { frontmatter: CommandFrontmatter; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

	if (!match) {
		return { frontmatter: { description: "" }, body: content };
	}

	const raw = match[1];
	const body = match[2];
	const lines = raw.split("\n");

	// Parse description
	const description =
		lines
			.find((line) => line.startsWith("description:"))
			?.replace(/^description:\s*/, "")
			?.trim() ?? "";

	// Parse hints (YAML list of { value, label })
	const hints: AutocompleteHint[] = [];
	let inHints = false;
	for (const line of lines) {
		if (line.startsWith("hints:")) {
			inHints = true;
			continue;
		}
		if (inHints) {
			// Stop if we hit a non-hint line
			if (!line.startsWith("  ") && !line.startsWith("-")) {
				inHints = false;
				continue;
			}
			const valueMatch = line.match(/-\s*value:\s*(.+)/) || line.match(/^\s+value:\s*(.+)/);
			const labelMatch = line.match(/^\s+label:\s*(.+)/);
			if (valueMatch) {
				hints.push({ value: valueMatch[1].trim(), label: "" });
			} else if (labelMatch && hints.length > 0) {
				hints[hints.length - 1].label = labelMatch[1].trim();
			}
		}
	}

	return {
		frontmatter: { description, hints: hints.length > 0 ? hints : undefined },
		body,
	};
}

async function loadCommands(commandsDir: string): Promise<ParsedCommand[]> {
	const commands: ParsedCommand[] = [];

	try {
		const entries = await readdir(commandsDir);
		const mdFiles = entries.filter((f) => f.endsWith(".md")).sort();

		for (const file of mdFiles) {
			const filePath = path.join(commandsDir, file);
			const content = await readFile(filePath, "utf-8");
			const { frontmatter, body } = parseFrontmatter(content);
			const name = file.replace(/\.md$/, "");

			commands.push({
				name,
				description: frontmatter.description || `Run /${name}`,
				hints: frontmatter.hints,
				body: body.trim(),
			});
		}
	} catch {
		// commands dir doesn't exist yet — that's fine
	}

	return commands;
}

export default async function commandLoader(pi: ExtensionAPI) {
	// Resolve .pi/commands/ relative to cwd
	const commandsDir = path.join(process.cwd(), ".pi", "commands");
	const commands = await loadCommands(commandsDir);

	if (commands.length === 0) {
		return;
	}

	for (const cmd of commands) {
		const { name, description, hints, body } = cmd;

		// Build registration options
		const options: {
			description: string;
			getArgumentCompletions?: (prefix: string) => AutocompleteOption[] | null;
			handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
		} = {
			description,
			handler: async (args: string, ctx: ExtensionCommandContext) => {
				// Build the prompt: command body + any user arguments
				let prompt = body;
				if (args?.trim()) {
					prompt += `\n\n## Arguments\n${args.trim()}`;
				}

				if (!ctx.isIdle()) {
					pi.sendUserMessage(prompt, { deliverAs: "steer" });
				} else {
					pi.sendUserMessage(prompt);
				}
			},
		};

		// Add argument autocomplete from hints
		if (hints && hints.length > 0) {
			options.getArgumentCompletions = (prefix: string) => {
				const filtered = hints.filter((h) => h.value.startsWith(prefix));
				return filtered.length > 0 ? filtered : null;
			};
		}

		pi.registerCommand(name, options);
	}
}
