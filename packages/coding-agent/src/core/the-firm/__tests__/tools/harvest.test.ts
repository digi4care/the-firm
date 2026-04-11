import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ApprovalGate } from "../../pipeline/approval-gate";
import type { ApprovalGate as ApprovalGateType } from "../../pipeline/approval-gate";
import type { PipelineContext } from "../../pipeline/pipeline-context";
import type { TemplateProvider } from "../../templates/template-provider";
import type { Proposal, Template, ValidationResult, WriteOperation } from "../../types";
import type { CompositeValidator } from "../../validation/composite-validator";
import { ContentBuilder as RealContentBuilder } from "../../writing/content-builder";
import type { ContentBuilder } from "../../writing/content-builder";
import type { FirmRepository } from "../../writing/firm-repository";
import type { NavigationSync } from "../../writing/navigation-sync";
import type { RulesRepository } from "../../writing/rules-repository";
import { HarvestTool, type HarvestInput } from "../../tools/harvest";

// ── Mock helpers ──────────────────────────────────────────────────────────

const MOCK_VALID_RESULT: ValidationResult = {
	valid: true,
	errors: [],
	warnings: [],
};

const MOCK_TEMPLATE: Template = {
	name: "concept",
	contentType: "concept",
	sections: [],
	frontmatterSchema: {},
	mviLimits: { maxLines: 200, maxDescription: 120 },
};

interface MockDeps {
	scanner: ReturnType<typeof makeScanner>;
	validator: CompositeValidator;
	firmRepo: FirmRepository;
	rulesRepo: RulesRepository;
	templates: TemplateProvider;
	approval: ApprovalGateType;
	navSync: NavigationSync;
	contentBuilder: ContentBuilder;
}

function makeScanner() {
	return {} as ReturnType<typeof makeScanner>;
}

function makeMocks(): MockDeps {
	const validator: CompositeValidator = {
		name: "mock-validator",
		validate: () => ({ ...MOCK_VALID_RESULT }),
	};

	const templates: TemplateProvider = {
		getTemplate: async (_ct: string) => ({ ...MOCK_TEMPLATE }),
		listTemplates: () => [] as Template[],
	};

	const firmRepo: FirmRepository = {
		list: async () => [],
		writeWithBackup: async (p: string, c: string) =>
			({
				action: "create" as const,
				targetPath: p,
				content: c,
			}) satisfies WriteOperation,
		delete: async () => {},
	} as unknown as FirmRepository;

	const approval: ApprovalGateType = {
		approve: async (proposals: Proposal[]) => [...proposals],
	} as unknown as ApprovalGateType;

	const navSync: NavigationSync = {
		syncAll: async () => ["errors/", "concepts/"],
	} as unknown as NavigationSync;

	return {
		scanner: makeScanner(),
		validator,
		firmRepo,
		rulesRepo: {} as RulesRepository,
		templates,
		approval,
		navSync,
		contentBuilder: new RealContentBuilder(),
	};
}

function makeTool(mocks: MockDeps): HarvestTool {
	return new HarvestTool(
		mocks.scanner,
		mocks.validator,
		mocks.firmRepo,
		mocks.rulesRepo,
		mocks.templates,
		mocks.approval,
		mocks.navSync,
		mocks.contentBuilder,
	);
}

// ── Temp dir management ───────────────────────────────────────────────────

let tempRoot: string;

