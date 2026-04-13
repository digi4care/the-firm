/**
 * LSP (Language Server Protocol) tool for The Firm.
 *
 * Provides formatting and diagnostics via available CLI formatters and linters.
 * This is a pragmatic implementation that delegates to common language tools
 * rather than maintaining persistent LSP server connections.
 */
import type { AgentTool } from "@digi4care/the-firm-agent-core";
import { type Static, Type } from "@sinclair/typebox";
import { spawn } from "child_process";
import { readFile, writeFile } from "fs/promises";
import { resolveToCwd } from "./path-utils.js";

const lspSchema = Type.Object({
	path: Type.String({ description: "Path to the file to format or analyze" }),
	action: Type.Enum({ format: "format", diagnostics: "diagnostics" } as const, {
		description: "LSP action to perform",
	}),
	language: Type.Optional(
		Type.String({ description: "Language identifier (e.g., 'typescript', 'python'). Auto-detected if not provided" }),
	),
});

export type LspToolInput = Static<typeof lspSchema>;

export interface LspToolDetails {
	formatted?: boolean;
	diagnosticsCount?: number;
	errors?: string[];
}

interface LspDiagnostic {
	severity: "error" | "warning" | "info" | "hint";
	message: string;
	line?: number;
	column?: number;
}

interface FormatterResult {
	success: boolean;
	content?: string;
	error?: string;
}

interface DiagnosticsResult {
	success: boolean;
	diagnostics: LspDiagnostic[];
	error?: string;
}

function detectLanguageFromPath(filePath: string): string | undefined {
	const ext = filePath.split(".").pop()?.toLowerCase();
	const langMap: Record<string, string> = {
		ts: "typescript",
		tsx: "typescript",
		js: "javascript",
		jsx: "javascript",
		py: "python",
		rs: "rust",
		go: "go",
		java: "java",
		c: "c",
		cpp: "cpp",
		h: "c",
		hpp: "cpp",
		json: "json",
		md: "markdown",
		yaml: "yaml",
		yml: "yaml",
		html: "html",
		css: "css",
		scss: "scss",
		sass: "sass",
		vue: "vue",
		svelte: "svelte",
	};
	return langMap[ext ?? ""];
}

async function execCommand(
	cmd: string,
	args: string[],
	input?: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";

		child.stdout?.on("data", (data) => {
			stdout += data.toString();
		});

		child.stderr?.on("data", (data) => {
			stderr += data.toString();
		});

		child.on("close", (code) => {
			resolve({ stdout, stderr, code: code ?? 1 });
		});

		if (input !== undefined) {
			child.stdin?.write(input);
			child.stdin?.end();
		}
	});
}

async function tryFormatContent(
	content: string,
	_language: string | undefined,
	filePath: string,
): Promise<FormatterResult> {
	const ext = filePath.split(".").pop()?.toLowerCase();

	// Try biome first (fast, multi-language)
	const biomeResult = await execCommand("bunx", ["biome", "format", "--stdin-file-path", filePath], content);
	if (biomeResult.code === 0) {
		return { success: true, content: biomeResult.stdout };
	}

	// Try prettier for web languages
	if (
		["ts", "tsx", "js", "jsx", "json", "md", "yaml", "yml", "html", "css", "scss", "sass", "vue", "svelte"].includes(
			ext ?? "",
		)
	) {
		const prettierResult = await execCommand("bunx", ["prettier", "--stdin-filepath", filePath], content);
		if (prettierResult.code === 0) {
			return { success: true, content: prettierResult.stdout };
		}
	}

	// Try rustfmt for Rust
	if (ext === "rs") {
		const rustfmtResult = await execCommand("rustfmt", ["--emit", "stdout"], content);
		if (rustfmtResult.code === 0) {
			return { success: true, content: rustfmtResult.stdout };
		}
	}

	// Try gofmt for Go
	if (ext === "go") {
		const gofmtResult = await execCommand("gofmt", [], content);
		if (gofmtResult.code === 0) {
			return { success: true, content: gofmtResult.stdout };
		}
	}

	// Try black for Python
	if (ext === "py") {
		const blackResult = await execCommand("python3", ["-m", "black", "-q", "-"], content);
		if (blackResult.code === 0) {
			return { success: true, content: blackResult.stdout };
		}
	}

	return {
		success: false,
		error: "No supported formatter found for this file type. Install biome, prettier, rustfmt, gofmt, or black.",
	};
}

