import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ApprovalGate as ApprovalGateType } from "../../pipeline/approval-gate";
import { ApprovalGate } from "../../pipeline/approval-gate";
import type { PipelineContext } from "../../pipeline/pipeline-context";
import type { TemplateProvider } from "../../templates/template-provider";
import { type ExtractInput, ExtractTool } from "../../tools/extract";
import type { Proposal, Template, ValidationResult, WriteOperation } from "../../types";
import type { CompositeValidator } from "../../validation/composite-validator";
import type { ContentBuilder } from "../../writing/content-builder";
import { ContentBuilder as RealContentBuilder } from "../../writing/content-builder";
import type { FirmRepository } from "../../writing/firm-repository";
import type { NavigationSync } from "../../writing/navigation-sync";
import type { RulesRepository } from "../../writing/rules-repository";

// ── Fetch mock ──────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch;

beforeEach(() => {
	globalThis.fetch = originalFetch;
});

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
		syncAll: async () => ["concepts/"],
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

function makeTool(mocks: MockDeps): ExtractTool {
	return new ExtractTool(
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
	tempRoot = join(tmpdir(), `the-firm-extract-test-${Date.now()}`);
	await mkdir(tempRoot, { recursive: true });
	return tempRoot;
}

afterEach(async () => {
	globalThis.fetch = originalFetch;
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
	}
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("ExtractTool", () => {
	describe("file extraction", () => {
		it("extracts from a file source", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "doc.md"), "Some documentation content");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "doc.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0].action).toBe("create");
		});

		it("fetches URL with text/plain content", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			globalThis.fetch = async () =>
				new Response("Plain text content", {
					status: 200,
					headers: { "content-type": "text/plain" },
				});

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "https://example.com/doc.txt" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0].action).toBe("create");
			expect(result.items?.[0].content).toContain("Plain text content");
		});

		it("fetches URL and strips HTML to plain text", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			const html =
				"<html><head><style>body{}</style></head><body><h1>Title</h1><p>Content &amp; more</p></body></html>";
			globalThis.fetch = async () =>
				new Response(html, {
					status: 200,
					headers: { "content-type": "text/html; charset=utf-8" },
				});

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "https://example.com/page.html" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items?.[0].content).toContain("Title");
			expect(result.items?.[0].content).toContain("Content & more");
			expect(result.items?.[0].content).not.toContain("<html>");
			expect(result.items?.[0].content).not.toContain("<style>");
		});

		it("reports error on failed URL fetch", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			globalThis.fetch = async () =>
				new Response("Not Found", {
					status: 404,
					statusText: "Not Found",
				});

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "https://example.com/missing.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("error");
			expect(result.message).toContain("Failed to fetch URL");
			expect(result.message).toContain("404");
		});

		it("reports error for missing file", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "nonexistent.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("error");
			expect(result.message).toContain("Cannot read source file");
		});
	});

	describe("content type handling", () => {
		it("uses specified contentType when provided", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "data.md"), "Generic content without keywords");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "data.md", contentType: "decision" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("decision");
			expect(result.items?.[0].targetPath).toMatch(/^concepts\/decisions\//);
		});

		it("infers contentType from content when not specified", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "error.md"), "Bug: system crash. Fix: restart the process.");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "error.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("error");
			expect(result.items?.[0].targetPath).toMatch(/^errors\//);
		});

		it("infers guide from how-to keywords", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "setup.md"), "How to setup the development environment step by step");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "setup.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("guide");
			expect(result.items?.[0].targetPath).toMatch(/^guides\//);
		});

		it("infers pattern from problem/solution keywords", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "pattern.md"), "Problem: N+1 queries. Solution: use DataLoader.");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "pattern.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("pattern");
		});

		it("defaults to concept when no keywords match", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "notes.md"), "General notes about the architecture.");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "notes.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].metadata.contentType).toBe("concept");
		});
	});

	describe("dry-run mode", () => {
		it("returns proposal without writing", async () => {
			const root = await makeTempDir();
			const writtenPaths: string[] = [];
			const mocks = makeMocks();

			// dry-run: no approved proposals
			(mocks.approval as unknown as { approve: (p: Proposal[], m: string) => Promise<Proposal[]> }).approve =
				async () => [];

			const tool = makeTool(mocks);

			await writeFile(join(root, "doc.md"), "Important decision record");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "doc.md" },
			};

			const result = await tool.execute(input, "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.items).toHaveLength(1);
			expect(writtenPaths).toHaveLength(0);
		});
	});

	describe("auto mode", () => {
		it("writes extracted file and syncs navigation", async () => {
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

			await writeFile(join(root, "doc.md"), "We decided to use microservices for scalability.");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "doc.md" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.status).toBe("success");
			expect(result.items).toHaveLength(1);
			expect(writtenPaths).toHaveLength(1);
			expect(result.metadata?.navigationDirs).toBeDefined();
		});
	});

	describe("frontmatter and content", () => {
		it("includes source path in frontmatter", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "guide.md"), "How to deploy the application");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "guide.md" },
			};

			const result = await tool.execute(input, "auto");

			const content = result.items?.[0].content ?? "";
			expect(content).toContain("source: guide.md");
			expect(content).toContain("owner: extract");
			expect(content).toContain("status: draft");
		});

		it("uses provided title in filename and content", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			await writeFile(join(root, "doc.md"), "Some content about architecture");

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "doc.md", title: "Architecture Overview" },
			};

			const result = await tool.execute(input, "auto");

			expect(result.items?.[0].targetPath).toMatch(/architecture-overview/);
			const content = result.items?.[0].content ?? "";
			expect(content).toContain("Architecture Overview");
		});

		it("splits content into summary and details sections", async () => {
			const root = await makeTempDir();
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			const lines = Array.from({ length: 70 }, (_, i) => `Line ${i + 1}`);
			await writeFile(join(root, "long.md"), lines.join("\n"));

			const input: ExtractInput = {
				projectRoot: root,
				options: { source: "long.md", contentType: "concept" },
			};

			const result = await tool.execute(input, "auto");

			const content = result.items?.[0].content ?? "";
			// Summary section should have the first lines
			expect(content).toContain("Line 1");
			// Details section should have lines beyond 50
			expect(content).toContain("Line 51");
		});
	});
});
