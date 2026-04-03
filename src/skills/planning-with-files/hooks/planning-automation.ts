/**
 * Planning Automation Hook for oh-my-pi
 *
 * This hook automates the planning-with-files workflow by:
 * - Running session catchup on session_start
 * - Auto-updating planning files on tool results
 * - Checking completion status on agent_end
 *
 * Installation:
 * 1. Copy this file to ~/.pi/agent/hooks/post/planning-automation.ts
 * 2. Or use: pi --hook /path/to/planning-automation.ts
 *
 * @version 2.1.0
 * @requires oh-my-pi >= 0.31.0
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { HookAPI } from "@oh-my-pi/pi-coding-agent/hooks";

const PLANNING_FILES = ["task_plan.md", "progress.md", "findings.md"];

interface SessionEntry {
	type: string;
	message?: {
		role?: string;
		content?: string | Array<{ type: string; text?: string }>;
	};
	[key: string]: unknown;
}

function hasPlanningFiles(cwd: string): boolean {
	return PLANNING_FILES.some((f) => existsSync(join(cwd, f)));
}

/**
 * Convert project path to oh-my-pi's storage path format
 */
function getProjectDir(projectPath: string): string {
	const resolvedPath = resolve(projectPath).replace(/\\/g, "/");
	let sanitized = resolvedPath.replace(/\//g, "-").replace(/:/g, "");
	if (!sanitized.startsWith("-")) {
		sanitized = `-${sanitized}`;
	}

	const ompSessions = join(homedir(), ".omp", "agent", "sessions");
	if (existsSync(ompSessions)) {
		return join(ompSessions, sanitized);
	}

	const piSessions = join(homedir(), ".pi", "agent", "sessions");
	if (existsSync(piSessions)) {
		return join(piSessions, sanitized);
	}

	return join(homedir(), ".local", "share", "omp", "storage", "session", sanitized);
}

/**
 * Find the last time a planning file was written/edited
 */
function findLastPlanningUpdate(messages: SessionEntry[]): {
	line: number;
	file?: string;
} {
	let lastUpdateLine = -1;
	let lastUpdateFile: string | undefined;

	for (let i = 0; i < messages.length; i++) {
		const msg = messages[i];
		if (msg.type === "message" && msg.message) {
			const content = msg.message.content;
			if (Array.isArray(content)) {
				for (const item of content) {
					if (item.type === "tool_use") {
						const toolName = item.name;
						const toolInput = item.input as { file_path?: string } | undefined;
						if ((toolName === "Write" || toolName === "Edit") && toolInput) {
							const filePath = toolInput.file_path || "";
							for (const pf of PLANNING_FILES) {
								if (filePath.endsWith(pf)) {
									lastUpdateLine = i;
									lastUpdateFile = pf;
								}
							}
						}
					}
				}
			}
		}
	}

	return { line: lastUpdateLine, file: lastUpdateFile };
}

/**
 * Parse session file and extract recent context
 */
function extractRecentContext(sessionFile: string, _afterLine: number): string {
	const messages: SessionEntry[] = [];

	try {
		const content = readFileSync(sessionFile, "utf-8");
		const lines = content.split("\n");

		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				messages.push(JSON.parse(line) as SessionEntry);
			} catch {
				// Ignore malformed lines
			}
		}
	} catch {
		return "";
	}

	const { line: lastUpdateLine, file: lastUpdateFile } = findLastPlanningUpdate(messages);

	if (lastUpdateLine < 0) {
		return "";
	}

	// Build context from messages after planning update
	const contextLines: string[] = [];
	contextLines.push("[planning-with-files] SESSION CATCHUP DETECTED");
	contextLines.push(`Last planning update: ${lastUpdateFile} at message #${lastUpdateLine}`);
	contextLines.push("");
	contextLines.push("--- RECENT CONTEXT ---");

	// Show last 10 messages
	const recentMessages = messages.slice(lastUpdateLine + 1).slice(-10);

	for (const msg of recentMessages) {
		if (msg.type === "message" && msg.message) {
			const role = msg.message.role;
			const content = msg.message.content;

			if (role === "user") {
				let text = "";
				if (Array.isArray(content)) {
					for (const item of content) {
						if (item.type === "text" && item.text) {
							text = item.text;
							break;
						}
					}
				} else if (typeof content === "string") {
					text = content;
				}

				if (text.length > 20) {
					contextLines.push(`USER: ${text.substring(0, 200)}...`);
				}
			} else if (role === "assistant") {
				let text = "";
				const tools: string[] = [];

				if (Array.isArray(content)) {
					for (const item of content) {
						if (item.type === "text" && item.text) {
							text = item.text;
						} else if (item.type === "tool_use") {
							tools.push(item.name || "unknown");
						}
					}
				}

				if (text) {
					contextLines.push(`ASSISTANT: ${text.substring(0, 200)}...`);
				}
				if (tools.length > 0) {
					contextLines.push(`  Tools: ${tools.slice(0, 3).join(", ")}`);
				}
			}
		}
	}

	contextLines.push("");
	contextLines.push("--- RECOMMENDED ---");
	contextLines.push("1. Run: git diff --stat");
	contextLines.push("2. Read: task_plan.md, progress.md, findings.md");
	contextLines.push("3. Update planning files based on above context");
	contextLines.push("4. Continue with task");

	return contextLines.join("\n");
}

