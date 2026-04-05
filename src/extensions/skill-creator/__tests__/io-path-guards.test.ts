/**
 * Tests for path guards
 */

import { describe, expect, it } from "bun:test";
import { ensureWithinRoot } from "../io/path-guards.js";

describe("ensureWithinRoot", () => {
	it("allows paths within root", () => {
		const root = "/home/user/project";
		const target = "src/file.txt";
		const result = ensureWithinRoot(root, target);
		expect(result).toContain("src/file.txt");
	});

	it("resolves relative paths", () => {
		const root = "/home/user/project";
		const target = "./src/file.txt";
		const result = ensureWithinRoot(root, target);
		expect(result).toContain("src/file.txt");
	});

	it("throws on absolute paths", () => {
		const root = "/home/user/project";
		const target = "/etc/passwd";
		expect(() => ensureWithinRoot(root, target)).toThrow("Absolute paths are not allowed");
	});

	it("throws on path traversal", () => {
		const root = "/home/user/project";
		const target = "../../../etc/passwd";
		expect(() => ensureWithinRoot(root, target)).toThrow("Path must be inside project root");
	});
});
