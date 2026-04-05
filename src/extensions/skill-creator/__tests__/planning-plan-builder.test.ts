/**
 * Tests for plan builder
 */

import { describe, expect, it } from "bun:test";
import { buildPlan } from "../planning/plan-builder.js";

describe("buildPlan", () => {
	it("builds plan with minimal input", () => {
		const result = buildPlan({ request: "Create a skill for testing" });

		expect(result.name).toBe("create-a-skill-for-testing");
		expect(result.purpose).toBe("Create a skill for testing");
		expect(result.triggers).toEqual([]);
		expect(result.missing).toContain("triggers");
	});

	it("uses provided name", () => {
		const result = buildPlan({
			request: "Create a skill for testing",
			name: "test-skill",
		});

		expect(result.name).toBe("test-skill");
	});

	it("uses provided purpose over request", () => {
		const result = buildPlan({
			request: "Create a skill for testing",
			purpose: "Custom purpose",
		});

		expect(result.purpose).toBe("Custom purpose");
	});

	it("normalizes triggers", () => {
		const result = buildPlan({
			request: "Test",
			triggers: ["  trigger one  ", "trigger two"],
		});

		expect(result.triggers).toEqual(["trigger one", "trigger two"]);
		expect(result.missing).not.toContain("triggers");
	});

	it("merges default negative triggers", () => {
		const result = buildPlan({
			request: "Test",
			negativeTriggers: ["custom avoid"],
		});

		expect(result.negativeTriggers).toContain("custom avoid");
		expect(result.negativeTriggers).toContain("general programming questions");
	});

	it("tracks missing fields", () => {
		const result = buildPlan({
			request: "Test",
			triggers: ["trigger"],
		});

		expect(result.missing).toContain("workflow");
		expect(result.missing).toContain("errorHandling");
		expect(result.missing).toContain("tests.shouldTrigger");
	});

	it("builds description draft with triggers and negatives", () => {
		const result = buildPlan({
			request: "Test skill",
			triggers: ["use when X"],
			negativeTriggers: ["not for Y"],
		});

		expect(result.descriptionDraft).toContain("Test skill");
		expect(result.descriptionDraft).toContain("Use when: use when X");
		expect(result.descriptionDraft).toContain("Do not trigger for: not for Y");
	});

	it("normalizes references with .md extension", () => {
		const result = buildPlan({
			request: "Test",
			references: ["doc1", "doc2.md", "doc3.mdx"],
		});

		expect(result.references).toEqual(["doc1.md", "doc2.md", "doc3.md"]);
	});
});
