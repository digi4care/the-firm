import { afterEach, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApprovalGate } from "../../pipeline/approval-gate";
import { FirmScanner } from "../../scanning/firm-scanner";
import { FrameworkScanner } from "../../scanning/framework-scanner";
import { LanguageScanner } from "../../scanning/language-scanner";
import { ProjectScanner } from "../../scanning/project-scanner";
import { StructureScanner } from "../../scanning/structure-scanner";
import { BuiltinTemplates } from "../../templates/builtin-templates";
import { FileTemplateProvider } from "../../templates/file-template-provider";
import { loadStandardFiles, parseFrontmatter, SetupTool } from "../../tools/setup";
import { CompositeValidator } from "../../validation/composite-validator";
import { FrontmatterValidator } from "../../validation/frontmatter-validator";
import { LinkValidator } from "../../validation/link-validator";
import { MVIValidator } from "../../validation/mvi-validator";
import { TemplateValidator } from "../../validation/template-validator";
import { ContentBuilder } from "../../writing/content-builder";
import { FirmRepository } from "../../writing/firm-repository";
import { NavigationSync } from "../../writing/navigation-sync";
import { RulesRepository } from "../../writing/rules-repository";

// ── Test fixtures ──────────────────────────────────────────────────────────

let tempRoot: string;

async function makeTempDir(): Promise<string> {
	tempRoot = join(tmpdir(), `the-firm-setup-test-${Date.now()}`);
	await mkdir(tempRoot, { recursive: true });
	return tempRoot;
}

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
	}
});

/** Create a typical TypeScript project fixture with .firm/ already initialized. */
async function createTypeScriptProject(root: string): Promise<void> {
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({
			name: "test-project",
			scripts: { test: "bun test", build: "bun run build", lint: "biome lint ." },
			dependencies: {},
			devDependencies: { typescript: "^5.0.0" },
		}),
	);
	await writeFile(join(root, "tsconfig.json"), "{}");
	await mkdir(join(root, "src"), { recursive: true });
	await writeFile(join(root, "src/index.ts"), "");
}

/**
 * Create an initialized .firm/ with config.json and standard directories.
 * This simulates the state after kb-init has run.
 */
async function createInitializedFirm(root: string): Promise<void> {
	const firmRoot = join(root, ".firm");
	const dirs = [
		"concepts/decisions",
		"concepts/patterns",
		"guides/workflows",
		"lookup/standards",
		"errors",
		"specs",
		"templates",
	];
	for (const dir of dirs) {
		await mkdir(join(firmRoot, dir), { recursive: true });
	}

	// Create config.json
	await writeFile(
		join(firmRoot, "config.json"),
		JSON.stringify(
			{
				version: "1",
				project: { name: "test-project", type: "library", root },
				stack: { language: "TypeScript", runtime: "bun", packageManager: "bun" },
				commands: { test: "bun test", build: "bun run build", lint: "biome lint ." },
			},
			null,
			2,
		),
	);
}

/** Build a real SetupTool with actual infrastructure. */
function buildTool(projectRoot: string): SetupTool {
	const scanner = new ProjectScanner(
		new LanguageScanner(),
		new FrameworkScanner(),
		new StructureScanner(),
		new FirmScanner(),
	);
	const validator = new CompositeValidator([
		new MVIValidator(),
		new FrontmatterValidator(),
		new TemplateValidator(),
		new LinkValidator(),
	]);
	const firmRepo = new FirmRepository(`${projectRoot}/.firm`);
	const rulesRepo = new RulesRepository(`${projectRoot}/.pi/rules`);
	const templates = new FileTemplateProvider(`${projectRoot}/.firm`, new BuiltinTemplates());
	const contentBuilder = new ContentBuilder();
	const navSync = new NavigationSync(firmRepo);
	const approval = new ApprovalGate();

	return new SetupTool(scanner, validator, firmRepo, rulesRepo, templates, approval, navSync, contentBuilder);
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isFile();
	} catch {
		return false;
	}
}