async function tryGetDiagnostics(
	_content: string,
	_language: string | undefined,
	filePath: string,
): Promise<DiagnosticsResult> {
	const diagnostics: LspDiagnostic[] = [];
	const ext = filePath.split(".").pop()?.toLowerCase();

	// Try tsc for TypeScript
	if (["ts", "tsx"].includes(ext ?? "")) {
		// Write to temp file since tsc needs a file path
		const tscResult = await execCommand("bunx", ["tsc", "--noEmit", "--pretty", "false", filePath]);
		if (tscResult.stdout || tscResult.stderr) {
			const output = tscResult.stdout + tscResult.stderr;
			const lines = output.split("\n");
			for (const line of lines) {
				const match = line.match(/(.+)\((\d+),(\d+)\):\s*(error|warning)\s+TS\d+:\s*(.+)/);
				if (match) {
					diagnostics.push({
						severity: match[4] === "error" ? "error" : "warning",
						message: match[5].trim(),
						line: Number.parseInt(match[2], 10),
						column: Number.parseInt(match[3], 10),
					});
				}
			}
		}
		return { success: true, diagnostics };
	}

	// Try eslint for JS/TS
	if (["js", "jsx", "ts", "tsx", "vue", "svelte"].includes(ext ?? "")) {
		const eslintResult = await execCommand("bunx", ["eslint", "--format", "json", filePath]);
		try {
			const eslintOutput = JSON.parse(eslintResult.stdout);
			for (const fileResult of eslintOutput) {
				for (const message of fileResult.messages ?? []) {
					diagnostics.push({
						severity: message.severity === 2 ? "error" : "warning",
						message: message.message,
						line: message.line,
						column: message.column,
					});
				}
			}
			return { success: true, diagnostics };
		} catch {
			// ESLint failed or produced non-JSON output, continue
		}
	}

	// Try biome lint
	const biomeLintResult = await execCommand("bunx", ["biome", "lint", filePath]);
	if (biomeLintResult.stdout || biomeLintResult.stderr) {
		const output = biomeLintResult.stdout + biomeLintResult.stderr;
		const lines = output.split("\n");
		for (const line of lines) {
			const match = line.match(/(.+):(\d+):(\d+)\s+(error|warn|info)\s+(.+)/);
			if (match) {
				diagnostics.push({
					severity: match[4] === "error" ? "error" : match[4] === "warn" ? "warning" : "info",
					message: match[5].trim(),
					line: Number.parseInt(match[2], 10),
					column: Number.parseInt(match[3], 10),
				});
			}
		}
		return { success: true, diagnostics };
	}

	return { success: true, diagnostics: [] };
}

export const lspToolDefinition = {
	name: "lsp",
	label: "lsp",
	description:
		"Format a file or get diagnostics using available language tools (formatters like biome/prettier, linters like tsc/eslint).",
	parameters: lspSchema,
	async execute(
		_toolCallId: string,
		params: LspToolInput,
		signal?: AbortSignal,
	): Promise<{
		content: Array<{ type: "text"; text: string }>;
		details: LspToolDetails;
	}> {
		const absolutePath = resolveToCwd(params.path, process.cwd());
		const detectedLanguage = params.language ?? detectLanguageFromPath(absolutePath);

		if (signal?.aborted) {
			throw new Error("Operation aborted");
		}

		if (params.action === "format") {
			const content = await readFile(absolutePath, "utf-8");
			const result = await tryFormatContent(content, detectedLanguage, absolutePath);

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Formatting failed" }],
					details: { formatted: false, errors: [result.error ?? "Formatting failed"] },
				};
			}

			if (result.content !== undefined && result.content !== content) {
				await writeFile(absolutePath, result.content, "utf-8");
				return {
					content: [{ type: "text", text: `Formatted ${params.path}` }],
					details: { formatted: true },
				};
			}

			return {
				content: [{ type: "text", text: `No formatting changes needed for ${params.path}` }],
				details: { formatted: false },
			};
		}

		if (params.action === "diagnostics") {
			const content = await readFile(absolutePath, "utf-8");
			const result = await tryGetDiagnostics(content, detectedLanguage, absolutePath);

			if (!result.success) {
				return {
					content: [{ type: "text", text: result.error ?? "Diagnostics failed" }],
					details: { diagnosticsCount: 0, errors: [result.error ?? "Diagnostics failed"] },
				};
			}

			if (result.diagnostics.length === 0) {
				return {
					content: [{ type: "text", text: `No diagnostics found for ${params.path}` }],
					details: { diagnosticsCount: 0 },
				};
			}

			const lines: string[] = [`Found ${result.diagnostics.length} diagnostic(s) for ${params.path}:`];
			for (const diag of result.diagnostics) {
				const loc =
					diag.line !== undefined ? `:${diag.line}${diag.column !== undefined ? `:${diag.column}` : ""}` : "";
				lines.push(`[${diag.severity.toUpperCase()}]${loc} ${diag.message}`);
			}

			return {
				content: [{ type: "text", text: lines.join("\n") }],
				details: { diagnosticsCount: result.diagnostics.length },
			};
		}

		return {
			content: [{ type: "text", text: `Unknown action: ${params.action}` }],
			details: { errors: [`Unknown action: ${params.action}`] },
		};
	},
} satisfies AgentTool<typeof lspSchema, LspToolDetails>;
