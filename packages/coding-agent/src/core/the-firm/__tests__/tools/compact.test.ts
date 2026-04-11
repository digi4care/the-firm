import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ApprovalGate as RealApprovalGate } from "../../pipeline/approval-gate";
import type { ApprovalGate } from "../../pipeline/approval-gate";
import type { ProjectScanner } from "../../scanning/project-scanner";
import type { TemplateProvider } from "../../templates/template-provider";
import { CompactTool } from "../../tools/compact";
import type { Proposal, ToolInput, ValidationResult, WriteOperation } from "../../types";
import type { CompositeValidator } from "../../validation/composite-validator";
import type { ContentBuilder } from "../../writing/content-builder";
import type { FirmRepository } from "../../writing/firm-repository";
import type { NavigationSync } from "../../writing/navigation-sync";
import type { RulesRepository } from "../../writing/rules-repository";

// ── Helpers ───────────────────────────────────────────────────────────────

const TEMP_ROOT = join("/tmp", "compact-tool-test", Date.now().toString());

function makeInput(overrides: Partial<ToolInput> = {}): ToolInput {
	return { projectRoot: TEMP_ROOT, ...overrides };
}

/** Produce a long markdown file exceeding MVI content limit (200 lines). */
function makeLongContent(extraSections = 5, linesPerSection = 40): string {
	let content = "---\nstatus: active\ndescription: Test file\n---\n\n# Test Document\n\n";

	for (let i = 0; i < extraSections; i++) {
		content += `## Section ${i + 1}\n\n`;
		for (let j = 0; j < linesPerSection; j++) {
			content += `Line ${j + 1} of section ${i + 1}.\n`;
		}
		content += "\n";
	}

	return content;
}

/** Produce a navigation.md exceeding nav limit (50 lines). */
function makeLongNavContent(entries = 60): string {
	let content = "---\ntitle: Navigation\n---\n\n# Navigation\n\n";
	for (let i = 0; i < entries; i++) {
		content += `- [Item ${i + 1}](./item-${i + 1}.md)\n`;
	}
	return content;
}

/** Build mock dependencies for CompactTool. */
function makeMocks(firmRepoOverrides: Partial<FirmRepository> = {}, useRealApproval = false) {
	const validator: CompositeValidator = {
		name: "mock-validator",
		validate: () => ({ valid: true, errors: [], warnings: [] }) satisfies ValidationResult,
	};

	const templates: TemplateProvider = {
		getTemplate: async () => ({
			name: "decision",
			contentType: "decision",
			sections: [],
			frontmatterSchema: {},
			mviLimits: { maxLines: 200, maxDescription: 120 },
		}),
		listTemplates: () => [],
	};

	const firmRepo = {
		writeWithBackup: async (p: string, c: string) =>
			({
				action: "update" as const,
				targetPath: p,
				content: c,
			}) satisfies WriteOperation,
		delete: async (_p: string) => {
			/* intentional no-op */
		},
		read: async (_p: string) => null as string | null,
		write: async (_p: string, _c: string) => {
			/* intentional no-op */
		},
		exists: async (_p: string) => false,
		list: async (_d: string) => [] as string[],
		move: async (_f: string, _t: string) => {
			/* intentional no-op */
		},
		backup: async (_p: string) => ".firm.backup/test",
		...firmRepoOverrides,
	} as unknown as FirmRepository;

	const approval: ApprovalGate = useRealApproval
		? (new RealApprovalGate() as unknown as ApprovalGate)
		: ({ approve: async (proposals: Proposal[]) => [...proposals] } as unknown as ApprovalGate);

	const navSync: NavigationSync = {
		syncAll: async () => [],
	} as unknown as NavigationSync;

	return {
		scanner: {} as ProjectScanner,
		validator,
		firmRepo,
		rulesRepo: {} as RulesRepository,
		templates,
		approval,
		navSync,
		contentBuilder: {} as ContentBuilder,
	};
}

