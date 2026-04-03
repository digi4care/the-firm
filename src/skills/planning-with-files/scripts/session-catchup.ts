#!/usr/bin/env tsx
/**
 * Session Catchup Script for planning-with-files (TypeScript version)
 *
 * Analyzes the previous session to find unsynced context after the last
 * planning file update. Can be run standalone or imported by the hook.
 *
 * Usage:
 *   Standalone: npx tsx session-catchup.ts [project-path]
 *   From hook:  import { runSessionCatchup } from './session-catchup'
 *
 * @version 2.0.0
 * @requires oh-my-pi >= 0.31.0
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const PLANNING_FILES = ["task_plan.md", "progress.md", "findings.md"];

interface SessionEntry {
	type: string;
	id?: string;
	parentId?: string;
	message?: {
		role?: string;
		content?: string | Array<{ type: string; text?: string }>;
	};
	[key: string]: unknown;
}

interface ExtractedMessage {
	role: "user" | "assistant";
	content: string;
	tools?: string[];
	line: number;
}

interface CatchupResult {
	hasUnsyncedContent: boolean;
	lastUpdateFile?: string;
	lastUpdateLine: number;
	unsyncedCount: number;
	messages: ExtractedMessage[];
	sessionFile?: string;
}

/**
 * Convert project path to oh-my-pi's storage path format
 */
