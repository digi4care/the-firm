import { describe, expect, it } from "vitest";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FirmRepository } from "../../writing/firm-repository.ts";

async function makeRoot(): Promise<{ root: string; repo: FirmRepository }> {
	const root = join(tmpdir(), `firm-repo-test-${Date.now()}`);
	await mkdir(root, { recursive: true });
	return { root, repo: new FirmRepository(root) };
}

describe("FirmRepository", () => {
	describe("read", () => {
		it("returns null for non-existent file", async () => {
			const { repo } = await makeRoot();
			expect(await repo.read("no/such/file.md")).toBeNull();
		});

		it("returns file content when file exists", async () => {
			const { root, repo } = await makeRoot();
			const path = "concepts/test.md";
			await repo.write(path, "hello");
			expect(await repo.read(path)).toBe("hello");
		});
	});

	describe("write", () => {
		it("creates parent directories recursively", async () => {
			const { root, repo } = await makeRoot();
			const path = "deep/nested/dir/file.md";
			await repo.write(path, "content");

			// Directory was created
			const dirStat = await stat(join(root, "deep/nested/dir"));
			expect(dirStat.isDirectory()).toBe(true);

			// Content is correct
			expect(await repo.read(path)).toBe("content");
		});
	});

	describe("read/write round-trip", () => {
		it("preserves content through a write-then-read cycle", async () => {
			const { repo } = await makeRoot();
			const content = "---\nstatus: active\n---\nBody text";
			await repo.write("file.md", content);
			expect(await repo.read("file.md")).toBe(content);
		});
	});

	describe("move", () => {
		it("renames a file to a new location", async () => {
			const { repo } = await makeRoot();
			await repo.write("old.md", "data");
			await repo.move("old.md", "new.md");

			expect(await repo.read("old.md")).toBeNull();
			expect(await repo.read("new.md")).toBe("data");
		});
	});

	describe("delete", () => {
		it("removes a file", async () => {
			const { repo } = await makeRoot();
			await repo.write("doomed.md", "bye");
			await repo.delete("doomed.md");
			expect(await repo.exists("doomed.md")).toBe(false);
		});
	});

	describe("exists", () => {
		it("returns true when file exists", async () => {
			const { repo } = await makeRoot();
			await repo.write("here.md", "yes");
			expect(await repo.exists("here.md")).toBe(true);
		});

		it("returns false when file does not exist", async () => {
			const { repo } = await makeRoot();
			expect(await repo.exists("missing.md")).toBe(false);
		});
	});

	describe("list", () => {
		it("returns only .md files sorted alphabetically", async () => {
			const { repo } = await makeRoot();
			await repo.write("concepts/charlie.md", "c");
			await repo.write("concepts/alpha.md", "a");
			await repo.write("concepts/bravo.md", "b");
			await repo.write("concepts/notes.txt", "not md");

			const files = await repo.list("concepts");
			expect(files).toEqual(["alpha.md", "bravo.md", "charlie.md"]);
		});

		it("returns empty array for non-existent directory", async () => {
			const { repo } = await makeRoot();
			expect(await repo.list("no-such-dir")).toEqual([]);
		});
	});

	describe("backup", () => {
		it("creates a copy in backup directory with timestamp", async () => {
			const { root, repo } = await makeRoot();
			await repo.write("decisions/adr-001.md", "decision content");

			const backupPath = await repo.backup("decisions/adr-001.md");

			// Backup path follows the pattern .firm.backup/<timestamp>/<name>.md
			expect(backupPath).toMatch(/^\.firm\.backup\/\d+\/adr-001\.md$/);

			// Backup content matches original
			const backupContent = await repo.read(backupPath);
			expect(backupContent).toBe("decision content");

			// Original is untouched
			expect(await repo.read("decisions/adr-001.md")).toBe("decision content");
		});
	});

	describe("writeWithBackup", () => {
		it("creates file without backup when file does not exist", async () => {
			const { repo } = await makeRoot();
			const op = await repo.writeWithBackup("new.md", "fresh");

			expect(op.action).toBe("create");
			expect(op.targetPath).toBe("new.md");
			expect(op.content).toBe("fresh");
			expect(op.backupPath).toBeUndefined();
		});

		it("backs up then updates when file exists", async () => {
			const { repo } = await makeRoot();
			await repo.write("existing.md", "old content");

			const op = await repo.writeWithBackup("existing.md", "new content");

			expect(op.action).toBe("update");
			expect(op.targetPath).toBe("existing.md");
			expect(op.content).toBe("new content");
			expect(op.backupPath).toMatch(/^\.firm\.backup\/\d+\/existing\.md$/);

			// Backup preserved old content
			const backupContent = await repo.read(op.backupPath as string);
			expect(backupContent).toBe("old content");

			// File has new content
			expect(await repo.read("existing.md")).toBe("new content");
		});
	});

	describe("path traversal protection", () => {
		it("throws on paths escaping root", async () => {
			const { repo } = await makeRoot();
			await expect(repo.read("../../../etc/passwd")).rejects.toThrow("Path traversal detected");
		});

		it("throws on write with traversal path", async () => {
			const { repo } = await makeRoot();
			await expect(repo.write("../../escape.md", "bad")).rejects.toThrow("Path traversal detected");
		});

		it("throws on move with traversal source", async () => {
			const { repo } = await makeRoot();
			await expect(repo.move("../../etc/passwd", "safe.md")).rejects.toThrow("Path traversal detected");
		});

		it("throws on move with traversal destination", async () => {
			const { repo } = await makeRoot();
			await expect(repo.move("safe.md", "../../escape.md")).rejects.toThrow("Path traversal detected");
		});

		it("throws on delete with traversal path", async () => {
			const { repo } = await makeRoot();
			await expect(repo.delete("../../important.md")).rejects.toThrow("Path traversal detected");
		});
	});

	describe("listAllFiles", () => {
		it("returns empty array for non-existent directory", async () => {
			const repo = new FirmRepository(`/tmp/non-existent-laf-${Date.now()}`);
			const files = await repo.listAllFiles();
			expect(files).toEqual([]);
		});

		it("recursively lists all files with relative paths", async () => {
			const { root, repo } = await makeRoot();
			await repo.write("a.md", "a");
			await repo.write("sub/b.md", "b");
			await repo.write("sub/deep/c.md", "c");

			const files = await repo.listAllFiles();
			expect(files).toContain("a.md");
			expect(files).toContain("sub/b.md");
			expect(files).toContain("sub/deep/c.md");
			expect(files).toHaveLength(3);
		});

		it("skips .firm.backup directory", async () => {
			const { root, repo } = await makeRoot();
			await mkdir(join(root, ".firm.backup"), { recursive: true });
			await writeFile(join(root, ".firm.backup", "old.md"), "old");
			await repo.write("real.md", "real");

			const files = await repo.listAllFiles();
			expect(files).toEqual(["real.md"]);
		});

		it("returns sorted results", async () => {
			const { repo } = await makeRoot();
			await repo.write("zebra.md", "z");
			await repo.write("alpha.md", "a");
			await repo.write("mid.md", "m");

			const files = await repo.listAllFiles();
			expect(files).toEqual(["alpha.md", "mid.md", "zebra.md"]);
		});
	});
});