function makeTool(mocks: ReturnType<typeof makeMocks>) {
	return new CompactTool(
		mocks.scanner,
		mocks.validator,
		mocks.firmRepo,
		mocks.rulesRepo,
		mocks.templates,
		mocks.approval,
		mocks.navSync,
		mocks.contentBuilder
	);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("CompactTool", () => {
	beforeEach(async () => {
		await mkdir(join(TEMP_ROOT, ".firm", "concepts"), { recursive: true });
		await mkdir(join(TEMP_ROOT, ".firm", "guides"), { recursive: true });
	});

	afterEach(async () => {
		await rm(TEMP_ROOT, { recursive: true, force: true });
	});

	describe("scan", () => {
		it("identifies files exceeding MVI content limit", async () => {
			const longContent = makeLongContent();
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "big-file.md"), longContent);
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "small-file.md"), "# Small\n\nOK\n");

			const mocks = makeMocks({}, true);
			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0]?.targetPath).toContain("big-file.md");
		});

		it("identifies navigation files exceeding 50-line limit", async () => {
			await mkdir(join(TEMP_ROOT, ".firm", "concepts"), { recursive: true });
			const longNav = makeLongNavContent();
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "navigation.md"), longNav);
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "small.md"), "# Small\n");

			const mocks = makeMocks({}, true);
			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0]?.targetPath).toContain("navigation.md");
		});
	});

	describe("compaction", () => {
		it("compacts by truncating with notice", async () => {
			const longContent = makeLongContent(6, 40);
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "verbose.md"), longContent);

			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "auto");

			expect(result.status).toBe("success");
			const proposal = result.items?.[0];
			expect(proposal).toBeDefined();
			expect(proposal?.content).toContain("Content truncated");
			expect(proposal?.content.split("\n").length).toBeLessThanOrEqual(200);
		});

		it("preserves frontmatter after compaction", async () => {
			const longContent = makeLongContent();
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "with-fm.md"), longContent);

			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "auto");

			const proposal = result.items?.[0];
			expect(proposal).toBeDefined();
			expect(proposal?.content).toMatch(/^---\nstatus: active\n/);
		});

		it("preserves first sections intact", async () => {
			const longContent = makeLongContent(6, 35);
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "first-sec.md"), longContent);

			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "auto");

			const proposal = result.items?.[0];
			expect(proposal).toBeDefined();
			expect(proposal?.content).toContain("## Section 1");
			expect(proposal?.content).toContain("## Section 2");
		});

		it("includes summary of truncated sections", async () => {
			const longContent = makeLongContent(8, 30);
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "summary.md"), longContent);

			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "auto");

			const proposal = result.items?.[0];
			expect(proposal).toBeDefined();
			expect(proposal?.content).toContain("## Summary of Truncated Content");
		});
	});

	describe("dry-run mode", () => {
		it("returns proposals without writing", async () => {
			const longContent = makeLongContent();
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "dry.md"), longContent);

			const writtenPaths: string[] = [];
			const mocks = makeMocks({
				writeWithBackup: (p: string, c: string) => {
					writtenPaths.push(p);
					return { action: "update" as const, targetPath: p, content: c };
				},
			});
			// Override approval to return empty (dry-run behavior)
			(mocks.approval as unknown as { approve: (p: Proposal[]) => Proposal[] }).approve = () => [];

			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);
			expect(writtenPaths).toHaveLength(0);
		});
	});

	describe("auto mode", () => {
		it("writes compacted files with backup", async () => {
			const longContent = makeLongContent();
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "auto.md"), longContent);

			const writtenOps: WriteOperation[] = [];
			const mocks = makeMocks({
				writeWithBackup: (p: string, c: string) => {
					const op: WriteOperation = { action: "update", targetPath: p, content: c };
					writtenOps.push(op);
					return op;
				},
			});

			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "auto");

			expect(result.status).toBe("success");
			expect(writtenOps).toHaveLength(1);
			expect(writtenOps[0].action).toBe("update");
		});
	});

	describe("files within limits", () => {
		it("skips files already within limits", async () => {
			const shortContent = "---\nstatus: active\n---\n\n# Short\n\nThis is fine.\n";
			await writeFile(join(TEMP_ROOT, ".firm", "concepts", "short.md"), shortContent);

			const mocks = makeMocks();
			const tool = makeTool(mocks);
			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("empty");
			expect(result.items).toBeUndefined();
		});
	});
});
