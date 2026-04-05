/**
 * Shared session I/O utilities
 *
 * Used by: session-tools, ace-reflector
 * Eliminates duplication between session management extensions
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface SessionEntry {
	id: string;
	parentId?: string;
	type: string;
	role?: string;
	content?: string;
	timestamp?: number;
	toolName?: string;
	toolCalls?: unknown[];
}

export interface SessionStats {
	totalEntries: number;
	userMessages: number;
	assistantMessages: number;
	toolResults: number;
	toolCalls: number;
	uniqueTools: string[];
	durationMs: number;
}

const getSessionsDir = (): string => {
	const home = process.env.HOME || process.env.USERPROFILE || "~";
	return path.join(home, ".pi", "agent", "sessions");
};

const getCurrentSessionDir = (): string => {
	const home = process.env.HOME || process.env.USERPROFILE || "~";
	const cwd = process.cwd().replace(/\//g, "-").replace(/^-/, "");
	return path.join(home, ".pi", "agent", "sessions", `--${cwd}--`);
};

const listSessionFolders = async (): Promise<string[]> => {
	const sessionsDir = getSessionsDir();
	try {
		const entries = await readdir(sessionsDir, { withFileTypes: true });
		return entries.filter((e) => e.isDirectory()).map((e) => e.name);
	} catch {
		return [];
	}
};

const listSessionFiles = async (folderName: string): Promise<string[]> => {
	const folderPath = path.join(getSessionsDir(), folderName);
	try {
		const entries = await readdir(folderPath);
		return entries
			.filter((e) => e.endsWith(".jsonl"))
			.sort()
			.reverse();
	} catch {
		return [];
	}
};

const parseSessionFile = async (filePath: string): Promise<SessionEntry[]> => {
	try {
		const content = await readFile(filePath, "utf-8");
		const lines = content.trim().split("\n");
		return lines
			.map((line) => {
				try {
					return JSON.parse(line) as SessionEntry;
				} catch {
					return null;
				}
			})
			.filter((entry): entry is SessionEntry => entry !== null);
	} catch {
		return [];
	}
};

const formatDuration = (ms: number): string => {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
	return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

const calculateSessionStats = (entries: SessionEntry[]): SessionStats => {
	const userMessages = entries.filter((e) => e.role === "user");
	const assistantMessages = entries.filter((e) => e.role === "assistant");
	const toolResults = entries.filter((e) => e.role === "toolResult");
	const toolCalls = entries.filter((e) => e.type === "message" && hasToolCall(e));

	const toolsUsed = new Set(entries.filter((e) => e.toolName).map((e) => e.toolName));

	const firstEntry = entries[0];
	const lastEntry = entries[entries.length - 1];
	const duration =
		firstEntry?.timestamp && lastEntry?.timestamp ? lastEntry.timestamp - firstEntry.timestamp : 0;

	return {
		totalEntries: entries.length,
		userMessages: userMessages.length,
		assistantMessages: assistantMessages.length,
		toolResults: toolResults.length,
		toolCalls: toolCalls.length,
		uniqueTools: Array.from(toolsUsed).filter((t): t is string => t !== undefined),
		durationMs: duration,
	};
};

// Helper to check if entry has tool calls
const hasToolCall = (entry: SessionEntry): boolean => {
	const msg = entry as unknown as {
		message?: { content?: Array<{ type: string }> };
	};
	return msg.message?.content?.some((c) => c.type === "toolCall") ?? false;
};

// Helper to find session file across folders
const findSessionFile = async (
	sessionId: string,
	folders: string[],
): Promise<{ path: string; folder: string } | null> => {
	const sessionsDir = getSessionsDir();

	for (const folder of folders) {
		const files = await listSessionFiles(folder);
		const match = files.find((f) => f.includes(sessionId) || f === `${sessionId}.jsonl`);
		if (match) {
			return {
				path: path.join(sessionsDir, folder, match),
				folder,
			};
		}
	}
	return null;
};

export {
	calculateSessionStats,
	findSessionFile,
	formatDuration,
	getCurrentSessionDir,
	getSessionsDir,
	listSessionFiles,
	listSessionFolders,
	parseSessionFile,
};
