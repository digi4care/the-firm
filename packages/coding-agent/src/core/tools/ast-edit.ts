/**
 * AST Edit tool for The Firm.
 *
 * Structural AST rewrites using ast-grep CLI if available.
 * Falls back to informative error with installation instructions.
 */
import type { AgentTool } from "@digi4care/the-firm-agent-core";
import { type Static, Type } from "@sinclair/typebox";
import { spawn } from "child_process";
import { resolveToCwd } from "./path-utils.js";

const astEditOpSchema = Type.Object({
	pattern: Type.String({ description: "AST pattern to match" }),
	rewrite: Type.String({ description: "Replacement template" }),
});

const astEditSchema = Type.Object({
	ops: Type.Array(astEditOpSchema, {
		description: "Rewrite operations as [{ pattern, rewrite }]",
	}),
	path: Type.Optional(Type.String({ description: "File or directory to rewrite (default: cwd)" })),
	language: Type.Optional(Type.String({ description: "Language override (e.g., 'ts', 'js', 'python')" })),
});

export type AstEditToolInput = Static<typeof astEditSchema>;

export interface AstEditToolDetails {
	totalReplacements: number;
	filesTouched: number;
	errors?: string[];
}

async function checkAstGrepAvailable(): Promise<boolean> {
	return new Promise((resolve) => {
		const child = spawn("ast-grep", ["--version"], { stdio: ["ignore", "ignore", "ignore"] });
		child.on("close", (code) => resolve(code === 0));
		child.on("error", () => resolve(false));
	});
}

async function execAstEdit(
	pattern: string,
	rewrite: string,
	searchPath: string,
	language?: string,
): Promise<{ success: boolean; replacements: number; filesTouched: number; error?: string }> {
	return new Promise((resolve) => {
		const args = ["run", "--pattern", pattern, "--rewrite", rewrite];
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

		child.on("close", (code) => {
			// ast-grep rewrite exits 0 on success even when making changes
			const output = stdout + stderr;
			const match = output.match(/replaced\s+(\d+)\s+occurrences?\s+in\s+(\d+)\s+file/i);
			if (match) {
				resolve({
					success: true,
					replacements: Number.parseInt(match[1], 10),
					filesTouched: Number.parseInt(match[2], 10),
				});
				return;
			}
			// No replacements made
			if (code === 0) {
				resolve({ success: true, replacements: 0, filesTouched: 0 });
				return;
			}
			resolve({
				success: false,
				replacements: 0,
				filesTouched: 0,
				error: stderr || "ast-grep rewrite failed",
			});
		});

		child.on("error", () => {
			resolve({
				success: false,
				replacements: 0,
				filesTouched: 0,
				error: "ast-grep not available",
			});
		});
	});
}

export const astEditToolDefinition = {
	name: "ast_edit",
	label: "ast_edit",
	description:
		"Structural AST rewrites using patterns. Requires ast-grep CLI to be installed (npm install -g @ast-grep/cli).",
	parameters: astEditSchema,
	async execute(
		_toolCallId: string,
		params: AstEditToolInput,
		signal?: AbortSignal,
	): Promise<{
		content: Array<{ type: "text"; text: string }>;
		details: AstEditToolDetails;
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
					totalReplacements: 0,
					filesTouched: 0,
					errors: ["ast-grep CLI not found"],
				},
			};
		}

		const searchPath = params.path ? resolveToCwd(params.path, process.cwd()) : process.cwd();
		let totalReplacements = 0;
		let totalFilesTouched = 0;
		const errors: string[] = [];

		for (const op of params.ops) {
			const result = await execAstEdit(op.pattern, op.rewrite, searchPath, params.language);

			if (!result.success) {
				errors.push(result.error ?? `Failed to apply rewrite: ${op.pattern}`);
				continue;
			}

			totalReplacements += result.replacements;
			totalFilesTouched += result.filesTouched;
		}

		if (errors.length > 0 && totalReplacements === 0) {
			return {
				content: [{ type: "text", text: errors.join("\n") }],
				details: {
					totalReplacements: 0,
					filesTouched: 0,
					errors,
				},
			};
		}

		const lines: string[] = [`Applied ${totalReplacements} replacement(s) across ${totalFilesTouched} file(s).`];
		if (errors.length > 0) {
			lines.push("", "Some operations had errors:");
			lines.push(...errors);
		}

		return {
			content: [{ type: "text", text: lines.join("\n") }],
			details: {
				totalReplacements,
				filesTouched: totalFilesTouched,
				...(errors.length > 0 ? { errors } : {}),
			},
		};
	},
} satisfies AgentTool<typeof astEditSchema, AstEditToolDetails>;
