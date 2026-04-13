/**
 * AST Grep tool for The Firm.
 *
 * Structural AST search using ast-grep CLI if available.
 * Falls back to informative error with installation instructions.
 */
import type { AgentTool } from "@digi4care/the-firm-agent-core";
import { type Static, Type } from "@sinclair/typebox";
import { spawn } from "child_process";
import { resolveToCwd } from "./path-utils.js";

const astGrepSchema = Type.Object({
	pattern: Type.String({ description: "AST pattern to search for" }),
	path: Type.Optional(Type.String({ description: "File or directory to search (default: cwd)" })),
	language: Type.Optional(Type.String({ description: "Language override (e.g., 'ts', 'js', 'python')" })),
	limit: Type.Optional(Type.Number({ description: "Maximum number of matches (default: 50)" })),
});

export type AstGrepToolInput = Static<typeof astGrepSchema>;

export interface AstGrepToolDetails {
	matchCount: number;
	filesSearched?: number;
	errors?: string[];
}

interface AstMatch {
	file: string;
	line: number;
	column: number;
	text: string;
}

async function checkAstGrepAvailable(): Promise<boolean> {
	return new Promise((resolve) => {
		const child = spawn("ast-grep", ["--version"], { stdio: ["ignore", "ignore", "ignore"] });
		child.on("close", (code) => resolve(code === 0));
		child.on("error", () => resolve(false));
	});
}

async function execAstGrep(
	pattern: string,
	searchPath: string,
	language?: string,
	limit?: number,
): Promise<{ success: boolean; matches: AstMatch[]; error?: string }> {
	return new Promise((resolve) => {
		const args = ["run", "--pattern", pattern, "--json"];
		if (language) {
			args.push("--lang", language);
		}
		args.push(searchPath);

		const child = spawn("ast-grep", args, { stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";

		child.stdout?.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr?.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (_code) => {
			try {
				const lines = stdout.split("\n").filter((l) => l.trim());
				const matches: AstMatch[] = [];

				for (const line of lines) {
					try {
						const parsed = JSON.parse(line);
						if (parsed.file && parsed.line) {
							matches.push({
								file: parsed.file,
								line: parsed.line,
								column: parsed.column ?? 0,
								text: parsed.text ?? "",
							});
						}
					} catch {
						// Skip non-JSON lines
					}
				}

				const effectiveLimit = limit ?? 50;
				const limitedMatches = matches.slice(0, effectiveLimit);

				resolve({
					success: true,
					matches: limitedMatches,
				});
			} catch {
				resolve({
					success: false,
					matches: [],
					error: stderr || "ast-grep failed to parse output",
				});
			}
		});

		child.on("error", () => {
			resolve({
				success: false,
				matches: [],
				error: "ast-grep not available",
			});
		});
	});
}

export const astGrepToolDefinition = {
	name: "ast_grep",
	label: "ast_grep",
	description:
		"Structural AST search using patterns. Requires ast-grep CLI to be installed (npm install -g @ast-grep/cli).",
	parameters: astGrepSchema,
	async execute(
		_toolCallId: string,
		params: AstGrepToolInput,
		signal?: AbortSignal,
	): Promise<{
		content: Array<{ type: "text"; text: string }>;
		details: AstGrepToolDetails;
	}> {
		if (signal?.aborted) {
			throw new Error("Operation aborted");
		}

		const isAvailable = await checkAstGrepAvailable();
		if (!isAvailable) {
			return {
				content: [
					{
						type: "text",
						text: "ast-grep CLI not found. Install with: npm install -g @ast-grep/cli\nOr visit: https://ast-grep.github.io/guide/quick-start.html",
					},
				],
				details: {
					matchCount: 0,
					errors: ["ast-grep CLI not found"],
				},
			};
		}

		const searchPath = params.path ? resolveToCwd(params.path, process.cwd()) : process.cwd();

		const result = await execAstGrep(params.pattern, searchPath, params.language, params.limit);

		if (!result.success) {
			return {
				content: [{ type: "text", text: result.error ?? "AST grep failed" }],
				details: { matchCount: 0, errors: [result.error ?? "AST grep failed"] },
			};
		}

		if (result.matches.length === 0) {
			return {
				content: [{ type: "text", text: `No matches found for pattern: ${params.pattern}` }],
				details: { matchCount: 0 },
			};
		}

		const lines: string[] = [`Found ${result.matches.length} match(es) for pattern: ${params.pattern}`];
		for (const match of result.matches) {
			const text = match.text.replace(/\s+/g, " ").slice(0, 80);
			lines.push(`${match.file}:${match.line}:${match.column}: ${text}`);
		}

		if (result.matches.length >= (params.limit ?? 50)) {
			lines.push("(Result limit reached, use limit parameter to see more)");
		}

		return {
			content: [{ type: "text", text: lines.join("\n") }],
			details: { matchCount: result.matches.length },
		};
	},
} satisfies AgentTool<typeof astGrepSchema, AstGrepToolDetails>;
