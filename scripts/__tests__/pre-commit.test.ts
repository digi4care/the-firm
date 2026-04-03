/**
 * pre-commit hook test — verifies the hook script exists and is executable
 */

import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const HOOK_PATH = join(REPO_ROOT, "scripts", "git-hooks", "pre-commit");

describe("pre-commit hook", () => {
	it("exists at scripts/git-hooks/pre-commit", () => {
		expect(existsSync(HOOK_PATH)).toBe(true);
	});

	it("is executable", () => {
		const stat = statSync(HOOK_PATH);
		expect(stat.mode & 0o111).toBeGreaterThan(0);
	});

	it("contains bun test check", () => {
		const text = readFileSync(HOOK_PATH, "utf-8");
		expect(text).toContain("bun test");
	});

	it("contains lint check", () => {
		const text = readFileSync(HOOK_PATH, "utf-8");
		expect(text).toContain("bun run lint");
	});

	it("exits with error on failure", () => {
		const text = readFileSync(HOOK_PATH, "utf-8");
		expect(text).toContain("exit 1");
	});
});

describe("install-hooks script", () => {
	const INSTALL_PATH = join(REPO_ROOT, "scripts", "install-hooks.sh");

	it("exists", () => {
		expect(existsSync(INSTALL_PATH)).toBe(true);
	});

	it("is executable", () => {
		const stat = statSync(INSTALL_PATH);
		expect(stat.mode & 0o111).toBeGreaterThan(0);
	});
});
