import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ApprovalGate } from "../../pipeline/approval-gate";
import { ApprovalGate as RealApprovalGate } from "../../pipeline/approval-gate";
import type { TemplateProvider } from "../../templates/template-provider";
import { OrganizeTool } from "../../tools/organize";
import type { Proposal, ToolInput, ValidationResult, WriteOperation } from "../../types";
import type { CompositeValidator } from "../../validation/composite-validator";
import type { ContentBuilder } from "../../writing/content-builder";
import { FirmRepository } from "../../writing/firm-repository";
import type { NavigationSync } from "../../writing/navigation-sync";
import type { RulesRepository } from "../../writing/rules-repository";

// ── Helpers ───────────────────────────────────────────────────────────────

const TEMP_ROOT = join("/tmp", "organize-tool-test", Date.now().toString());

function makeInput(): ToolInput {
	return { projectRoot: TEMP_ROOT };
}

const MOCK_VALID_RESULT: ValidationResult = {
	valid: true,
	errors: [],
	warnings: [],
};

interface MockDeps {
	scanner: unknown;
	validator: CompositeValidator;
	firmRepo: FirmRepository;
	rulesRepo: unknown;
	templates: TemplateProvider;
	approval: ApprovalGate;
	navSync: NavigationSync;
	contentBuilder: unknown;
}

/**
 * Build mock deps with a REAL FirmRepository pointing at the temp .firm/ dir.
 * OrganizeTool.scan() reads the filesystem directly; write() uses FirmRepository.
 * Other deps (validator, templates, scanner, etc.) are stubs.
 */
function makeMockDeps(firmRoot: string): MockDeps {
	const validator: CompositeValidator = {
		name: "mock-validator",
		validate: () => ({ ...MOCK_VALID_RESULT }),
	};

	const templates: TemplateProvider = {
		getTemplate: async () => ({
			name: "concept",
			contentType: "concept",
			sections: [],
			frontmatterSchema: {},
			mviLimits: { maxLines: 200, maxDescription: 120 },
		}),
		listTemplates: () => [],
	};

	const firmRepo = new FirmRepository(firmRoot);

	return {
		scanner: {},
		validator,
		firmRepo,
		rulesRepo: {},
		templates,
		approval: new RealApprovalGate(),
		navSync: {
			syncAll: async () => [],
		} as unknown as NavigationSync,
		contentBuilder: {},
	};
}

function makeTool(deps: MockDeps): OrganizeTool {
	return new OrganizeTool(
		deps.scanner as Parameters<typeof OrganizeTool>[0],
		deps.validator,
		deps.firmRepo,
		deps.rulesRepo as Parameters<typeof OrganizeTool>[4],
		deps.templates,
		deps.approval,
		deps.navSync,
		deps.contentBuilder as Parameters<typeof OrganizeTool>[7],
	);
}

async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isFile();
	} catch {
		return false;
	}
}