function getProjectDir(projectPath: string): string {
	// Normalize to absolute path with forward slashes
	const resolvedPath = resolve(projectPath).replace(/\\/g, "/");

	// Sanitize path: replace separators with '-', remove ':' (Windows drives)
	let sanitized = resolvedPath.replace(/\//g, "-").replace(/:/g, "");

	// Ensure leading '-'
	if (!sanitized.startsWith("-")) {
		sanitized = `-${sanitized}`;
	}

	// oh-my-pi sessions directory
	const ompSessions = join(homedir(), ".omp", "agent", "sessions");
	if (existsSync(ompSessions)) {
		return join(ompSessions, sanitized);
	}

	// Fallback to legacy pi directory
	const piSessions = join(homedir(), ".pi", "agent", "sessions");
	if (existsSync(piSessions)) {
		return join(piSessions, sanitized);
	}

	// Ultimate fallback
	return join(homedir(), ".local", "share", "omp", "storage", "session", sanitized);
}

/**
 * Get all session files sorted by modification time (newest first)
 */
function getSessionsSorted(projectDir: string): string[] {
	if (!existsSync(projectDir)) {
		return [];
	}

	const { readdirSync } = require("node:fs");
	const { join } = require("node:path");

	try {
		const files = readdirSync(projectDir)
			.filter((f: string) => f.endsWith(".jsonl"))
			.filter((f: string) => !f.startsWith("agent-"))
			.map((f: string) => ({
				path: join(projectDir, f),
				mtime: statSync(join(projectDir, f)).mtimeMs,
			}))
			.sort((a: { mtime: number }, b: { mtime: number }) => b.mtime - a.mtime);

		return files.map((f: { path: string }) => f.path);
	} catch {
		return [];
	}
}

/**
 * Parse all messages from a session file
 */
function parseSessionMessages(sessionFile: string): SessionEntry[] {
	const messages: SessionEntry[] = [];

	try {
		const content = readFileSync(sessionFile, "utf-8");
		const lines = content.split("\n");

		for (let lineNum = 0; lineNum < lines.length; lineNum++) {
			const line = lines[lineNum].trim();
			if (!line) continue;

			try {
				const data = JSON.parse(line) as SessionEntry;
				messages.push(data);
			} catch {
				// Ignore malformed lines
			}
		}
	} catch (error) {
		console.error(`[planning-with-files] Error reading session file: ${error}`);
	}

	return messages;
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
		const msgType = msg.type;

		// Check for message type with tool_use
		if (msgType === "message" && msg.message) {
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
 * Extract conversation messages after a certain line
 */
function extractMessagesAfter(messages: SessionEntry[], afterLine: number): ExtractedMessage[] {
	const result: ExtractedMessage[] = [];

	for (let i = afterLine + 1; i < messages.length; i++) {
		const msg = messages[i];
		const msgType = msg.type;

		if (msgType === "message" && msg.message) {
			const role = msg.message.role;
			const content = msg.message.content;

			if (role === "user") {
				let textContent = "";
				if (Array.isArray(content)) {
					for (const item of content) {
						if (item.type === "text" && item.text) {
							textContent = item.text;
							break;
						}
					}
				} else if (typeof content === "string") {
					textContent = content;
				}

				if (textContent && textContent.length > 20) {
					result.push({
						role: "user",
						content: textContent,
						line: i,
					});
				}
			} else if (role === "assistant") {
				let textContent = "";
				const toolUses: string[] = [];

				if (Array.isArray(content)) {
					for (const item of content) {
						if (item.type === "text" && item.text) {
							textContent = item.text;
						} else if (item.type === "tool_use") {
							const toolName = item.name;
							const toolInput = item.input as { file_path?: string; command?: string } | undefined;
							if (toolName === "Edit" && toolInput) {
								toolUses.push(`Edit: ${toolInput.file_path || "unknown"}`);
							} else if (toolName === "Write" && toolInput) {
								toolUses.push(`Write: ${toolInput.file_path || "unknown"}`);
							} else if (toolName === "Bash" && toolInput) {
								const cmd = (toolInput.command || "").substring(0, 80);
								toolUses.push(`Bash: ${cmd}`);
							} else {
								toolUses.push(toolName);
							}
						}
					}
				}

				if (textContent || toolUses.length > 0) {
					result.push({
						role: "assistant",
						content: textContent.substring(0, 600),
						tools: toolUses,
						line: i,
					});
				}
			}
		}
	}

	return result;
}

/**
 * Run the session catchup analysis
 */
export function runSessionCatchup(projectPath: string): CatchupResult {
	const projectDir = getProjectDir(projectPath);

	// Check if planning files exist
	const hasPlanningFiles = PLANNING_FILES.some((f) => existsSync(join(projectPath, f)));

	if (!hasPlanningFiles) {
		return {
			hasUnsyncedContent: false,
			lastUpdateLine: -1,
			unsyncedCount: 0,
			messages: [],
		};
	}

	if (!existsSync(projectDir)) {
		return {
			hasUnsyncedContent: false,
			lastUpdateLine: -1,
			unsyncedCount: 0,
			messages: [],
		};
	}

	const sessions = getSessionsSorted(projectDir);
	if (sessions.length === 0) {
		return {
			hasUnsyncedContent: false,
			lastUpdateLine: -1,
			unsyncedCount: 0,
			messages: [],
		};
	}

	// Find a substantial previous session
	let targetSession: string | undefined;
	for (const session of sessions) {
		try {
			const stats = statSync(session);
			if (stats.size > 5000) {
				targetSession = session;
				break;
			}
		} catch {}
	}

	// If no substantial session, use the most recent
	if (!targetSession && sessions.length > 0) {
		targetSession = sessions[0];
	}

	if (!targetSession) {
		return {
			hasUnsyncedContent: false,
			lastUpdateLine: -1,
			unsyncedCount: 0,
			messages: [],
		};
	}

	const messages = parseSessionMessages(targetSession);
	const { line: lastUpdateLine, file: lastUpdateFile } = findLastPlanningUpdate(messages);

	if (lastUpdateLine < 0) {
		return {
			hasUnsyncedContent: false,
			lastUpdateLine: -1,
			unsyncedCount: 0,
			messages: [],
			sessionFile: targetSession,
		};
	}

	const messagesAfter = extractMessagesAfter(messages, lastUpdateLine);

	return {
		hasUnsyncedContent: messagesAfter.length > 0,
		lastUpdateFile,
		lastUpdateLine,
		unsyncedCount: messagesAfter.length,
		messages: messagesAfter,
		sessionFile: targetSession,
	};
}

/**
 * Format catchup result as human-readable output
 */
export function formatCatchupOutput(result: CatchupResult): string {
	if (!result.hasUnsyncedContent) {
		return "";
	}

	const lines: string[] = [];
	lines.push("");
	lines.push("[planning-with-files] SESSION CATCHUP DETECTED");

	if (result.sessionFile) {
		const sessionName = result.sessionFile.split("/").pop()?.replace(".jsonl", "");
		lines.push(`Previous session: ${sessionName}`);
	}

	lines.push(`Last planning update: ${result.lastUpdateFile} at message #${result.lastUpdateLine}`);
	lines.push(`Unsynced messages: ${result.unsyncedCount}`);
	lines.push("");
	lines.push("--- UNSYNCED CONTEXT ---");

	// Show last 15 messages
	const recentMessages = result.messages.slice(-15);
	for (const msg of recentMessages) {
		if (msg.role === "user") {
			lines.push(`USER: ${msg.content.substring(0, 300)}`);
		} else {
			if (msg.content) {
				lines.push(`ASSISTANT: ${msg.content.substring(0, 300)}`);
			}
			if (msg.tools && msg.tools.length > 0) {
				lines.push(`  Tools: ${msg.tools.slice(0, 4).join(", ")}`);
			}
		}
	}

	lines.push("");
	lines.push("--- RECOMMENDED ---");
	lines.push("1. Run: git diff --stat");
	lines.push("2. Read: task_plan.md, progress.md, findings.md");
	lines.push("3. Update planning files based on above context");
	lines.push("4. Continue with task");

	return lines.join("\n");
}

/**
 * Main function for CLI usage
 */
function main(): void {
	const projectPath = process.argv[2] || process.cwd();
	const result = runSessionCatchup(projectPath);

	if (result.hasUnsyncedContent) {
		console.log(formatCatchupOutput(result));
	}
}

// Run if called directly (not imported)
if (require.main === module) {
	main();
}
