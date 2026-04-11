import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BuiltinTemplates } from "../../templates/builtin-templates";
import { FileTemplateProvider } from "../../templates/file-template-provider";

describe("BuiltinTemplates", () => {
	const builtin = new BuiltinTemplates();

	describe("getTemplate", () => {
		it("returns template for decision", async () => {
			const template = await builtin.getTemplate("decision");
			expect(template).not.toBeNull();
			expect(template?.name).toBe("Decision");
			expect(template?.contentType).toBe("decision");
		});

		it("returns template for pattern", async () => {
			const template = await builtin.getTemplate("pattern");
			expect(template).not.toBeNull();
			expect(template?.name).toBe("Pattern");
			expect(template?.contentType).toBe("pattern");
		});

		it("returns null for unknown type", async () => {
			const template = await builtin.getTemplate("unknown");
			expect(template).toBeNull();
		});

		it("returns template with required sections for decision", async () => {
			const template = await builtin.getTemplate("decision");
			const requiredSections = template?.sections.filter((s) => s.required);
			expect(requiredSections.map((s) => s.name)).toEqual(["Context", "Decision", "Consequences"]);
		});

		it("returns template with valid mviLimits", async () => {
			const template = await builtin.getTemplate("decision");
			expect(template?.mviLimits.maxLines).toBe(200);
			expect(template?.mviLimits.maxDescription).toBe(120);
		});
	});

	describe("listTemplates", () => {
		it("returns 8 entries", () => {
			const templates = builtin.listTemplates();
			expect(templates).toHaveLength(8);
		});

		it("includes all content types", () => {
			const templates = builtin.listTemplates();
			const types = templates.map((t) => t.contentType).sort();
			expect(types).toEqual(["concept", "decision", "error", "guide", "pattern", "rule", "spec", "standard"]);
		});
	});
});

describe("FileTemplateProvider", () => {
	async function makeTempDir(): Promise<string> {
		const dir = join(tmpdir(), `firm-template-test-${Date.now()}`);
		await mkdir(dir, { recursive: true });
		return dir;
	}

	describe("fallback to builtin", () => {
		it("returns builtin template when file not found", async () => {
			const firmRoot = await makeTempDir();
			const provider = new FileTemplateProvider(firmRoot);
			const template = await provider.getTemplate("decision");

			expect(template).not.toBeNull();
			expect(template?.name).toBe("Decision");
			expect(template?.contentType).toBe("decision");
		});

		it("returns null for unknown type not in builtins", async () => {
			const firmRoot = await makeTempDir();
			const provider = new FileTemplateProvider(firmRoot);
			const template = await provider.getTemplate("totally-unknown");

			expect(template).toBeNull();
		});
	});

	describe("reading user templates from filesystem", () => {
		it("reads user template and extracts sections from ## headings", async () => {
			const firmRoot = await makeTempDir();
			const templatesDir = join(firmRoot, "templates");
			await mkdir(templatesDir, { recursive: true });

			const userTemplate = [
				"---",
				"status: active",
				"description: Custom decision template",
				"---",
				"",
				"# Decision Template",
				"",
				"## My Context",
				"",
				"Custom context section.",
				"",
				"## My Decision",
				"",
				"Custom decision section.",
				"",
				"## My Impact",
				"",
				"Custom impact section.",
				"",
				"---",
				"*Navigation: [Back](navigation.md)*",
			].join("\n");

			await writeFile(join(templatesDir, "decision-template.md"), userTemplate);

			const provider = new FileTemplateProvider(firmRoot);
			const template = await provider.getTemplate("decision");

			expect(template).not.toBeNull();
			expect(template?.contentType).toBe("decision");
			expect(template?.sections.map((s) => s.name)).toEqual(["My Context", "My Decision", "My Impact"]);
			// All user template sections are optional
			expect(template?.sections.every((s) => s.required === false)).toBe(true);
		});

		it("caches parsed templates on repeated access", async () => {
			const firmRoot = await makeTempDir();
			const templatesDir = join(firmRoot, "templates");
			await mkdir(templatesDir, { recursive: true });

			await writeFile(join(templatesDir, "pattern-template.md"), "## Problem\n## Solution\n");

			const provider = new FileTemplateProvider(firmRoot);
			const first = await provider.getTemplate("pattern");
			const second = await provider.getTemplate("pattern");

			expect(first).toBe(second); // same reference
		});

		it("uses free-form Body section when template has no ## headings", async () => {
			const firmRoot = await makeTempDir();
			const templatesDir = join(firmRoot, "templates");
			await mkdir(templatesDir, { recursive: true });

			await writeFile(
				join(templatesDir, "concept-template.md"),
				"---\nstatus: active\n---\n\n# Just a title\n\nFree-form content here.\n",
			);

			const provider = new FileTemplateProvider(firmRoot);
			const template = await provider.getTemplate("concept");

			expect(template).not.toBeNull();
			expect(template?.sections).toHaveLength(1);
			expect(template?.sections[0].name).toBe("Body");
		});
	});

	describe("listTemplates", () => {
		it("delegates to builtin list", () => {
			const provider = new FileTemplateProvider("/nonexistent");
			const templates = provider.listTemplates();
			expect(templates).toHaveLength(8);
		});
	});
});
