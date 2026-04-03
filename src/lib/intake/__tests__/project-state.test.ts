/**
 * Tests for project-state.ts
 *
 * Covers Bug 2 (rollback) and Bug 3 (initialization detection) fixes.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createTrackedDir,
	createTrackedFile,
	isProjectInitialized,
	rollbackPaths,
} from "../project-state.js";

describe("isProjectInitialized", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "firm-test-"));
	});

	afterEach(() => {
		rollbackPaths([testDir]);
	});

	it("returns false when file does not exist", () => {
		const projectFile = join(testDir, "project.yml");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});

	// Bug 3 fix: Empty file should not block re-initialization
	it("Bug 3: returns false when empty file exists", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		writeFileSync(projectFile, "", "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});

	// Bug 3 fix: Corrupt YAML should not block re-initialization
	it("Bug 3: returns false when corrupt YAML exists", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		writeFileSync(projectFile, "this is not valid yaml at all", "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});

	it("returns true when valid project config exists", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		const validYaml = `project:
  version: 1
identity:
  id: firm-project-test
  name: Test
  description: Test
  client_id: firm-client-test
  created: "2026-04-03"
  status: active
`;
		writeFileSync(projectFile, validYaml, "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(true);
	});

	it("returns false when project section missing", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		const yamlWithoutProject = `identity:
  id: firm-project-test
  name: Test
`;
		writeFileSync(projectFile, yamlWithoutProject, "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});

	it("returns false when identity section missing", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		const yamlWithoutIdentity = `project:
  version: 1
`;
		writeFileSync(projectFile, yamlWithoutIdentity, "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});

	it("returns false when version is missing", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		const yamlWithoutVersion = `project:
  name: something
identity:
  id: firm-project-test
`;
		writeFileSync(projectFile, yamlWithoutVersion, "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});

	it("returns false when version is not 1", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		const yamlWrongVersion = `project:
  version: 2
identity:
  id: firm-project-test
`;
		writeFileSync(projectFile, yamlWrongVersion, "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});

	it("returns false when identity.id is missing", () => {
		const projectFile = join(testDir, "project.yml");
		mkdirSync(testDir, { recursive: true });
		const yamlWithoutId = `project:
  version: 1
identity:
  name: Test
`;
		writeFileSync(projectFile, yamlWithoutId, "utf-8");
		expect(isProjectInitialized(projectFile)).toBe(false);
	});
});

describe("rollbackPaths", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "firm-test-"));
	});

	afterEach(() => {
		rollbackPaths([testDir]);
	});

	// Bug 2 fix: Cleanup created directories on failure
	it("Bug 2: removes created directory", () => {
		const dirPath = join(testDir, "subdir");
		mkdirSync(dirPath, { recursive: true });
		expect(existsSync(dirPath)).toBe(true);

		rollbackPaths([dirPath]);

		expect(existsSync(dirPath)).toBe(false);
	});

	// Bug 2 fix: Cleanup created files on failure
	it("Bug 2: removes created file", () => {
		const filePath = join(testDir, "file.txt");
		writeFileSync(filePath, "content", "utf-8");
		expect(existsSync(filePath)).toBe(true);

		rollbackPaths([filePath]);

		expect(existsSync(filePath)).toBe(false);
	});

	it("does not throw for non-existent paths", () => {
		const nonExistent = join(testDir, "does-not-exist");
		expect(() => rollbackPaths([nonExistent])).not.toThrow();
	});

	it("removes multiple paths", () => {
		const dirPath = join(testDir, "dir1");
		const filePath = join(testDir, "file1.txt");
		mkdirSync(dirPath, { recursive: true });
		writeFileSync(filePath, "content", "utf-8");

		expect(existsSync(dirPath)).toBe(true);
		expect(existsSync(filePath)).toBe(true);

		rollbackPaths([dirPath, filePath]);

		expect(existsSync(dirPath)).toBe(false);
		expect(existsSync(filePath)).toBe(false);
	});
});

describe("createTrackedDir", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "firm-test-"));
	});

	afterEach(() => {
		rollbackPaths([testDir]);
	});

	it("creates directory and adds to tracked array", () => {
		const tracked: string[] = [];
		const dirPath = join(testDir, "new-dir");

		createTrackedDir(dirPath, tracked);

		expect(existsSync(dirPath)).toBe(true);
		expect(tracked).toContain(dirPath);
	});

	it("supports recursive directory creation", () => {
		const tracked: string[] = [];
		const deepPath = join(testDir, "a", "b", "c");

		createTrackedDir(deepPath, tracked);

		expect(existsSync(deepPath)).toBe(true);
		expect(tracked).toContain(deepPath);
	});
});

describe("createTrackedFile", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = mkdtempSync(join(tmpdir(), "firm-test-"));
	});

	afterEach(() => {
		rollbackPaths([testDir]);
	});

	it("creates file with content and adds to tracked array", () => {
		const tracked: string[] = [];
		const filePath = join(testDir, "file.txt");
		const content = "hello world";

		createTrackedFile(filePath, content, tracked);

		expect(existsSync(filePath)).toBe(true);
		expect(tracked).toContain(filePath);
		// Verify content was written
		const readContent = require("node:fs").readFileSync(filePath, "utf-8");
		expect(readContent).toBe(content);
	});

	it("overwrites existing file", () => {
		const tracked: string[] = [];
		const filePath = join(testDir, "file.txt");
		writeFileSync(filePath, "old content", "utf-8");

		createTrackedFile(filePath, "new content", tracked);

		const readContent = require("node:fs").readFileSync(filePath, "utf-8");
		expect(readContent).toBe("new content");
	});
});