export default function (pi: HookAPI) {
	// Session start: Run catchup if planning files exist
	pi.on("session_start", async (event, ctx) => {
		const cwd = event.cwd || process.cwd();

		if (!hasPlanningFiles(cwd)) {
			return;
		}

		ctx.logger.info("[planning-with-files] Planning files detected, running catchup...");

		try {
			const projectDir = getProjectDir(cwd);

			if (!existsSync(projectDir)) {
				return;
			}

			// Find most recent session file
			const { readdirSync, statSync } = require("node:fs");
			const sessions = readdirSync(projectDir)
				.filter((f: string) => f.endsWith(".jsonl"))
				.map((f: string) => ({
					path: join(projectDir, f),
					mtime: statSync(join(projectDir, f)).mtimeMs,
				}))
				.sort((a: { mtime: number }, b: { mtime: number }) => b.mtime - a.mtime);

			if (sessions.length === 0) {
				return;
			}

			const sessionFile = sessions[0].path;
			const context = extractRecentContext(sessionFile, 0);

			if (context) {
				pi.sendMessage({
					role: "assistant",
					content: context,
					display: true,
				});
			}
		} catch (_error) {
			ctx.logger.error("[planning-with-files] Catchup failed:", error);
		}
	});

	// Tool result: Auto-update progress when planning files are modified
	pi.on("tool_result", async (event, ctx) => {
		const cwd = process.cwd();

		if (!hasPlanningFiles(cwd)) {
			return;
		}

		const toolName = event.toolName;

		if (toolName === "Write" || toolName === "Edit") {
			const output = event.output as { file_path?: string };
			const filePath = output?.file_path || "";
			if (PLANNING_FILES.some((f) => filePath.endsWith(f))) {
				ctx.logger.info(`[planning-with-files] Updated: ${filePath}`);

				if (filePath.endsWith("task_plan.md")) {
					ctx.ui.notify("Planning file updated", "info");
				}
			}
		}
	});

	// Agent end: Check completion status
	pi.on("agent_end", async (_event, ctx) => {
		const cwd = process.cwd();

		if (!hasPlanningFiles(cwd)) {
			return;
		}

		try {
			const taskPlanPath = join(cwd, "task_plan.md");
			if (!existsSync(taskPlanPath)) {
				return;
			}

			// Read and parse task_plan.md
			const content = readFileSync(taskPlanPath, "utf-8");
			const totalPhases = (content.match(/### Phase/g) || []).length;
			const completePhases = (content.match(/\*\*Status:\*\* complete/g) || []).length;
			const inProgressPhases = (content.match(/\*\*Status:\*\* in_progress/g) || []).length;

			if (completePhases === totalPhases && totalPhases > 0) {
				ctx.ui.notify("All planning phases complete!", "success");
			} else {
				ctx.logger.info(
					`[planning-with-files] Task in progress (${completePhases}/${totalPhases} phases complete)`,
				);
				if (inProgressPhases > 0) {
					ctx.logger.info(`[planning-with-files] ${inProgressPhases} phase(s) still in progress.`);
				}
			}
		} catch (_error) {
			// Silently fail - completion check is optional
		}
	});

	pi.logger.info("[planning-with-files] Hook loaded successfully");
}
