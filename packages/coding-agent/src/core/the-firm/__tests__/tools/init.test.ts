import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApprovalGate } from "../../pipeline/approval-gate";
import type { ApprovalMode } from "../../pipeline/approval-gate";
import { FirmScanner } from "../../scanning/firm-scanner";
import { FrameworkScanner } from "../../scanning/framework-scanner";
import { LanguageScanner } from "../../scanning/language-scanner";
import { ProjectScanner } from "../../scanning/project-scanner";
import { StructureScanner } from "../../scanning/structure-scanner";
import { BuiltinTemplates } from "../../templates/builtin-templates";
import { FileTemplateProvider } from "../../templates/file-template-provider";
import { InitTool } from "../../tools/init";
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
	tempRoot = join(tmpdir(), `the-firm-init-test-${Date.now()}`);
	await mkdir(tempRoot, { recursive: true });
	return tempRoot;
}

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
	}
});

/** Create a typical TypeScript project fixture. */
async function createTypeScriptProject(root: string): Promise<void> {
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({
			name: "test-project",
			scripts: {
				test: "bun test",
				build: "bun run build",
				lint: "biome lint .",
			},
			dependencies: {},
			devDependencies: { typescript: "^5.0.0" },
		})
	);
	await writeFile(join(root, "tsconfig.json"), "{}");
	await mkdir(join(root, "src"), { recursive: true });
	await writeFile(join(root, "src/index.ts"), "");
}

/** Create a TypeScript project with bun.lockb to verify package manager detection. */
async function createBunProject(root: string): Promise<void> {
	await createTypeScriptProject(root);
	await writeFile(join(root, "bun.lockb"), ""); // empty lockfile marker
}

/** Build a real InitTool with actual infrastructure (no mocks for scanners/repos). */
function buildTool(projectRoot: string): InitTool {
	const scanner = new ProjectScanner(
		new LanguageScanner(),
		new FrameworkScanner(),
		new StructureScanner(),
		new FirmScanner()
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

	return new InitTool(
		scanner,
		validator,
		firmRepo,
		rulesRepo,
		templates,
		approval,
		navSync,
		contentBuilder
	);
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function dirExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		return false;
	}
}

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