async function makeTempDir(): Promise<string> {
	tempRoot = join(tmpdir(), `the-firm-harvest-test-${Date.now()}`);
	await mkdir(tempRoot, { recursive: true });
	return tempRoot;
}

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
	}
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("HarvestTool", () => {
	describe("harvest from specified source files", () => {
		it("harvests knowledge from a single source file", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "notes.md"), "This is a concept about test patterns.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["notes.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0].action).toBe("create");
		});

		it("harvests from multiple source files", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "a.md"), "Error: something broke");
			await writeFile(join(root, "b.md"), "We decided to use TypeScript");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["a.md", "b.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(2);
		});

		it("harvests from a directory path", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await mkdir(join(root, "docs"), { recursive: true });
			await writeFile(join(root, "docs", "guide.md"), "How to setup the project");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["docs"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
		});
	});

	describe("content type categorization", () => {
		it("categorizes errors from bug/fix keywords", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "bug.md"), "Bug: the login crashes with a stack trace. Fix: check null pointer.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["bug.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("error");
			expect(result.items?.[0].targetPath).toMatch(/^errors\//);
		});

		it("categorizes decisions from 'we decided' keywords", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "decision.md"), "We decided to use PostgreSQL for persistence.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["decision.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("decision");
			expect(result.items?.[0].targetPath).toMatch(/^concepts\/decisions\//);
		});

		it("categorizes patterns from problem/solution keywords", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "pattern.md"), "Problem: slow queries. Solution: add caching layer.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["pattern.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("pattern");
			expect(result.items?.[0].targetPath).toMatch(/^concepts\/patterns\//);
		});

		it("defaults to concept when no keywords match", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "generic.md"), "This is some general information about the project.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["generic.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("concept");
		});
	});

	describe("dry-run mode", () => {
		it("returns proposals without writing", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			// dry-run returns empty approved proposals
			(mocks.approval as unknown as { approve: (p: Proposal[], m: string) => Promise<Proposal[]> }).approve = async () => [];

			const tool = makeTool(mocks);

			await writeFile(join(root, "bug.md"), "Error: connection timeout");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["bug.md"] },
			};

			const result = await tool.execute(input, "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);
		});
	});

	describe("auto mode", () => {
		it("writes categorized files and syncs navigation", async () => {
			const root = await makeTempDir();
			const writtenPaths: string[] = [];
			const syncedDirs: string[][] = [];
			const mocks = makeMocks();

			const origWrite = mocks.firmRepo.writeWithBackup.bind(mocks.firmRepo);
			mocks.firmRepo.writeWithBackup = (p: string, c: string) => {
				writtenPaths.push(p);
				return origWrite(p, c);
			};

			const origSync = mocks.navSync.syncAll.bind(mocks.navSync);
			(mocks.navSync as unknown as { syncAll: (root: string) => Promise<string[]> }).syncAll = (r: string) => {
				syncedDirs.push([r]);
				return origSync(r);
			};

			const tool = makeTool(mocks);

			await writeFile(join(root, "error.md"), "Bug: critical failure in production. Fix: restart the service.");
			await writeFile(join(root, "pattern.md"), "Problem: N+1 queries. Solution: batch loading approach.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["error.md", "pattern.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(2);
			expect(writtenPaths).toHaveLength(2);
			expect(result.metadata?.navigationDirs).toBeDefined();

			// Verify categorization
			const errorProposal = result.items?.find((p) => p.metadata.contentType === "error");
			const patternProposal = result.items?.find((p) => p.metadata.contentType === "pattern");
			expect(errorProposal?.targetPath).toMatch(/^errors\//);
			expect(patternProposal?.targetPath).toMatch(/^concepts\/patterns\//);
		});
	});

	describe("frontmatter generation", () => {
		it("includes source path in frontmatter", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "notes.md"), "Error: disk full. Fix: clean up temp files.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["notes.md"] },
			};

			const result = await tool.execute(input, "auto");

			const content = result.items?.[0].content ?? "";
			expect(content).toContain("source: notes.md");
			expect(content).toContain("owner: harvest");
			expect(content).toContain("status: draft");
		});
	});

	describe("edge cases", () => {
		it("skips empty files", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "empty.md"), "");
			await writeFile(join(root, "real.md"), "We decided to skip empty files.");

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["empty.md", "real.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items).toHaveLength(1);
			expect(result.items?.[0].metadata.contentType).toBe("decision");
		});

		it("returns empty when no candidates found", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			const input: HarvestInput = {
				projectRoot: root,
				options: { sourcePaths: ["nonexistent.md"] },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("empty");
			expect(result.items).toBeUndefined();
		});
	});
});
