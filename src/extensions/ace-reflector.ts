/**
 * ACE Reflector - Automated Session Analysis Extension
 *
 * Provides a streamlined ACE reflection workflow:
 *   - /ace-reflect: Quick reflection on current session
 *   - /ace-reflect verbose: Detailed analysis
 *   - /ace-reflect technical: With tool statistics
 *   - /ace-reflect <session-id>: Analyze specific session
 *
 * Usage: pi -e extensions/ace-reflector.ts
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { getSetting } from "./settings/lib/settings-store";

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
			.reverse();
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

interface SessionStats {
	totalEntries: number;
	userMessages: number;
	assistantMessages: number;
	toolResults: number;
	toolCalls: number;
	uniqueTools: string[];
	durationMs: number;
}

function calculateStats(entries: SessionEntry[]): SessionStats {
	const userMessages = entries.filter((e) => e.role === "user");
	const assistantMessages = entries.filter((e) => e.role === "assistant");
	const toolResults = entries.filter((e) => e.role === "toolResult");
	const toolCalls = entries.filter(
		(e) =>
			e.type === "message" && (e as any).message?.content?.some((c: any) => c.type === "toolCall"),
	);

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
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
	return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

// ── ACE Scoring Functions ───────────────────────────────────

function calculateACEScore(stats: SessionStats, entries: SessionEntry[]): any {
	// Completeness: Did we get meaningful work done?
	const completeness = Math.min(5, Math.floor((stats.totalEntries / 10) * 5));

	// Accuracy: Check for tool errors
	const errorEntries = entries.filter((e) => e.role === "toolResult" && (e as any).isError);
	const accuracy = errorEntries.length === 0 ? 5 : Math.max(1, 5 - errorEntries.length);

	// Efficiency: Good tool usage without spam
	const efficiency = stats.toolCalls > 0 && stats.toolCalls < 50 ? 4 : 3;

	// Clarity: Based on message length (proxy for verbose vs concise)
	const avgLength =
		entries.reduce((sum, e) => sum + (e.content?.length || 0), 0) / stats.totalEntries;
	const clarity = avgLength > 50 && avgLength < 2000 ? 5 : 4;

	// Relevance: Hard to measure without user feedback, give benefit of doubt
	const relevance = 4;

	return {
		completeness,
		accuracy,
		efficiency,
		clarity,
		relevance,
		total: completeness + accuracy + efficiency + clarity + relevance,
	};
}

function generateReflectionReport(
	stats: SessionStats,
	score: any,
	mode: string,
	sessionId?: string,
): string {
	const modeLabel = mode === "technical" ? "Technical" : mode === "verbose" ? "Verbose" : "Default";

	let report = `# ACE Reflection Report (${modeLabel})
`;

	if (sessionId) {
		report += `**Session:** ${sessionId}\n`;
	}
	report += `**Analyzed:** ${new Date().toISOString()}\n\n`;

	report += `## Session Summary\n`;
	report += `- **Total entries:** ${stats.totalEntries}\n`;
	report += `- **User messages:** ${stats.userMessages}\n`;
	report += `- **Assistant messages:** ${stats.assistantMessages}\n`;
	report += `- **Tool calls:** ${stats.toolCalls}\n`;
	if (stats.uniqueTools.length > 0) {
		report += `- **Tools used:** ${stats.uniqueTools.join(", ")}\n`;
	}
	report += `- **Duration:** ${formatDuration(stats.durationMs)}\n\n`;

	report += `## Scores\n`;
	report += `| Criterium | Score | Notes |\n`;
	report += `|-----------|-------|-------|\n`;
	report += `| Completeness | ${score.completeness}/5 | ${score.completeness >= 3 ? "Good work done" : "Limited output"} |\n`;
	report += `| Accuracy | ${score.accuracy}/5 | ${score.accuracy === 5 ? "No errors detected" : "Some errors occurred"} |\n`;
	report += `| Efficiency | ${score.efficiency}/5 | ${stats.toolCalls} tool calls |\n`;
	report += `| Clarity | ${score.clarity}/5 | Response length appropriate |\n`;
	report += `| Relevance | ${score.relevance}/5 | On-topic |\n`;
	report += `| **Total** | **${score.total}/25** | |\n\n`;

	report += `## Findings\n`;

	// Auto-detect patterns
	const patterns: string[] = [];

	if (stats.toolCalls > 50) {
		patterns.push("- **High tool usage**: Consider batching operations");
	}
	if (stats.uniqueTools.length > 10) {
		patterns.push("- **Diverse toolset**: Good exploration of available tools");
	}
	if (stats.userMessages > 10) {
		patterns.push("- **Active collaboration**: Multiple interaction rounds");
	}
	if (stats.durationMs > 3600000) {
		patterns.push("- **Extended session**: Consider breaking into smaller sessions");
	}

	if (patterns.length === 0) {
		patterns.push("- Session appears well-structured");
	}

	report += patterns.join("\n") + "\n\n";

	report += `## Suggestions\n`;
	if (score.total >= 20) {
		report += `- **Keep it up!** Session quality is good.\n`;
	} else if (score.total >= 15) {
		report += `- Consider breaking complex tasks into smaller steps\n`;
		report += `- Review tool usage patterns for efficiency gains\n`;
	} else {
		report += `- Session may benefit from clearer initial prompts\n`;
		report += `- Consider using more focused, iterative approach\n`;
	}

	report += `\n## Decision\n`;
	if (score.total >= 20) {
		report += `- [x] No changes needed (score ≥ 20)\n`;
		report += `- [ ] Suggestions for review (score 15-19)\n`;
		report += `- [ ] Changes recommended (score < 15)\n`;
	} else if (score.total >= 15) {
		report += `- [ ] No changes needed (score ≥ 20)\n`;
		report += `- [x] Suggestions for review (score 15-19)\n`;
		report += `- [ ] Changes recommended (score < 15)\n`;
	} else {
		report += `- [ ] No changes needed (score ≥ 20)\n`;
		report += `- [ ] Suggestions for review (score 15-19)\n`;
		report += `- [x] Changes recommended (score < 15)\n`;
	}

	return report;
}

// ── Extension ─────────────────────────────────────────────

export default async function aceReflector(pi: ExtensionAPI) {
	function isEnabled(): boolean {
		const val = getSetting("theFirm.aceReflection");
		return val === true; // default false
	}

	// Skip registration entirely if disabled
	if (!isEnabled()) {
		return;
	}

	// ── pi-ace-analyze Tool ───────────────────────────────
	pi.registerTool({
		name: "pi-ace-analyze",
		label: "ACE: Analyze Session",
		description: "Analyze current or specified session using ACE framework",
		parameters: Type.Object({
			sessionId: Type.Optional(
				Type.String({
					description: "Session ID to analyze (default: current)",
				}),
			),
			folder: Type.Optional(Type.String({ description: "Session folder" })),
			mode: Type.Optional(
				Type.Union([Type.Literal("default"), Type.Literal("verbose"), Type.Literal("technical")], {
					description: "Analysis mode",
				}),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			try {
				const mode = params.mode || "default";
				let stats: SessionStats;
				let entries: SessionEntry[];
				let sessionId = params.sessionId || "current";

				if (!params.sessionId) {
					// Current session
					const branch = ctx.sessionManager.getBranch() as any;
					entries = branch.map((e: any) => ({
						id: e.id,
						type: e.type,
						role: e.message?.role,
						content: e.message?.content?.[0]?.text || "",
						timestamp: e.message?.timestamp,
						toolName: e.message?.toolName,
					}));
					stats = calculateStats(entries);
				} else {
					// Specific session
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
							sessionId = match.replace(".jsonl", "");
							break;
						}
					}

					if (!foundPath) {
						return {
							content: [
								{
									type: "text" as const,
									text: `Session not found: ${params.sessionId}`,
								},
							],
							details: { error: "Session not found" },
						};
					}

					entries = await parseSessionFile(foundPath);
					stats = calculateStats(entries);
				}

				const score = calculateACEScore(stats, entries);
				const report = generateReflectionReport(stats, score, mode, sessionId);

				return {
					content: [{ type: "text" as const, text: report }],
					details: { stats, score, sessionId },
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

	// ── /ace-reflect Command ─────────────────────────────
	pi.registerCommand("ace-reflect", {
		description: "ACE reflection. Usage: /ace-reflect [--verbose] [--technical] [session:<id>]",
		handler: async (args, ctx) => {
			// Parse arguments
			const isVerbose = args?.includes("--verbose") || args?.includes("-v");
			const isTechnical = args?.includes("--technical") || args?.includes("-t");
			const sessionIdMatch = args?.match(/session[:\s]+(\S+)/);
			const sessionId = sessionIdMatch ? sessionIdMatch[1] : undefined;
			const mode = isTechnical ? "technical" : isVerbose ? "verbose" : "default";

			// Get session data
			let stats: SessionStats;
			let entries: SessionEntry[];

			if (sessionId) {
				const sessionsDir = getSessionsDir();
				const currentFolder = path.basename(getCurrentSessionDir());
				const folders = [currentFolder, ...(await listSessionFolders())];

				let foundPath: string | null = null;

				for (const folder of folders) {
					const files = await listSessionFiles(folder);
					const match = files.find((f) => f.includes(sessionId) || f === `${sessionId}.jsonl`);
					if (match) {
						foundPath = path.join(sessionsDir, folder, match);
						break;
					}
				}

				if (!foundPath) {
					ctx.ui.notify(`Session not found: ${sessionId}`, "error");
					return;
				}

				entries = await parseSessionFile(foundPath);
				stats = calculateStats(entries);
			} else {
				const branch = ctx.sessionManager.getBranch() as any;
				entries = branch.map((e: any) => ({
					id: e.id,
					type: e.type,
					role: e.message?.role,
					content: e.message?.content?.[0]?.text || "",
					timestamp: e.message?.timestamp,
					toolName: e.message?.toolName,
				}));
				stats = calculateStats(entries);
			}

			const score = calculateACEScore(stats, entries);
			const report = generateReflectionReport(stats, score, mode, sessionId);

			// Show as markdown
			await ctx.ui.custom(
				(tui, theme, kb, done) => {
					const lines = report.split("\n");
					return {
						render: (w: number) => {
							const Container = require("@mariozechner/pi-tui").Container;
							const Text = require("@mariozechner/pi-tui").Text;
							const Markdown = require("@mariozechner/pi-tui").Markdown;

							const container = new Container();
							container.addChild(new Text(`${theme.fg("accent", "═".repeat(50))}`, 0, 0));
							container.addChild(new Text(theme.fg("accent", " ACE REFLECTION REPORT "), 0, 0));
							container.addChild(new Text(`${theme.fg("accent", "═".repeat(50))}`, 0, 0));

							lines.forEach((line) => {
								if (line.startsWith("# ")) {
									container.addChild(new Text(theme.fg("success", line), 0, 0));
								} else if (line.startsWith("## ")) {
									container.addChild(new Text(theme.fg("accent", line), 0, 0));
								} else if (line.startsWith("- ")) {
									container.addChild(new Text(theme.fg("dim", line), 0, 0));
								} else if (line.startsWith("|")) {
									container.addChild(new Text(theme.fg("dim", line), 0, 0));
								} else {
									container.addChild(new Text(line, 0, 0));
								}
							});

							container.addChild(new Text(`${theme.fg("accent", "═".repeat(50))}`, 0, 0));

							return container.render(w);
						},
						handleInput: (data: string) => {
							done(undefined);
						},
						invalidate: () => {},
					};
				},
				{ overlay: true },
			);
		},
	});
}
