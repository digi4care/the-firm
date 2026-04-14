import { createHash } from "crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEditToolDefinition } from "../src/core/tools/edit.js";
import { createReadToolDefinition } from "../src/core/tools/read.js";

function getTextOutput(result: any): string {
	return (
		result.content
			?.filter((c: any) => c.type === "text")
			.map((c: any) => c.text)
			.join("\n") || ""
	);
}

function computeLineHash(line: string): string {
	return createHash("sha256").update(line).digest("hex").slice(0, 8);
}

describe("Editing settings integration", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `editing-settings-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("readLineNumbers", () => {
		it("should prepend line numbers to read output when enabled", async () => {
			const file = join(testDir, "numbered.txt");
			writeFileSync(file, "line one\nline two\nline three\n");

			const tool = createReadToolDefinition(testDir, { lineNumbers: true });
			const result = await tool.execute("read-test", { path: file }, undefined, undefined, {} as any);
			const output = getTextOutput(result);

			expect(output).toContain("1 | line one");
			expect(output).toContain("2 | line two");
			expect(output).toContain("3 | line three");
		});

		it("should not prepend line numbers when disabled", async () => {
			const file = join(testDir, "plain.txt");
			writeFileSync(file, "line one\nline two\n");

			const tool = createReadToolDefinition(testDir, { lineNumbers: false });
			const result = await tool.execute("read-test", { path: file }, undefined, undefined, {} as any);
			const output = getTextOutput(result);

			expect(output).not.toContain("1 | line one");
			expect(output).toContain("line one\nline two");
		});
	});

	describe("readHashLines", () => {
		it("should append line hashes to read output when enabled", async () => {
			const file = join(testDir, "hashed.txt");
			writeFileSync(file, "alpha\nbeta\n");

			const tool = createReadToolDefinition(testDir, { hashLines: true });
			const result = await tool.execute("read-test", { path: file }, undefined, undefined, {} as any);
			const output = getTextOutput(result);

			expect(output).toContain(`alpha [${computeLineHash("alpha")}]`);
			expect(output).toContain(`beta [${computeLineHash("beta")}]`);
		});

		it("should not append line hashes when disabled", async () => {
			const file = join(testDir, "plain.txt");
			writeFileSync(file, "alpha\nbeta\n");

			const tool = createReadToolDefinition(testDir, { hashLines: false });
			const result = await tool.execute("read-test", { path: file }, undefined, undefined, {} as any);
			const output = getTextOutput(result);

			expect(output).not.toContain("[");
			expect(output).toContain("alpha\nbeta");
		});
	});

	describe("combined read options", () => {
		it("should support both line numbers and hashes together", async () => {
			const file = join(testDir, "both.txt");
			writeFileSync(file, "alpha\nbeta\n");

			const tool = createReadToolDefinition(testDir, { lineNumbers: true, hashLines: true });
			const result = await tool.execute("read-test", { path: file }, undefined, undefined, {} as any);
			const output = getTextOutput(result);

			expect(output).toContain(`1 | alpha [${computeLineHash("alpha")}]`);
			expect(output).toContain(`2 | beta [${computeLineHash("beta")}]`);
		});
	});

	describe("edit.mode replace", () => {
		it("should perform exact-text replacement", async () => {
			const file = join(testDir, "replace.txt");
			writeFileSync(file, "hello world\n");

			const tool = createEditToolDefinition(testDir, { mode: "replace" });
			const result = await tool.execute("edit-test", {
				path: file,
				edits: [{ oldText: "hello world", newText: "goodbye world" }],
			}, undefined, undefined, {} as any);

			expect(getTextOutput(result)).toContain("Successfully replaced");
			expect(readFileSync(file, "utf-8")).toBe("goodbye world\n");
		});
	});

	describe("edit.mode hashline", () => {
		it("should support hash-based edits", async () => {
			const file = join(testDir, "hashline.txt");
			writeFileSync(file, "line one\nline two\nline three\n");

			const tool = createEditToolDefinition(testDir, { mode: "hashline" });
			const hash = computeLineHash("line two");
			const result = await tool.execute("edit-test", {
				path: file,
				edits: [{ hash, oldText: "", newText: "replaced two" }],
			}, undefined, undefined, {} as any);

			expect(getTextOutput(result)).toContain("Successfully replaced");
			expect(readFileSync(file, "utf-8")).toBe("line one\nreplaced two\nline three\n");
		});

		it("should fall back to oldText when hash is not provided in hashline mode", async () => {
			const file = join(testDir, "hashline-fallback.txt");
			writeFileSync(file, "alpha\nbeta\n");

			const tool = createEditToolDefinition(testDir, { mode: "hashline" });
			const result = await tool.execute("edit-test", {
				path: file,
				edits: [{ oldText: "beta", newText: "gamma" }],
			}, undefined, undefined, {} as any);

			expect(getTextOutput(result)).toContain("Successfully replaced");
			expect(readFileSync(file, "utf-8")).toBe("alpha\ngamma\n");
		});

		it("should reject hash-based edit when hash does not match any line", async () => {
			const file = join(testDir, "hashline-bad.txt");
			writeFileSync(file, "alpha\nbeta\n");

			const tool = createEditToolDefinition(testDir, { mode: "hashline" });
			await expect(
				tool.execute("edit-test", {
					path: file,
					edits: [{ hash: "00000000", oldText: "", newText: "gamma" }],
				}, undefined, undefined, {} as any),
			).rejects.toThrow(/hash|not found/i);
		});
	});
});