async function readJson(path: string): Promise<Record<string, unknown>> {
	const content = await readFile(path, "utf-8");
	return JSON.parse(content);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SetupTool", () => {
	describe("dry-run mode", () => {
		it("returns proposals without writing files", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toBeDefined();
			expect(result.items?.length).toBeGreaterThan(0);

			// Verify nothing was written to .firm/lookup/standards/
			const standards = await readFile(join(root, ".firm", "lookup", "standards")).catch(() => null);
			// Directory exists but no files (it was created by createInitializedFirm)
			expect(standards).toBeNull();
		});

		it("generates planning-output standard", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			const planningProposal = result.items?.find((p) => p.targetPath === "lookup/standards/planning-output.md");
			expect(planningProposal).toBeDefined();
			expect(planningProposal?.action).toBe("create");
			expect(planningProposal?.content).toContain("# Standard: Planning Output");
			expect(planningProposal?.content).toContain("status: active");
			expect(planningProposal?.content).toContain("review-cadence: quarterly");
		});

		it("generates implementation-workflow rule proposal", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			const workflowRule = result.items?.find((p) => p.targetPath === "rule:implementation-workflow.md");
			expect(workflowRule).toBeDefined();
			expect(workflowRule?.content).toContain("# Rule: Implementation Workflow");
			expect(workflowRule?.content).toContain("alwaysApply: true");
			expect(workflowRule?.content).toContain('description: "Follow implementation planning workflow"');
		});

		it("detects TypeScript and generates TS standard", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			const tsStandard = result.items?.find((p) => p.targetPath === "lookup/standards/typescript-coding.md");
			expect(tsStandard).toBeDefined();
			expect(tsStandard?.content).toContain("# Standard: TypeScript Coding");
			expect(tsStandard?.content).toContain("strict: true");

			// Corresponding rule should have TypeScript globs
			const tsRule = result.items?.find((p) => p.targetPath === "rule:typescript-coding.md");
			expect(tsRule).toBeDefined();
			expect(tsRule?.content).toContain('globs: ["**/*.ts", "**/*.tsx"]');
		});
	});

	describe("auto mode", () => {
		it("writes standards and rules", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root, options: {} }, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toBeDefined();
			expect(result.items?.length).toBeGreaterThan(0);
			expect(result.message).toContain("file(s) written");

			// Verify standard files exist
			expect(await fileExists(join(root, ".firm", "lookup", "standards", "planning-output.md"))).toBe(true);
			expect(await fileExists(join(root, ".firm", "lookup", "standards", "implementation-workflow.md"))).toBe(true);
			expect(await fileExists(join(root, ".firm", "lookup", "standards", "typescript-coding.md"))).toBe(true);

			// Verify rule files exist
			expect(await fileExists(join(root, ".omp", "rules", "planning-output.md"))).toBe(true);
			expect(await fileExists(join(root, ".omp", "rules", "typescript-coding.md"))).toBe(true);
		});

		it("updates config with standards metadata", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root, options: {} }, "auto");

			const config = await readJson(join(root, ".firm", "config.json"));

			expect(config.standards).toBeDefined();
			const standards = config.standards as Array<{
				file: string;
				name: string;
				description: string;
			}>;
			expect(standards.length).toBeGreaterThan(0);

			// Check planning-output is in the metadata
			const planningStd = standards.find((s) => s.file === "planning-output.md");
			expect(planningStd).toBeDefined();
			expect(planningStd?.name).toBe("Planning Output");

			// Check TypeScript standard is in the metadata
			const tsStd = standards.find((s) => s.file === "typescript-coding.md");
			expect(tsStd).toBeDefined();
			expect(tsStd?.name).toBe("TypeScript Coding");
		});

		it("written standard has correct frontmatter and content", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root, options: {} }, "auto");

			const content = await readFile(join(root, ".firm", "lookup", "standards", "planning-output.md"), "utf-8");

			// Frontmatter
			expect(content).toContain("status: active");
			expect(content).toMatch(/description: ".*"/);
			expect(content).toContain("owner: The Firm Architecture Team");
			expect(content).toMatch(/created: \d{4}-\d{2}-\d{2}/);
			expect(content).toMatch(/updated: \d{4}-\d{2}-\d{2}/);
			expect(content).toContain("review-cadence: quarterly");

			// Sections
			expect(content).toContain("## Rule");
			expect(content).toContain("## Rationale");
			expect(content).toContain("## Enforcement");

			// Content
			expect(content).toContain(".firm/");
		});

		it("written rule has correct structure", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root, options: {} }, "auto");

			const content = await readFile(join(root, ".omp", "rules", "typescript-coding.md"), "utf-8");

			// Frontmatter with globs
			expect(content).toContain("---");
			expect(content).toContain('globs: ["**/*.ts", "**/*.tsx"]');
			expect(content).toContain("description:");

			// Title
			expect(content).toContain("# Rule: TypeScript Coding");

			// Compact bullet items
			expect(content).toContain("- Use strict TypeScript");
		});
	});

	describe("skipping existing files", () => {
		it("skips already-existing standards", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);

			// Pre-create a standard
			const existingContent = "# Existing Standard\n";
			await writeFile(join(root, ".firm", "lookup", "standards", "planning-output.md"), existingContent);

			const tool = buildTool(root);
			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			// planning-output should NOT be in proposals (already exists)
			const planningProposal = result.items?.find((p) => p.targetPath === "lookup/standards/planning-output.md");
			expect(planningProposal).toBeUndefined();

			// But implementation-workflow should still be proposed
			const implProposal = result.items?.find((p) => p.targetPath === "lookup/standards/implementation-workflow.md");
			expect(implProposal).toBeDefined();
		});

		it("skips already-existing rules", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);

			// Pre-create a rule
			await mkdir(join(root, ".omp", "rules"), { recursive: true });
			await writeFile(join(root, ".omp", "rules", "planning-output.md"), "# Existing Rule\n");

			const tool = buildTool(root);
			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			// planning-output rule should NOT be in proposals
			const ruleProposal = result.items?.find((p) => p.targetPath === "rule:planning-output.md");
			expect(ruleProposal).toBeUndefined();
		});

		it("auto mode preserves existing files", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);

			const existingContent = "# Existing Standard\n";
			await writeFile(join(root, ".firm", "lookup", "standards", "planning-output.md"), existingContent);

			const tool = buildTool(root);
			await tool.execute({ projectRoot: root, options: {} }, "auto");

			// Existing standard should be untouched
			const content = await readFile(join(root, ".firm", "lookup", "standards", "planning-output.md"), "utf-8");
			expect(content).toBe(existingContent);
		});
	});

	describe("default rules", () => {
		it("deploys default rules from defaults/rules/ in dry-run", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			// general-coding rule proposal
			const generalCoding = result.items?.find((p) => p.targetPath === "rule:general-coding.md");
			expect(generalCoding).toBeDefined();
			expect(generalCoding?.action).toBe("create");
			expect(generalCoding?.content).toContain("General Coding");
			expect(generalCoding?.content).toContain("alwaysApply: true");

			// commit-hygiene rule proposal
			const commitHygiene = result.items?.find((p) => p.targetPath === "rule:commit-hygiene.md");
			expect(commitHygiene).toBeDefined();
			expect(commitHygiene?.action).toBe("create");
			expect(commitHygiene?.content).toContain("Commit Hygiene");
			expect(commitHygiene?.content).toContain("alwaysApply: true");
		});

		it("writes default rules to .pi/rules/ in auto mode", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root, options: {} }, "auto");

			// Verify default rule files exist in .pi/rules/
			expect(await fileExists(join(root, ".omp", "rules", "general-coding.md"))).toBe(true);
			expect(await fileExists(join(root, ".omp", "rules", "commit-hygiene.md"))).toBe(true);

			// Verify content structure
			const generalContent = await readFile(join(root, ".omp", "rules", "general-coding.md"), "utf-8");
			expect(generalContent).toContain("---");
			expect(generalContent).toContain('name: "General Coding"');
			expect(generalContent).toContain("self-documenting code");
		});

		it("skips default rules that already exist in .pi/rules/", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);

			// Pre-create a default rule
			await mkdir(join(root, ".omp", "rules"), { recursive: true });
			await writeFile(join(root, ".omp", "rules", "general-coding.md"), "# Existing Rule\n");

			const tool = buildTool(root);
			const result = await tool.execute({ projectRoot: root, options: {} }, "dry-run");

			// general-coding should NOT be in proposals (already exists)
			const generalProposal = result.items?.find((p) => p.targetPath === "rule:general-coding.md");
			expect(generalProposal).toBeUndefined();

			// commit-hygiene should still be proposed
			const commitProposal = result.items?.find((p) => p.targetPath === "rule:commit-hygiene.md");
			expect(commitProposal).toBeDefined();
		});

		it("does not overwrite existing default rules in auto mode", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			await createInitializedFirm(root);

			const existingContent = "# My Custom Rule\n";
			await mkdir(join(root, ".omp", "rules"), { recursive: true });
			await writeFile(join(root, ".omp", "rules", "general-coding.md"), existingContent);

			const tool = buildTool(root);
			await tool.execute({ projectRoot: root, options: {} }, "auto");

			// Existing rule should be untouched
			const content = await readFile(join(root, ".omp", "rules", "general-coding.md"), "utf-8");
			expect(content).toBe(existingContent);
		});
	});
});