describe("InitTool", () => {
	describe("dry-run mode", () => {
		it("returns proposals without writing files", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root }, "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toBeDefined();
			expect(result.items?.length).toBeGreaterThan(0);

			// Verify nothing was written
			expect(await dirExists(join(root, ".firm"))).toBe(false);
		});

		it("generates config.json proposal with real values (no template variables)", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root }, "dry-run");

			const configProposal = result.items?.find((p) => p.targetPath === "config.json");
			expect(configProposal).toBeDefined();
			expect(configProposal?.action).toBe("create");

			const config = JSON.parse(configProposal?.content);

			// No template variables ({{...}})
			const raw = configProposal?.content;
			expect(raw).not.toMatch(/\{\{.*\}\}/);

			// Real values from project scan
			expect(config.project.name).toBe("test-project");
			expect(config.stack.language).toBe("TypeScript");
			expect(config.commands.test).toBeDefined();
			expect(config.commands.build).toBeDefined();
			expect(config.commands.lint).toBeDefined();
			expect(config.version).toBe("1");
			expect(config.integrations.git).toBe(true);
		});
	});

	describe("auto mode", () => {
		it("writes all files and returns success", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root }, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toBeDefined();
			expect(result.items?.length).toBeGreaterThan(0);
			expect(result.message).toContain("file(s) written");
		});

		it("creates correct directory structure for TypeScript project", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root }, "auto");

			const firmRoot = join(root, ".firm");

			// All expected directories exist (implicitly via navigation.md)
			const expectedDirs = [
				"concepts/decisions",
				"concepts/patterns",
				"guides/workflows",
				"lookup/standards",
				"errors",
				"specs",
				"templates",
			];

			for (const dir of expectedDirs) {
				expect(await dirExists(join(firmRoot, dir))).toBe(true);
			}
		});

		it("writes config.json with real values", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root }, "auto");

			const config = await readJson(join(root, ".firm", "config.json"));

			expect(config.project.name).toBe("test-project");
			expect(config.project.type).toBe("library");
			expect(config.stack.language).toBe("TypeScript");
			expect(config.stack.runtime).toBe("bun");
			expect(config.commands.test).toBeDefined();
			expect(config.commands.build).toBeDefined();
			expect(config.commands.lint).toBeDefined();
			expect(config.integrations.git).toBe(true);
		});

		it("generates navigation.md for each directory", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root }, "auto");

			const firmRoot = join(root, ".firm");

			// Root navigation.md
			expect(await fileExists(join(firmRoot, "navigation.md"))).toBe(true);

			// Navigation for each subdirectory
			const expectedNavs = [
				"concepts/decisions/navigation.md",
				"concepts/patterns/navigation.md",
				"guides/workflows/navigation.md",
				"lookup/standards/navigation.md",
				"errors/navigation.md",
				"specs/navigation.md",
				"templates/navigation.md",
			];

			for (const nav of expectedNavs) {
				expect(await fileExists(join(firmRoot, nav))).toBe(true);
			}
		});

		it("navigation.md has correct structure", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root }, "auto");

			const navContent = await readFile(
				join(root, ".firm", "concepts", "decisions", "navigation.md"),
				"utf-8"
			);

			// Has frontmatter
			expect(navContent).toContain("status: active");
			expect(navContent).toContain("owner: auto-generated");
			expect(navContent).toMatch(/created: \d{4}-\d{2}-\d{2}/);
			expect(navContent).toMatch(/updated: \d{4}-\d{2}-\d{2}/);

			// Has table header
			expect(navContent).toContain("# decisions/ — Navigation");
			expect(navContent).toContain("| Name | Description |");
		});

		it("detects bun package manager from bun.lockb", async () => {
			const root = await makeTempDir();
			await createBunProject(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root }, "auto");

			const config = await readJson(join(root, ".firm", "config.json"));
			expect(config.stack.packageManager).toBe("bun");
		});

		it("uses package.json scripts in config commands", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			await tool.execute({ projectRoot: root }, "auto");

			const config = await readJson(join(root, ".firm", "config.json"));

			// Scripts from package.json should be referenced with the right prefix
			expect(config.commands.test).toContain("test");
			expect(config.commands.build).toContain("build");
			expect(config.commands.lint).toContain("lint");
		});
	});

	describe("existing .firm/ handling", () => {
		it("does not overwrite existing files", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);

			// Pre-create .firm/ with a config.json
			await mkdir(join(root, ".firm"), { recursive: true });
			const existingConfig = { project: { name: "existing" } };
			await writeFile(join(root, ".firm", "config.json"), JSON.stringify(existingConfig));

			const tool = buildTool(root);
			await tool.execute({ projectRoot: root }, "auto");

			// config.json should still have the original content
			const config = await readJson(join(root, ".firm", "config.json"));
			expect(config.project.name).toBe("existing");
		});

		it("does not overwrite existing navigation.md files", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);

			// Pre-create .firm/ with a navigation.md
			await mkdir(join(root, ".firm/concepts/decisions"), { recursive: true });
			const existingNav = "# Existing Navigation\n";
			await writeFile(join(root, ".firm/concepts/decisions/navigation.md"), existingNav);

			const tool = buildTool(root);
			await tool.execute({ projectRoot: root }, "auto");

			// Existing navigation.md should be preserved
			const content = await readFile(
				join(root, ".firm", "concepts", "decisions", "navigation.md"),
				"utf-8"
			);
			expect(content).toBe(existingNav);
		});

		it("creates only missing files when .firm/ partially exists", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);

			// Pre-create partial structure
			await mkdir(join(root, ".firm/errors"), { recursive: true });
			await writeFile(join(root, ".firm/errors/navigation.md"), "# Existing Errors Nav\n");

			const tool = buildTool(root);
			const result = await tool.execute({ projectRoot: root }, "auto");

			expect(result.status).toBe("success");

			// errors/navigation.md should be preserved
			const errorsNav = await readFile(join(root, ".firm", "errors", "navigation.md"), "utf-8");
			expect(errorsNav).toBe("# Existing Errors Nav\n");

			// But other directories should be created
			expect(await dirExists(join(root, ".firm", "concepts", "decisions"))).toBe(true);
			expect(await fileExists(join(root, ".firm", "config.json"))).toBe(true);
		});
	});

	describe("project without package.json", () => {
		it("uses directory name as project name", async () => {
			const root = await makeTempDir();
			await mkdir(join(root, "src"), { recursive: true });
			await writeFile(join(root, "src/index.ts"), "");
			await writeFile(join(root, "tsconfig.json"), "{}");

			const tool = buildTool(root);
			const result = await tool.execute({ projectRoot: root }, "dry-run");

			const configProposal = result.items?.find((p) => p.targetPath === "config.json");
			const config = JSON.parse(configProposal?.content);

			// Should use the directory basename
			expect(config.project.name).toMatch(/^the-firm-init-test-/);
		});

		it("uses language defaults for commands when no scripts found", async () => {
			const root = await makeTempDir();
			await mkdir(join(root, "src"), { recursive: true });
			await writeFile(join(root, "src/index.ts"), "");
			await writeFile(join(root, "tsconfig.json"), "{}");

			const tool = buildTool(root);
			const result = await tool.execute({ projectRoot: root }, "dry-run");

			const configProposal = result.items?.find((p) => p.targetPath === "config.json");
			const config = JSON.parse(configProposal?.content);

			// TypeScript defaults
			expect(config.commands.test).toBe("bun test");
			expect(config.commands.lint).toBe("biome lint .");
		});
	});

	describe("proposal metadata", () => {
		it("generates proposals with unique sequential IDs", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root }, "dry-run");

			const ids = result.items?.map((p) => p.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);

			// All IDs start with "init-"
			for (const id of ids) {
				expect(id).toMatch(/^init-\d+$/);
			}
		});

		it("all proposals have action 'create'", async () => {
			const root = await makeTempDir();
			await createTypeScriptProject(root);
			const tool = buildTool(root);

			const result = await tool.execute({ projectRoot: root }, "dry-run");

			const items = result.items ?? [];
			for (const proposal of items) {
				expect(proposal.action).toBe("create");
			}
		});
	});
});
