/**
 * Tests for file writer
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyWrites, readTextFile, writeFileSafe } from "../io/file-writer.js";
import type { PlannedWrite } from "../types.js";

describe("readTextFile", () => {
	let tmpDir: string;
	let testFile: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "file-writer-test-"));
		testFile = join(tmpDir, "test.txt");
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns file content when file exists", async () => {
		writeFileSync(testFile, "hello world", "utf-8");
		const content = await readTextFile(testFile);
		expect(content).toBe("hello world");
	});

	it("returns null when file does not exist", async () => {
		const content = await readTextFile(join(tmpDir, "nonexistent.txt"));
		expect(content).toBeNull();
	});
});

describe("writeFileSafe", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "file-writer-test-"));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("creates new file", async () => {
		const write: PlannedWrite = {
			path: join(tmpDir, "new", "file.txt"),
			action: "create",
			content: "hello",
		};

		await writeFileSafe(write, false);
		expect(existsSync(write.path)).toBe(true);
		expect(readFileSync(write.path, "utf-8")).toBe("hello");
	});

	it("throws when file exists and overwrite is false", async () => {
		const path = join(tmpDir, "existing.txt");
		writeFileSync(path, "original", "utf-8");

		const write: PlannedWrite = {
			path,
			action: "create",
			content: "new",
		};

		expect(writeFileSafe(write, false)).rejects.toThrow("File exists");
	});

	it("overwrites when file exists and overwrite is true", async () => {
		const path = join(tmpDir, "existing.txt");
		writeFileSync(path, "original", "utf-8");

		const write: PlannedWrite = {
			path,
			action: "update",
			content: "updated",
		};

		await writeFileSafe(write, true);
		expect(readFileSync(path, "utf-8")).toBe("updated");
	});
});

describe("applyWrites", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "file-writer-test-"));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("applies multiple writes", async () => {
		const writes: PlannedWrite[] = [
			{ path: join(tmpDir, "file1.txt"), action: "create", content: "content1" },
			{ path: join(tmpDir, "file2.txt"), action: "create", content: "content2" },
		];

		await applyWrites(writes, false);

		expect(readFileSync(writes[0].path, "utf-8")).toBe("content1");
		expect(readFileSync(writes[1].path, "utf-8")).toBe("content2");
	});
});