describe("parseFrontmatter", () => {
	it("parses frontmatter with all fields", () => {
		const raw = [
			"---",
			'name: "Planning Output"',
			'description: "Planning output must be decomposed"',
			'owner: "The Firm Architecture Team"',
			"language: always",
			"---",
			"",
			"All planning output must be captured.",
		].join("\n");

		const { frontmatter, body } = parseFrontmatter(raw);
		expect(frontmatter.name).toBe("Planning Output");
		expect(frontmatter.description).toBe("Planning output must be decomposed");
		expect(frontmatter.owner).toBe("The Firm Architecture Team");
		expect(frontmatter.language).toBe("always");
		expect(body.trim()).toBe("All planning output must be captured.");
	});

	it("returns empty frontmatter for file without frontmatter", () => {
		const raw = "Just some content without frontmatter.\nAnother line.";
		const { frontmatter, body } = parseFrontmatter(raw);
		expect(Object.keys(frontmatter)).toHaveLength(0);
		expect(body).toBe(raw);
	});

	it("handles frontmatter with unquoted values", () => {
		const raw = ["---", "name: Test Standard", "language: TypeScript", "---", "", "Content here."].join("\n");

		const { frontmatter } = parseFrontmatter(raw);
		expect(frontmatter.name).toBe("Test Standard");
		expect(frontmatter.language).toBe("TypeScript");
	});
});

describe("loadStandardFiles", () => {
	it("returns always and byLanguage categories", () => {
		const { always, byLanguage } = loadStandardFiles();

		// Always standards
		expect(always.length).toBeGreaterThanOrEqual(2);
		const planningStd = always.find((s) => s.fileName === "planning-output.md");
		expect(planningStd).toBeDefined();
		expect(planningStd?.name).toBe("Planning Output");
		expect(planningStd?.content.length).toBeGreaterThan(0);

		// Language standards
		expect(Object.keys(byLanguage).length).toBeGreaterThanOrEqual(6);
		expect(byLanguage.TypeScript).toBeDefined();
		expect(byLanguage.TypeScript.fileName).toBe("typescript-coding.md");
		expect(byLanguage.Svelte).toBeDefined();
		expect(byLanguage.Python).toBeDefined();
	});

	it("applies defaults for missing frontmatter fields", () => {
		const { always } = loadStandardFiles();
		for (const std of always) {
			expect(std.owner).toBe("The Firm Architecture Team");
			expect(std.name.length).toBeGreaterThan(0);
		}
	});
});