async function dirExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		return false;
	}
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("OrganizeTool", () => {
	const firmRoot = join(TEMP_ROOT, ".firm");

	beforeEach(async () => {
		await mkdir(firmRoot, { recursive: true });
	});

	afterEach(async () => {
		await rm(TEMP_ROOT, { recursive: true, force: true });
	});

	describe("misplaced ADR detection", () => {
		it("detects ADR file in wrong directory", async () => {
			await mkdir(join(firmRoot, "concepts"), { recursive: true });
			await mkdir(join(firmRoot, "concepts", "decisions"), { recursive: true });
			await writeFile(
				join(firmRoot, "concepts", "adr-001-architecture.md"),
				"---\nstatus: active\n---\n\n# ADR 001\n",
			);

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);

			const proposal = result.items?.[0];
			expect(proposal?.action).toBe("move");
			expect(proposal?.targetPath).toBe("concepts/decisions/adr-001-architecture.md");
			expect(proposal?.diff).toBe("concepts/adr-001-architecture.md");
		});

		it("does not flag ADR file already in decisions/", async () => {
			await mkdir(join(firmRoot, "concepts", "decisions"), { recursive: true });
			await writeFile(
				join(firmRoot, "concepts", "decisions", "adr-001-architecture.md"),
				"---\nstatus: active\n---\n\n# ADR 001\n",
			);

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("empty");
		});
	});

	describe("empty directory detection", () => {
		it("detects empty directories with only navigation.md", async () => {
			await mkdir(join(firmRoot, "specs"), { recursive: true });
			await writeFile(
				join(firmRoot, "specs", "navigation.md"),
				"---\nstatus: active\n---\n\n# specs\n\n| Name | Description |\n",
			);

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);

			const proposal = result.items?.[0];
			expect(proposal?.action).toBe("delete");
			expect(proposal?.targetPath).toBe("specs");
		});

		it("does not flag directories with content files", async () => {
			await mkdir(join(firmRoot, "specs"), { recursive: true });
			await writeFile(join(firmRoot, "specs", "navigation.md"), "---\nstatus: active\n---\n\n# specs\n");
			await writeFile(join(firmRoot, "specs", "api-design.md"), "---\nstatus: active\n---\n\n# API Design\n");

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			// No organizational issues
			expect(result.status).toBe("empty");
		});

		it("does not flag directories with subdirectories", async () => {
			await mkdir(join(firmRoot, "concepts"), { recursive: true });
			await mkdir(join(firmRoot, "concepts", "decisions"), { recursive: true });
			await writeFile(join(firmRoot, "concepts", "navigation.md"), "---\nstatus: active\n---\n\n# concepts\n");
			await writeFile(
				join(firmRoot, "concepts", "decisions", "navigation.md"),
				"---\nstatus: active\n---\n\n# decisions\n",
			);

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			// "concepts" has subdirs, so it's not empty
			// "concepts/decisions" has only navigation.md and no subdirs — that IS empty
			const deleteProposals = result.items?.filter((p) => p.action === "delete") ?? [];
			expect(deleteProposals).toHaveLength(1);
			expect(deleteProposals[0]?.targetPath).toBe("concepts/decisions");
		});
	});

	describe("groupable file detection", () => {
		it("detects files that could be grouped into subdirectory", async () => {
			await mkdir(join(firmRoot, "concepts"), { recursive: true });
			await writeFile(join(firmRoot, "concepts", "the-firm-adr-001.md"), "---\nstatus: active\n---\n\n# ADR 1\n");
			await writeFile(join(firmRoot, "concepts", "the-firm-adr-002.md"), "---\nstatus: active\n---\n\n# ADR 2\n");
			await writeFile(join(firmRoot, "concepts", "the-firm-adr-003.md"), "---\nstatus: active\n---\n\n# ADR 3\n");

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			const moveProposals = result.items?.filter((p) => p.action === "move") ?? [];
			expect(moveProposals).toHaveLength(3);

			for (const proposal of moveProposals) {
				expect(proposal.targetPath).toMatch(/^concepts\/the-firm-adr\//);
				expect(proposal.diff).toMatch(/^concepts\/the-firm-adr-\d+\.md$/);
			}
		});

		it("does not group files with fewer than 3 shared prefix", async () => {
			await mkdir(join(firmRoot, "concepts"), { recursive: true });
			await writeFile(join(firmRoot, "concepts", "my-feature-001.md"), "# 1\n");
			await writeFile(join(firmRoot, "concepts", "my-feature-002.md"), "# 2\n");

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("empty");
		});
	});

	describe("move proposals", () => {
		it("creates move proposals with correct source and target", async () => {
			await mkdir(join(firmRoot, "errors"), { recursive: true });
			await mkdir(join(firmRoot, "concepts", "decisions"), { recursive: true });
			await writeFile(join(firmRoot, "errors", "adr-005-security.md"), "# Security ADR\n");

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			const proposal = result.items?.[0];
			expect(proposal).toBeDefined();
			expect(proposal?.action).toBe("move");
			expect(proposal?.diff).toBe("errors/adr-005-security.md");
			expect(proposal?.targetPath).toBe("concepts/decisions/adr-005-security.md");
		});
	});

	describe("dry-run mode", () => {
		it("returns proposals without writing", async () => {
			await mkdir(join(firmRoot, "concepts"), { recursive: true });
			await mkdir(join(firmRoot, "concepts", "decisions"), { recursive: true });
			await writeFile(join(firmRoot, "concepts", "adr-001-test.md"), "# Test ADR\n");

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);

			// Source file should still exist (nothing was written)
			expect(await fileExists(join(firmRoot, "concepts", "adr-001-test.md"))).toBe(true);
		});
	});

	describe("auto mode", () => {
		it("moves files and updates navigation", async () => {
			await mkdir(join(firmRoot, "concepts"), { recursive: true });
			await mkdir(join(firmRoot, "concepts", "decisions"), { recursive: true });
			await writeFile(
				join(firmRoot, "concepts", "adr-001-architecture.md"),
				"---\nstatus: active\n---\n\n# ADR 001 Architecture\n",
			);

			const syncedDirs: string[] = [];
			const deps = makeMockDeps(firmRoot);
			// Override navSync to track calls
			(deps.navSync as unknown as { syncAll: (root: string) => Promise<string[]> }).syncAll = (root: string) => {
				syncedDirs.push(root);
				return Promise.resolve(["concepts/decisions"]);
			};

			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);

			// Source file should be gone
			expect(await fileExists(join(firmRoot, "concepts", "adr-001-architecture.md"))).toBe(false);

			// Target file should exist with original content
			const movedContent = await readFile(
				join(firmRoot, "concepts", "decisions", "adr-001-architecture.md"),
				"utf-8",
			);
			expect(movedContent).toContain("ADR 001 Architecture");

			// Navigation sync was called
			expect(syncedDirs).toHaveLength(1);

			// Write result has correct metadata
			expect(result.metadata?.writtenFiles).toBeDefined();
			expect(result.metadata?.writtenFiles).toHaveLength(1);
		});

		it("deletes empty directories in auto mode", async () => {
			await mkdir(join(firmRoot, "specs"), { recursive: true });
			await writeFile(join(firmRoot, "specs", "navigation.md"), "---\nstatus: active\n---\n\n# specs\n");

			const deps = makeMockDeps(firmRoot);
			const tool = makeTool(deps);
			const result = await tool.execute(makeInput(), "auto");

			expect(result.status).toBe("success");

			// Directory should be gone
			expect(await dirExists(join(firmRoot, "specs"))).toBe(false);
		});
	});
});
