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

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import {
	calculateSessionStats,
	findSessionFile,
	formatDuration,
	getCurrentSessionDir,
	listSessionFiles,
	listSessionFolders,
	parseSessionFile,
	type SessionEntry,
} from "./shared/session-io.js";

// ── Helper Functions ────────────────────────────────────────

function extractSessionTitle(entries: SessionEntry[]): string {
	// Find first user message as title
	const userMsg = entries.find((e) => e.role === "user" && e.content);
	if (userMsg?.content) {
		return userMsg.content.slice(0, 60) + (userMsg.content.length > 60 ? "..." : "");
	}
	return "Untitled Session";
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
				const folders = await listSessionFolders();
				const limit = params.limit || 10;
				const targetFolder = params.projectFolder;

				const results: Array<{
					id: string;
					folder: string;
					title: string;
					entries: number;
					startTime?: number;
					endTime?: number;
				}> = [];

				const foldersToScan = targetFolder ? [targetFolder] : folders;

				for (const folder of foldersToScan) {
					const files = await listSessionFiles(folder);
					const limitedFiles = files.slice(0, limit);

					for (const file of limitedFiles) {
						const filePath = `${folder}/${file}`;
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
				// Find the session file
				const currentFolder = getCurrentSessionDir().split("/").pop() || "";
				const folders = params.folder
					? [params.folder]
					: [currentFolder, ...(await listSessionFolders())];

				const found = await findSessionFile(params.sessionId, folders);

				if (!found) {
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

				const entries = await parseSessionFile(found.path);
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
							: JSON.stringify(entry.content).slice(0, 500),
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
					const branch = ctx.sessionManager.getBranch() as SessionEntry[];
					const stats = calculateSessionStats(branch);

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
				const currentFolder = getCurrentSessionDir().split("/").pop() || "";
				const folders = params.folder
					? [params.folder]
					: [currentFolder, ...(await listSessionFolders())];

				const found = await findSessionFile(params.sessionId, folders);

				if (!found) {
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

				const entries = await parseSessionFile(found.path);
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
				const folders = params.folder ? [params.folder] : await listSessionFolders();

				const query = params.query.toLowerCase();
				const limit = params.limit || 5;
				const results: Array<{
					sessionId: string;
					folder: string;
					matches: Array<{ id: string; role?: string; content: string }>;
					matchCount: number;
				}> = [];

				for (const folder of folders) {
					const files = await listSessionFiles(folder);

					for (const file of files.slice(0, 10)) {
						// Limit to recent 10 files
						const filePath = `${folder}/${file}`;
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
			const branch = ctx.sessionManager.getBranch() as SessionEntry[];
			const stats = calculateSessionStats(branch);

			ctx.ui.notify(
				`Session: ${stats.totalEntries} entries, ${stats.uniqueTools.length} tools, ${formatDuration(stats.durationMs)}`,
				"info",
			);
		},
	});
}
