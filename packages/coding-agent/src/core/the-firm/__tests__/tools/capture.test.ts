import { describe, expect, it } from "vitest";
import type { ApprovalGate } from "../../pipeline/approval-gate";
import type { PipelineContext } from "../../pipeline/pipeline-context";
import type { TemplateProvider } from "../../templates/template-provider";
import { type CaptureInput, CaptureTool } from "../../tools/capture";
import type { Proposal, Template, ValidationResult, WriteOperation } from "../../types";
import type { CompositeValidator } from "../../validation/composite-validator";
import type { ContentBuilder } from "../../writing/content-builder";
import { ContentBuilder as RealContentBuilder } from "../../writing/content-builder";
import type { FirmRepository } from "../../writing/firm-repository";
import type { NavigationSync } from "../../writing/navigation-sync";
import type { RulesRepository } from "../../writing/rules-repository";

// ── Mock helpers ──────────────────────────────────────────────────────────

const MOCK_VALID_RESULT: ValidationResult = {
	valid: true,
	errors: [],
	warnings: [],
};

const MOCK_TEMPLATE: Template = {
	name: "error",
	contentType: "error",
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
	approval: ApprovalGate;
	navSync: NavigationSync;
	contentBuilder: ContentBuilder;
}

function makeScanner() {
	return {} as ReturnType<typeof makeScanner>;
}

