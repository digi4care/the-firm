import { describe, expect, it } from "bun:test";
import type { Template } from "../../types";
import { ContentBuilder } from "../../writing/content-builder.ts";

function makeTemplate(overrides: Partial<Template> = {}): Template {
	return {
		name: "Test Template",
		contentType: "decision",
		sections: [],
		frontmatterSchema: {},
		mviLimits: { maxLines: 200, maxDescription: 120 },
		...overrides,
	};
}

describe("ContentBuilder", () => {
	const builder = new ContentBuilder();

	describe("build", () => {
		it("builds file with all sections filled", () => {
			const template = makeTemplate({
				sections: [
					{ name: "Context", required: true, hint: "Describe the context" },
					{ name: "Decision", required: true, hint: "State the decision" },
					{ name: "Consequences", required: false, hint: "List consequences" },
				],
			});

			const sections = new Map<string, string>([
				["Context", "We need to choose a database."],
				["Decision", "Use PostgreSQL."],
				["Consequences", "Need operational expertise."],
			]);

			const frontmatter = {
				title: "Choose DB",
				status: "active",
				description: "Choose DB",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-02",
			};

			const result = builder.build(template, sections, frontmatter);

			// Frontmatter
			expect(result).toContain("status: active");
			expect(result).toContain("description: Choose DB");
			expect(result).toContain("owner: team");
			expect(result).toContain("created: 2026-01-01");
			expect(result).toContain("updated: 2026-01-02");
			expect(result.startsWith("---\n")).toBe(true);

			// Title from frontmatter
			expect(result).toContain("# Choose DB");

			// All sections with content
			expect(result).toContain("## Context\n\nWe need to choose a database.");
			expect(result).toContain("## Decision\n\nUse PostgreSQL.");
			expect(result).toContain("## Consequences\n\nNeed operational expertise.");

			// No hints when content provided
			expect(result).not.toContain("<!-- Describe the context -->");

			// Footer
			expect(result).toContain("---\n*Navigation: [Back to parent](../navigation.md)*");
		});

		it("builds file with partial sections — optional sections get hints", () => {
			const template = makeTemplate({
				sections: [
					{ name: "Context", required: true, hint: "Describe the context" },
					{ name: "Alternatives", required: false, hint: "List alternatives" },
					{ name: "Decision", required: true, hint: "State the decision" },
				],
			});

			const sections = new Map<string, string>([
				["Context", "Scaling concerns."],
				// Alternatives omitted
				["Decision", "Shard the database."],
			]);

			const result = builder.build(template, sections, {
				status: "active",
				description: "Sharding",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});

			// Provided sections render content
			expect(result).toContain("## Context\n\nScaling concerns.");
			expect(result).toContain("## Decision\n\nShard the database.");

			// Optional missing section renders hint
			expect(result).toContain("## Alternatives\n\n<!-- List alternatives -->");
		});

		it("renders no hint for missing required section", () => {
			const template = makeTemplate({
				sections: [{ name: "Context", required: true, hint: "Provide context" }],
			});

			const sections = new Map<string, string>();

			const result = builder.build(template, sections, {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});

			// Required section with no content: just heading, no hint
			expect(result).toContain("## Context");
			expect(result).not.toContain("<!-- Provide context -->");
		});

		it("template with no sections produces heading + frontmatter only", () => {
			const template = makeTemplate({ name: "Minimal" });

			const result = builder.build(template, new Map(), {
				status: "active",
				description: "minimal",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});

			// Should have frontmatter + title + footer
			expect(result.startsWith("---\n")).toBe(true);
			expect(result).toContain("# Minimal");
			expect(result).not.toContain("## ");
			expect(result).toContain("*Navigation: [Back to parent](../navigation.md)*");
		});

		it("uses template name as title when frontmatter has no title", () => {
			const template = makeTemplate({ name: "My Template Name" });
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			expect(result).toContain("# My Template Name");
		});

		it("uses frontmatter title over template name", () => {
			const template = makeTemplate({ name: "Template Name" });
			const result = builder.build(template, new Map(), {
				title: "Override Title",
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			expect(result).toContain("# Override Title");
			expect(result).not.toContain("# Template Name");
		});
	});

	describe("frontmatter generation", () => {
		it("serializes boolean values", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
				draft: true,
				reviewed: false,
			});
			expect(result).toContain("draft: true");
			expect(result).toContain("reviewed: false");
		});

		it("serializes number values", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
				priority: 3,
				score: 0.5,
			});
			expect(result).toContain("priority: 3");
			expect(result).toContain("score: 0.5");
		});

		it("serializes array values", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
				tags: ["backend", "database"],
			});
			expect(result).toContain("tags:");
			expect(result).toContain("  - backend");
			expect(result).toContain("  - database");
		});

		it("serializes empty array", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
				items: [],
			});
			expect(result).toContain("items: []");
		});

		it("serializes null and undefined as null", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
				nothing: null,
			});
			expect(result).toContain("nothing: null");
		});

		it("wraps frontmatter in --- delimiters", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			// Starts with ---\n and frontmatter ends with ---\n
			const frontmatterBlock = result.slice(0, result.indexOf("#"));
			expect(frontmatterBlock.startsWith("---\n")).toBe(true);
			// The closing --- is on its own line
			expect(frontmatterBlock).toContain("\n---\n");
		});
	});

	describe("frontmatter escaping", () => {
		it("quotes strings containing colons with spaces", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "this: needs quoting",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			expect(result).toContain('description: "this: needs quoting"');
		});

		it("quotes strings that look like booleans", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
				value: "true",
			});
			expect(result).toContain('value: "true"');
		});

		it("quotes strings containing special YAML characters", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
				expr: "[value]",
			});
			expect(result).toContain('expr: "[value]"');
		});

		it("quotes empty strings", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			expect(result).toContain('description: ""');
		});

		it("escapes double quotes within strings", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: 'say "hello"',
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			expect(result).toContain('description: "say \\"hello\\""');
		});

		it("does not quote plain safe strings", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "simple text",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			expect(result).toContain("description: simple text");
		});
	});

	describe("navigation footer", () => {
		it("appends navigation footer", () => {
			const template = makeTemplate();
			const result = builder.build(template, new Map(), {
				status: "active",
				description: "test",
				owner: "team",
				created: "2026-01-01",
				updated: "2026-01-01",
			});
			expect(result.endsWith("---\n*Navigation: [Back to parent](../navigation.md)*\n")).toBe(true);
		});
	});
});
