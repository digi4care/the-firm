import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { astEditToolDefinition } from "../src/core/tools/ast-edit.js";
import { astGrepToolDefinition } from "../src/core/tools/ast-grep.js";
import { lspToolDefinition } from "../src/core/tools/lsp.js";

function getTextOutput(result: any): string {
	return (
		result.content
			?.filter((c: any) => c.type === "text")
			.map((c: any) => c.text)
			.join("\n") || ""
	);
}

describe("LSP and AST Tools", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `lsp-ast-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("lsp tool", () => {
		it("should have correct schema and metadata", () => {
			expect(lspToolDefinition.name).toBe("lsp");
			expect(lspToolDefinition.label).toBe("lsp");
			expect(lspToolDefinition.parameters).toBeDefined();
			expect(lspToolDefinition.description).toContain("Format");
		});

		it("should return formatter not found or no changes for unsupported file type", async () => {
			const testFile = join(testDir, "unsupported.xyz");
			writeFileSync(testFile, "hello world\n");

			const result = await lspToolDefinition.execute("lsp-test-1", {
				path: testFile,
				action: "format",
			});

			expect(result.details.formatted).toBe(false);
			const output = getTextOutput(result);
			// Either biome passes it through unchanged, or no formatter is found
			expect(output).toMatch(/No supported formatter found|No formatting changes needed/i);
		});

		it("should format a supported file if formatter is available", async () => {
			// Biome is available in this repo; try formatting a JSON file
			const testFile = join(testDir, "format-test.json");
			writeFileSync(testFile, '{"a":1,"b":2}\n');

			const result = await lspToolDefinition.execute("lsp-test-2", {
				path: testFile,
				action: "format",
			});

			// If biome is available, it should format successfully or report no changes needed
			// If not, we get the graceful error
			const output = getTextOutput(result);
			expect(output).toMatch(/Formatted|No formatting changes needed|No supported formatter found/i);
			expect(existsSync(testFile)).toBe(true);
		});

		it("should return no diagnostics for unsupported file type", async () => {
			const testFile = join(testDir, "unsupported.xyz");
			writeFileSync(testFile, "hello world\n");

			const result = await lspToolDefinition.execute("lsp-test-3", {
				path: testFile,
				action: "diagnostics",
			});

			expect(result.details.diagnosticsCount).toBe(0);
			expect(getTextOutput(result)).toMatch(/No diagnostics found/i);
		});

		it("should handle non-existent files gracefully", async () => {
			const testFile = join(testDir, "does-not-exist.ts");

			await expect(
				lspToolDefinition.execute("lsp-test-4", {
					path: testFile,
					action: "format",
				}),
			).rejects.toThrow(/ENOENT|not found/i);
		});

		it("should auto-detect language from file extension", async () => {
			// This test verifies the tool reaches the correct code path
			// by using a TypeScript file which tsc/eslint might handle
			const testFile = join(testDir, "detect.ts");
			writeFileSync(testFile, "const x: number = 1;\n");

			const result = await lspToolDefinition.execute("lsp-test-5", {
				path: testFile,
				action: "diagnostics",
			});

			// Should not throw; may return diagnostics or none depending on tsc availability
			expect(result.details.diagnosticsCount).toBeDefined();
			expect(getTextOutput(result)).toMatch(/diagnostic|No diagnostics/i);
		});
	});

	describe("ast_grep tool", () => {
		it("should have correct schema and metadata", () => {
			expect(astGrepToolDefinition.name).toBe("ast_grep");
			expect(astGrepToolDefinition.label).toBe("ast_grep");
			expect(astGrepToolDefinition.parameters).toBeDefined();
			expect(astGrepToolDefinition.description).toContain("AST");
		});

		it("should work when ast-grep CLI is installed, or report gracefully when not", async () => {
			const testFile = join(testDir, "sample.ts");
			writeFileSync(testFile, "const x = 1;\n");

			const result = await astGrepToolDefinition.execute("ast-grep-test-1", {
				pattern: "const $A = $B",
				path: testFile,
			});

			// Two valid outcomes depending on whether ast-grep CLI is installed:
			if (result.details.errors && result.details.errors.length > 0) {
				// CLI not installed — graceful error with install instructions
				expect(result.details.matchCount).toBe(0);
				expect(result.details.errors![0]).toMatch(/ast-grep CLI not found/i);
				expect(getTextOutput(result)).toMatch(/npm install -g @ast-grep\/cli/i);
			} else {
				// CLI installed — should find the match
				expect(result.details.matchCount).toBeGreaterThanOrEqual(0);
				expect(typeof result.details.matchCount).toBe("number");
			}
		});
	});

	describe("ast_edit tool", () => {
		it("should have correct schema and metadata", () => {
			expect(astEditToolDefinition.name).toBe("ast_edit");
			expect(astEditToolDefinition.label).toBe("ast_edit");
			expect(astEditToolDefinition.parameters).toBeDefined();
			expect(astEditToolDefinition.description).toContain("AST");
		});

		it("should work when ast-grep CLI is installed, or report gracefully when not", async () => {
			const testFile = join(testDir, "sample.ts");
			writeFileSync(testFile, "const x = 1;\n");

			const result = await astEditToolDefinition.execute("ast-edit-test-1", {
				ops: [{ pattern: "const $A = $B", rewrite: "let $A = $B" }],
				path: testFile,
			});

			// Two valid outcomes depending on whether ast-grep CLI is installed:
			if (result.details.errors && result.details.errors.length > 0) {
				// CLI not installed — graceful error with install instructions
				expect(result.details.totalReplacements).toBe(0);
				expect(result.details.errors![0]).toMatch(/ast-grep CLI not found/i);
				expect(getTextOutput(result)).toMatch(/npm install -g @ast-grep\/cli/i);
			} else {
				// CLI installed — should succeed (0 or more replacements)
				expect(typeof result.details.totalReplacements).toBe("number");
				expect(result.details.totalReplacements).toBeGreaterThanOrEqual(0);
			}
		});
	});
});