function makeMocks(overrides: { listResult?: string[] } = {}): MockDeps {
	const validator: CompositeValidator = {
		name: "mock-validator",
		validate: () => ({ ...MOCK_VALID_RESULT }),
	};

	const templates: TemplateProvider = {
		getTemplate: async (_ct: string) => ({ ...MOCK_TEMPLATE }),
		listTemplates: () => [] as Template[],
	};

	const firmRepo: FirmRepository = {
		list: async (_dir: string) => overrides.listResult ?? [],
		writeWithBackup: async (p: string, c: string) =>
			({
				action: "create" as const,
				targetPath: p,
				content: c,
			}) satisfies WriteOperation,
		delete: async (_p: string) => {
			/* mock no-op */
		},
	} as unknown as FirmRepository;

	const approval: ApprovalGate = {
		approve: async (proposals: Proposal[]) => [...proposals],
	} as unknown as ApprovalGate;

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

function makeTool(mocks: MockDeps): CaptureTool {
	return new CaptureTool(
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

function makeCaptureInput(overrides: Partial<CaptureInput["options"]> = {}): CaptureInput {
	return {
		projectRoot: "/tmp/test-project",
		options: {
			description: "Test description",
			type: "error",
			...overrides,
		},
	};
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("CaptureTool", () => {
	describe("error capture", () => {
		it("creates error file in .firm/errors/", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const input = makeCaptureInput({
				description: "Database connection timeout after 30s",
				type: "error",
				title: "db-timeout",
			});

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0].action).toBe("create");
			expect(result.items?.[0].targetPath).toMatch(/^errors\/db-timeout-\d{4}-\d{2}-\d{2}\.md$/);
		});
	});

	describe("pattern capture", () => {
		it("creates pattern file in .firm/concepts/patterns/", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const input = makeCaptureInput({
				description: "Retry transient failures with exponential backoff",
				type: "pattern",
				title: "retry-backoff",
			});

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0].action).toBe("create");
			expect(result.items?.[0].targetPath).toMatch(/^concepts\/patterns\/retry-backoff-\d{4}-\d{2}-\d{2}\.md$/);
		});
	});

	describe("dry-run mode", () => {
		it("returns proposal without writing", async () => {
			const writtenPaths: string[] = [];
			const mocks = makeMocks();
			const origWrite = mocks.firmRepo.writeWithBackup.bind(mocks.firmRepo);
			mocks.firmRepo.writeWithBackup = (p: string, c: string) => {
				writtenPaths.push(p);
				return origWrite(p, c);
			};
			// dry-run returns no approved proposals
			(mocks.approval as unknown as { approve: (p: Proposal[], m: string) => Promise<Proposal[]> }).approve =
				async () => [];

			const tool = makeTool(mocks);
			const input = makeCaptureInput({
				description: "Connection refused",
				type: "error",
				title: "conn-refused",
			});

			const result = await tool.execute(input, "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);
			expect(writtenPaths).toHaveLength(0);
		});
	});

	describe("auto mode", () => {
		it("writes file and syncs navigation", async () => {
			const writtenPaths: string[] = [];
			const syncedDirs: string[][] = [];
			const mocks = makeMocks();
			const origWrite = mocks.firmRepo.writeWithBackup.bind(mocks.firmRepo);
			mocks.firmRepo.writeWithBackup = (p: string, c: string) => {
				writtenPaths.push(p);
				return origWrite(p, c);
			};
			const origSync = mocks.navSync.syncAll.bind(mocks.navSync);
			(mocks.navSync as unknown as { syncAll: (root: string) => Promise<string[]> }).syncAll = (root: string) => {
				syncedDirs.push([root]);
				return origSync(root);
			};

			const tool = makeTool(mocks);
			const input = makeCaptureInput({
				description: "Out of memory during large file processing",
				type: "error",
				title: "oom-error",
			});

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
			expect(writtenPaths).toHaveLength(1);
			expect(result.metadata?.navigationDirs).toBeDefined();
		});
	});

	describe("frontmatter generation", () => {
		it("generates correct frontmatter for error (status: draft, owner, dates)", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const today = new Date().toISOString().slice(0, 10);
			const input = makeCaptureInput({
				description: "Failed to parse config file",
				type: "error",
				title: "config-parse",
			});

			const result = await tool.execute(input, "auto");

			const content = result.items?.[0].content ?? "";
			expect(content).toContain("status: draft");
			expect(content).toContain("owner: capture");
			expect(content).toContain(`created: ${today}`);
			expect(content).toContain(`updated: ${today}`);
			expect(content).toContain("review-cadence: as-needed");
		});

		it("generates correct frontmatter for pattern (status: draft, owner, dates)", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const today = new Date().toISOString().slice(0, 10);
			const input = makeCaptureInput({
				description: "Circuit breaker pattern for external service calls",
				type: "pattern",
				title: "circuit-breaker",
			});

			const result = await tool.execute(input, "auto");

			const content = result.items?.[0].content ?? "";
			expect(content).toContain("status: draft");
			expect(content).toContain("owner: capture");
			expect(content).toContain(`created: ${today}`);
			expect(content).toContain(`updated: ${today}`);
		});

		it("places description in first section (Symptoms for error, Problem for pattern)", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			// Error -> Symptoms
			const errorResult = await tool.execute(
				makeCaptureInput({ description: "Timeout exceeded", type: "error", title: "t" }),
				"auto",
			);
			expect(errorResult.items?.[0].content).toContain("## Symptom");
			expect(errorResult.items?.[0].content).toContain("Timeout exceeded");

			// Pattern -> Problem
			const patternResult = await tool.execute(
				makeCaptureInput({ description: "Rate limiting pattern", type: "pattern", title: "t" }),
				"auto",
			);
			expect(patternResult.items?.[0].content).toContain("## Problem");
			expect(patternResult.items?.[0].content).toContain("Rate limiting pattern");
		});

		it("auto-generates title from description when title not provided", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const input: CaptureInput = {
				projectRoot: "/tmp/test-project",
				options: {
					description: "Connection refused on port 5432",
					type: "error",
				},
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items?.[0].targetPath).toMatch(/^errors\//);
			// Title derived from first line of description
			expect(result.items?.[0].content).toContain("Connection refused on port 5432");
		});
	});

	describe("proposal metadata", () => {
		it("sets correct contentType and category for errors", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const input = makeCaptureInput({ type: "error", title: "x" });

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("error");
			expect(result.items?.[0].metadata.category).toBe("errors");
		});

		it("sets correct contentType and category for patterns", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const input = makeCaptureInput({ type: "pattern", title: "x" });

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("pattern");
			expect(result.items?.[0].metadata.category).toBe("concepts");
		});
	});

	describe("scan - duplicate detection context", () => {
		it("scans existing files in target directory", async () => {
			const listedDirs: string[] = [];
			const mocks = makeMocks({ listResult: ["existing-error.md"] });
			const origList = mocks.firmRepo.list.bind(mocks.firmRepo);
			mocks.firmRepo.list = (dir: string) => {
				listedDirs.push(dir);
				return origList(dir);
			};

			const tool = makeTool(mocks);
			await tool.execute(makeCaptureInput({ type: "error", title: "x" }), "auto");

			expect(listedDirs).toContain("errors");
		});

		it("scans patterns directory for pattern type", async () => {
			const listedDirs: string[] = [];
			const mocks = makeMocks();
			const origList = mocks.firmRepo.list.bind(mocks.firmRepo);
			mocks.firmRepo.list = (dir: string) => {
				listedDirs.push(dir);
				return origList(dir);
			};

			const tool = makeTool(mocks);
			await tool.execute(makeCaptureInput({ type: "pattern", title: "x" }), "auto");

			expect(listedDirs).toContain("concepts/patterns");
		});
	});

	describe("edge cases", () => {
		it("truncates long descriptions in frontmatter to 120 chars", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const longDesc = "A".repeat(200);
			const input = makeCaptureInput({ description: longDesc, title: "long-desc" });

			const result = await tool.execute(input, "auto");

			const content = result.items?.[0].content ?? "";
			// Extract the description from frontmatter
			const fmMatch = content.match(/description: (.+)/);
			expect(fmMatch).toBeTruthy();
			const fmDesc = fmMatch?.[1];
			// Should be truncated (with trailing ellipsis if truncated)
			expect(fmDesc.length).toBeLessThanOrEqual(121); // 120 + ellipsis char
		});
	});
});
