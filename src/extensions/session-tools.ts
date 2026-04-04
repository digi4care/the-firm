/**
 * Session Tools - Pi Session Management Extension
 *
 * Provides tools to list, read, search, and analyze Pi sessions.
 * Replaces OpenCode's om-session plugin with Pi-native functionality.
 *
 * Usage: pi -e extensions/session-tools.ts
 *
 * Tools provided:
 *   - pi-list-sessions: List all available sessions
 *   - pi-read-session: Read a specific session's messages
 *   - pi-session-stats: Get statistics about sessions
 *   - pi-search-session: Search for content in sessions
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

interface SessionEntry {
	id: string;
	parentId?: string;
	type: string;
	role?: string;
	content?: string;
	timestamp?: number;
	toolName?: string;
	toolCalls?: any[];
}

// ── Helper Functions ────────────────────────────────────────

function getSessionsDir(): string {
	const home = process.env.HOME || process.env.USERPROFILE || "~";
	return path.join(home, ".pi", "agent", "sessions");
}

function getCurrentSessionDir(): string {
	const home = process.env.HOME || process.env.USERPROFILE || "~";
	// Get current working directory and convert to session folder name
	const cwd = process.cwd().replace(/\//g, "-").replace(/^-/, "");
	return path.join(home, ".pi", "agent", "sessions", `--${cwd}--`);
}

async function listSessionFolders(): Promise<string[]> {
	const sessionsDir = getSessionsDir();
	try {
		const entries = await readdir(sessionsDir, { withFileTypes: true });
		return entries.filter((e) => e.isDirectory()).map((e) => e.name);
	} catch {
		return [];
	}
}

async function listSessionFiles(folderName: string): Promise<string[]> {
	const folderPath = path.join(getSessionsDir(), folderName);
	try {
		const entries = await readdir(folderPath);
		return entries
			.filter((e) => e.endsWith(".jsonl"))
			.sort()
			.reverse(); // Most recent first
	} catch {
		return [];
	}
}

async function parseSessionFile(filePath: string): Promise<SessionEntry[]> {
	try {
		const content = await readFile(filePath, "utf-8");
		const lines = content.trim().split("\n");
		return lines
			.map((line) => {
				try {
					return JSON.parse(line);
				} catch {
					return null;
				}
			})
			.filter(Boolean) as SessionEntry[];
	} catch {
		return [];
	}
}

function extractSessionTitle(entries: SessionEntry[]): string {
	// Find first user message as title
	const userMsg = entries.find((e) => e.role === "user" && e.content);
	if (userMsg?.content) {
		return userMsg.content.slice(0, 60) + (userMsg.content.length > 60 ? "..." : "");
	}
	return "Untitled Session";
}

function calculateSessionStats(entries: SessionEntry[]): any {
	const userMessages = entries.filter((e) => e.role === "user");
	const assistantMessages = entries.filter((e) => e.role === "assistant");
	const toolResults = entries.filter((e) => e.role === "toolResult");
	const toolCalls = entries.filter(
		(e) =>
			e.type === "message" && (e as any).message?.content?.some((c: any) => c.type === "toolCall"),
	);

	const firstEntry = entries[0];
	const lastEntry = entries[entries.length - 1];
	const duration =
		firstEntry?.timestamp && lastEntry?.timestamp ? lastEntry.timestamp - firstEntry.timestamp : 0;

	// Count unique tools used
	const toolsUsed = new Set(entries.filter((e) => e.toolName).map((e) => e.toolName));

	return {
		totalEntries: entries.length,
		userMessages: userMessages.length,
		assistantMessages: assistantMessages.length,
		toolResults: toolResults.length,
		toolCalls: toolCalls.length,
		uniqueTools: toolsUsed.size,
		toolsUsed: Array.from(toolsUsed),
		durationMs: duration,
		durationFormatted: formatDuration(duration),
	};
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
	return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

// ── Extension ─────────────────────────────────────────────

export default async function sessionTools(pi: ExtensionAPI) {
	// ── pi-list-sessions Tool ─────────────────────────────
	pi.registerTool({
		name: "pi-list-sessions",
		label: "Pi Session: List",
		description: "List all available Pi sessions across projects",
		parameters: Type.Object({
			projectFolder: Type.Optional(
				Type.String({
					description: "Specific project folder to list (e.g., '--home-digi4care--')",
				}),
			),
			limit: Type.Optional(
				Type.Number({
					description: "Maximum sessions per folder (default 10)",
				}),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			try {
				const sessionsDir = getSessionsDir();
				const folders = await listSessionFolders();

				const limit = params.limit || 10;
				const targetFolder = params.projectFolder;

				const results: any[] = [];

				const foldersToScan = targetFolder ? [targetFolder] : folders;

				for (const folder of foldersToScan) {
					const files = await listSessionFiles(folder);
					const limitedFiles = files.slice(0, limit);

					for (const file of limitedFiles) {
						const filePath = path.join(sessionsDir, folder, file);
						const entries = await parseSessionFile(filePath);

						if (entries.length > 0) {
							const firstEntry = entries[0];
							const lastEntry = entries[entries.length - 1];

							results.push({
								id: file.replace(".jsonl", ""),
								folder,
								title: extractSessionTitle(entries),
								entries: entries.length,
								startTime: firstEntry.timestamp,
								endTime: lastEntry.timestamp,
							});
						}
					}
				}

				// Sort by most recent
				results.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									success: true,
									sessions: results.slice(0, 50),
									total: results.length,
								},
								null,
								2,
							),
						},
					],
					details: { sessions: results },
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

	// ── pi-read-session Tool ──────────────────────────────
	pi.registerTool({
		name: "pi-read-session",
		label: "Pi Session: Read",
		description: "Read messages from a specific Pi session",
		parameters: Type.Object({
			sessionId: Type.String({
				description: "Session ID (full timestamp_uuid.jsonl filename or just the uuid)",
			}),
			folder: Type.Optional(
				Type.String({
					description: "Session folder (e.g., '--home-digi4care--')",
				}),
			),
			limit: Type.Optional(
				Type.Number({
					description: "Maximum messages to return (default 100)",
				}),
			),
			offset: Type.Optional(Type.Number({ description: "Message offset (default 0)" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			try {
				const sessionsDir = getSessionsDir();

				// Find the session file
				let foundPath: string | null = null;

				// Try current project folder first
				const currentFolder = path.basename(getCurrentSessionDir());
				const folders = params.folder
					? [params.folder]
					: [currentFolder, ...(await listSessionFolders())];

				for (const folder of folders) {
					const files = await listSessionFiles(folder);
					const match = files.find(
						(f) => f.includes(params.sessionId) || f === `${params.sessionId}.jsonl`,
					);
					if (match) {
						foundPath = path.join(sessionsDir, folder, match);
						break;
					}
				}

				if (!foundPath) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										success: false,
										error: `Session not found: ${params.sessionId}`,
									},
									null,
									2,
								),
							},
						],
						details: { error: "Session not found" },
					};
				}

				const entries = await parseSessionFile(foundPath);
				const offset = params.offset || 0;
				const limit = params.limit || 100;
				const slicedEntries = entries.slice(offset, offset + limit);

				// Format messages for output
				const messages = slicedEntries.map((entry) => ({
					id: entry.id,
					role: entry.role,
					content:
						typeof entry.content === "string"
							? entry.content
							: JSON.stringify((entry.content as any)?.slice?.(0, 500) ?? entry.content),
					timestamp: entry.timestamp,
					toolName: entry.toolName,
				}));

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									success: true,
									sessionId: params.sessionId,
									messages,
									total: entries.length,
									hasMore: offset + limit < entries.length,
								},
								null,
								2,
							),
						},
					],
					details: { messages, total: entries.length },
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

	// ── pi-session-stats Tool ─────────────────────────────
	pi.registerTool({
		name: "pi-session-stats",
		label: "Pi Session: Stats",
		description: "Get statistics about a Pi session",
		parameters: Type.Object({
			sessionId: Type.Optional(
				Type.String({ description: "Session ID (default: current session)" }),
			),
			folder: Type.Optional(Type.String({ description: "Session folder" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			try {
				// Get current session if no ID provided
				if (!params.sessionId) {
					const branch = ctx.sessionManager.getBranch();
					const stats = calculateSessionStats(branch as any);

					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										success: true,
										currentSession: true,
										stats,
									},
									null,
									2,
								),
							},
						],
						details: { stats },
					};
				}

				// Find and read specific session
				const sessionsDir = getSessionsDir();
				const currentFolder = path.basename(getCurrentSessionDir());
				const folders = params.folder
					? [params.folder]
					: [currentFolder, ...(await listSessionFolders())];

				let foundPath: string | null = null;

				for (const folder of folders) {
					const files = await listSessionFiles(folder);
					const match = files.find(
						(f) => f.includes(params.sessionId!) || f === `${params.sessionId}.jsonl`,
					);
					if (match) {
						foundPath = path.join(sessionsDir, folder, match);
						break;
					}
				}

				if (!foundPath) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify(
									{
										success: false,
										error: "Session not found",
									},
									null,
									2,
								),
							},
						],
						details: { error: "Session not found" },
					};
				}

				const entries = await parseSessionFile(foundPath);
				const stats = calculateSessionStats(entries);

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									success: true,
									sessionId: params.sessionId,
									stats,
								},
								null,
								2,
							),
						},
					],
					details: { stats },
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

	// ── pi-search-session Tool ────────────────────────────
	pi.registerTool({
		name: "pi-search-session",
		label: "Pi Session: Search",
		description: "Search for content in Pi sessions",
		parameters: Type.Object({
			query: Type.String({ description: "Search query" }),
			folder: Type.Optional(Type.String({ description: "Limit to specific folder" })),
			limit: Type.Optional(Type.Number({ description: "Max results per session (default 5)" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			try {
				const sessionsDir = getSessionsDir();
				const folders = params.folder ? [params.folder] : await listSessionFolders();

				const query = params.query.toLowerCase();
				const limit = params.limit || 5;
				const results: any[] = [];

				for (const folder of folders) {
					const files = await listSessionFiles(folder);

					for (const file of files.slice(0, 10)) {
						// Limit to recent 10 files
						const filePath = path.join(sessionsDir, folder, file);
						const entries = await parseSessionFile(filePath);

						const matches = entries.filter((entry) => {
							const content = JSON.stringify(entry).toLowerCase();
							return content.includes(query);
						});

						if (matches.length > 0) {
							results.push({
								sessionId: file.replace(".jsonl", ""),
								folder,
								matches: matches.slice(0, limit).map((m) => ({
									id: m.id,
									role: m.role,
									content: JSON.stringify(m.content || m).slice(0, 200),
								})),
								matchCount: matches.length,
							});
						}
					}
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									success: true,
									query: params.query,
									results: results.slice(0, 20),
									totalSessions: results.length,
								},
								null,
								2,
							),
						},
					],
					details: { results },
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

	// Register command for quick access (renamed to avoid conflict with built-in)
	pi.registerCommand("session-stats", {
		description: "Show current session statistics",
		handler: async (_args, ctx) => {
			const branch = ctx.sessionManager.getBranch();
			const stats = calculateSessionStats(branch as any);

			ctx.ui.notify(
				`Session: ${stats.totalEntries} entries, ${stats.uniqueTools} tools, ${stats.durationFormatted}`,
				"info",
			);
		},
	});
}
