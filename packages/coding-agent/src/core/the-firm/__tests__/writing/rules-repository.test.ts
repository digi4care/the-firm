import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { RuleMetadata } from "../../writing/rules-repository.ts";
import { RulesRepository } from "../../writing/rules-repository.ts";

let testDir: string;
let repo: RulesRepository;

beforeEach(async () => {
	testDir = join(tmpdir(), `rules-repo-test-${Date.now()}`);
	await mkdir(testDir, { recursive: true });
	repo = new RulesRepository(testDir);
});

afterEach(async () => {
	await rm(testDir, { recursive: true, force: true });
});

describe("RulesRepository", () => {
	describe("read/write round-trip", () => {
		it("writes then reads back the same content", async () => {
			const content = "---\nalwaysApply: true\n---\n# Rule body";
			await repo.write("my-rule.md", content);
			const result = await repo.read("my-rule.md");
			expect(result).toBe(content);
		});

		it("returns null for non-existent file", async () => {
			const result = await repo.read("no-such.md");
			expect(result).toBeNull();
		});

		it("writes into subdirectories", async () => {
			const content = "# nested rule";
			await repo.write("sub/dir/rule.md", content);
			const result = await repo.read("sub/dir/rule.md");
			expect(result).toBe(content);
		});
	});

	describe("exists", () => {
		it("returns true for existing file", async () => {
			await repo.write("exists.md", "content");
			expect(await repo.exists("exists.md")).toBe(true);
		});

		it("returns false for missing file", async () => {
			expect(await repo.exists("missing.md")).toBe(false);
		});
	});

	describe("delete", () => {
		it("removes a file", async () => {
			await repo.write("to-delete.md", "bye");
			expect(await repo.exists("to-delete.md")).toBe(true);
			await repo.delete("to-delete.md");
			expect(await repo.exists("to-delete.md")).toBe(false);
		});
	});

	describe("list", () => {
		it("returns all .md files relative to root", async () => {
			await repo.write("a.md", "a");
			await repo.write("b.md", "b");
			await repo.write("sub/c.md", "c");
			// Non-md file should be excluded
			await writeFile(join(testDir, "ignore.txt"), "not a rule");

			const files = await repo.list();
			expect(files).toEqual(["a.md", "b.md", "sub/c.md"]);
		});

		it("returns empty array when root does not exist", async () => {
			const orphan = new RulesRepository(join(testDir, "no-such-dir"));
			expect(await orphan.list()).toEqual([]);
		});
	});

	describe("readMetadata", () => {
		it("extracts alwaysApply and globs from frontmatter", async () => {
			await repo.write(
				"typed-rule.md",
				[
					"---",
					"name: my-rule",
					"alwaysApply: true",
					'globs: ["*.ts", "*.tsx"]',
					"---",
					"# Body",
				].join("\n"),
			);

			const meta = await repo.readMetadata("typed-rule.md");
			expect(meta.name).toBe("my-rule");
			expect(meta.alwaysApply).toBe(true);
			expect(meta.globs).toEqual(["*.ts", "*.tsx"]);
		});

		it("defaults alwaysApply to false and globs to [] when missing", async () => {
			await repo.write(
				"minimal.md",
				["---", "name: minimal-rule", "---", "# Body"].join("\n"),
			);

			const meta = await repo.readMetadata("minimal.md");
			expect(meta.alwaysApply).toBe(false);
			expect(meta.globs).toEqual([]);
		});

		it("returns defaults when no frontmatter block exists", async () => {
			await repo.write("no-fm.md", "Just plain text, no frontmatter.");

			const meta = await repo.readMetadata("no-fm.md");
			expect(meta.name).toBe("");
			expect(meta.alwaysApply).toBe(false);
			expect(meta.globs).toEqual([]);
		});

		it("handles single-quoted values", async () => {
			await repo.write(
				"quoted.md",
				["---", "name: 'my rule'", "alwaysApply: false", "---", "# Body"].join("\n"),
			);

			const meta = await repo.readMetadata("quoted.md");
			expect(meta.name).toBe("my rule");
			expect(meta.alwaysApply).toBe(false);
		});

		it("throws for non-existent file", () => {
			expect(repo.readMetadata("missing.md")).rejects.toThrow("Rule file not found");
		});
	});

	describe("path traversal protection", () => {
		it("rejects ../ traversal in read", () => {
			expect(repo.read("../../etc/passwd")).rejects.toThrow("Path traversal detected");
		});

		it("rejects ../ traversal in write", () => {
			expect(repo.write("../escape.md", "bad")).rejects.toThrow("Path traversal detected");
		});

		it("rejects ../ traversal in delete", () => {
			expect(repo.delete("../../tmp/evil.md")).rejects.toThrow("Path traversal detected");
		});

		it("rejects ../ traversal in exists", () => {
			expect(repo.exists("../../../etc/shadow")).rejects.toThrow(
				"Path traversal detected",
			);
		});

		it("rejects ../ traversal in readMetadata", () => {
			expect(repo.readMetadata("../../etc/passwd")).rejects.toThrow(
				"Path traversal detected",
			);
		});
	});
});
