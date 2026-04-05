/**
 * Tests for markdown builder
 */

import { describe, expect, it } from "bun:test";
import { buildReferenceStub, buildSkillMarkdown } from "../markdown/builder.js";

describe("buildSkillMarkdown", () => {
	it("generates complete SKILL.md content", () => {
		const result = buildSkillMarkdown({
			name: "test-skill",
			description: "Test skill description",
			author: "Test Author",
			version: "1.0.0",
			license: "MIT",
			triggers: ["trigger one", "trigger two"],
			negativeTriggers: ["negative one"],
			workflow: ["step one", "step two"],
			errorHandling: ["error one"],
			tests: {
				shouldTrigger: ["test trigger"],
				shouldNotTrigger: ["test not trigger"],
				functional: ["test functional"],
			},
			references: ["doc.md"],
		});

		expect(result).toContain("name: test-skill");
		expect(result).toContain("Test skill description");
		expect(result).toContain("license: MIT");
		expect(result).toContain("# Test Skill");
		expect(result).toContain("## When to Use Me");
		expect(result).toContain("## Workflow");
		expect(result).toContain("## Error Handling");
		expect(result).toContain("## Quick Tests");
		expect(result).toContain("## References");
	});

	it("includes triggers in When to Use", () => {
		const result = buildSkillMarkdown({
			name: "test",
			description: "Test",
			author: "Test",
			version: "1.0.0",
			license: "MIT",
			triggers: ["use this"],
			negativeTriggers: ["not this"],
			workflow: [],
			errorHandling: [],
			tests: { shouldTrigger: [], shouldNotTrigger: [], functional: [] },
			references: [],
		});

		expect(result).toContain("- use this");
		expect(result).toContain("Do not use me for:");
		expect(result).toContain("- not this");
	});

	it("includes workflow as numbered list", () => {
		const result = buildSkillMarkdown({
			name: "test",
			description: "Test",
			author: "Test",
			version: "1.0.0",
			license: "MIT",
			triggers: [],
			negativeTriggers: [],
			workflow: ["first", "second", "third"],
			errorHandling: [],
			tests: { shouldTrigger: [], shouldNotTrigger: [], functional: [] },
			references: [],
		});

		expect(result).toContain("1. first");
		expect(result).toContain("2. second");
		expect(result).toContain("3. third");
	});

	it("includes references with code formatting", () => {
		const result = buildSkillMarkdown({
			name: "test",
			description: "Test",
			author: "Test",
			version: "1.0.0",
			license: "MIT",
			triggers: [],
			negativeTriggers: [],
			workflow: [],
			errorHandling: [],
			tests: { shouldTrigger: [], shouldNotTrigger: [], functional: [] },
			references: ["doc1.md", "doc2.md"],
		});

		expect(result).toContain("`references/doc1.md`");
		expect(result).toContain("`references/doc2.md`");
	});
});

describe("buildReferenceStub", () => {
	it("creates stub with title from filename", () => {
		const result = buildReferenceStub("my-document.md");
		expect(result).toContain("# My Document");
		expect(result).toContain("<add content here>");
	});

	it("handles filename without extension", () => {
		const result = buildReferenceStub("document");
		expect(result).toContain("# Document");
	});
});
