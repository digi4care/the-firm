/**
 * Tests for create planner
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildCreatePlan } from "../planning/create-planner.js";

describe("buildCreatePlan", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(join(tmpdir(), "skill-creator-test-"));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("creates plan with SKILL.md write", () => {
		const result = buildCreatePlan(
			{
				request: "Test skill",
				name: "test-skill",
				triggers: ["trigger"],
				workflow: ["step"],
				errorHandling: ["error"],
				tests: { shouldTrigger: ["test"], shouldNotTrigger: [], functional: [] },
			},
			tmpDir,
		);

		expect(result.skillDir).toContain("test-skill");
		expect(result.writes.length).toBeGreaterThan(0);
		expect(result.writes[0].path).toContain("SKILL.md");
		expect(result.writes[0].action).toBe("create");
	});

	it("creates reference files when provided", () => {
		const result = buildCreatePlan(
			{
				request: "Test",
				references: ["doc1.md", "doc2.md"],
			},
			tmpDir,
		);

		const referenceWrites = result.writes.filter((w) => w.path.includes("references"));
		expect(referenceWrites.length).toBe(3); // 2 docs + registry
		expect(referenceWrites.some((w) => w.path.includes("doc1.md"))).toBe(true);
		expect(referenceWrites.some((w) => w.path.includes("doc2.md"))).toBe(true);
		expect(referenceWrites.some((w) => w.path.includes("registry.json"))).toBe(true);
	});

	it("uses default author when not provided", () => {
		const result = buildCreatePlan({ request: "Test" }, tmpDir);
		expect(result.plan).toBeDefined();
	});
});
