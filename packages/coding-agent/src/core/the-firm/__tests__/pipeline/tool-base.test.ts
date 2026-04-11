import { describe, expect, it } from "vitest";
import type { ApprovalGate } from "../../pipeline/approval-gate";
import type { PipelineContext } from "../../pipeline/pipeline-context";
import { KBToolBase } from "../../pipeline/tool-base";
import type { ProjectScanner } from "../../scanning/project-scanner";
import type { TemplateProvider } from "../../templates/template-provider";
import type {
	ProjectProfile,
	Proposal,
	ProposalMetadata,
	Template,
	ToolInput,
	ValidationResult,
	WriteOperation,
} from "../../types";
import type { CompositeValidator } from "../../validation/composite-validator";
import type { ContentBuilder } from "../../writing/content-builder";
import type { FirmRepository } from "../../writing/firm-repository";
import type { NavigationSync } from "../../writing/navigation-sync";
import type { RulesRepository } from "../../writing/rules-repository";

// ─── Test helpers ────────────────────────────────────────────────────────────

/** Minimal valid proposal factory. */
function makeProposal(overrides: Partial<Proposal> = {}): Proposal {
	return {
		id: "prop-1",
		action: "create",
		targetPath: "decisions/test-decision.md",
		content: "---\nstatus: active\n---\n# Test\n\nBody",
		metadata: {
			contentType: "decision",
			category: "concepts",
			template: "decision",
			validationPassed: true,
		} satisfies ProposalMetadata,
		...overrides,
	};
}

/** Standard ToolInput factory. */
function makeInput(overrides: Partial<ToolInput> = {}): ToolInput {
	return { projectRoot: "/tmp/test-project", ...overrides };
}

/**
 * Creates a concrete TestTool subclass with controllable behavior.
 * Each pipeline method pushes its name into `callOrder` for ordering assertions.
 */
function createTestToolClass(deps: {
	buildFn?: (input: ToolInput, ctx: PipelineContext) => void;
	callOrder?: string[];
	scanFn?: (input: ToolInput, ctx: PipelineContext) => Promise<void>;
}) {
	return class TestTool extends KBToolBase {
		readonly name = "test-tool";
		readonly description = "Test tool for KBToolBase";

		protected async scan(input: ToolInput, context: PipelineContext): Promise<void> {
			deps.callOrder?.push("scan");
			if (deps.scanFn) {
				await deps.scanFn(input, context);
			}
		}

		protected analyze(_input: ToolInput, _context: PipelineContext): Promise<void> {
			deps.callOrder?.push("analyze");
			return Promise.resolve();
		}

		protected buildProposals(input: ToolInput, context: PipelineContext): void {
			deps.callOrder?.push("buildProposals");
			if (deps.buildFn) {
				deps.buildFn(input, context);
			}
		}
	};
}

/** Mock template that resolves immediately. */
const MOCK_TEMPLATE: Template = {
	name: "decision",
	contentType: "decision",
	sections: [],
	frontmatterSchema: {},
	mviLimits: { maxLines: 200, maxDescription: 120 },
};

/** Mock validation result (passing). */
const MOCK_VALID_RESULT: ValidationResult = {
	valid: true,
	errors: [],
	warnings: [],
};

/** Mock write operation. */
const MOCK_WRITE_OP: WriteOperation = {
	action: "create",
	targetPath: "decisions/test-decision.md",
	content: "---\nstatus: active\n---\n# Test\n\nBody",
};

/** All mock dependencies needed by KBToolBase, typed to satisfy the constructor. */
interface MockDeps {
	scanner: ProjectScanner;
	validator: CompositeValidator;
	firmRepo: FirmRepository;
	rulesRepo: RulesRepository;
	templates: TemplateProvider;
	approval: ApprovalGate;
	navSync: NavigationSync;
	contentBuilder: ContentBuilder;
}

/** Build a fully mocked deps bag with sensible defaults. */
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
		writeWithBackup: async (p: string, c: string) =>
			({
				action: "create" as const,
				targetPath: p,
				content: c,
			}) satisfies WriteOperation,
		delete: async (_p: string) => {
			// intentional no-op for mock
		},
	} as unknown as FirmRepository;

	const approval: ApprovalGate = {
		approve: async (proposals: Proposal[]) => [...proposals],
	} as unknown as ApprovalGate;

	const navSync: NavigationSync = {
		syncAll: async () => ["decisions/"],
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

/** Instantiate a TestTool with the given mocks. */
function makeTool(mocks: MockDeps, deps: Parameters<typeof createTestToolClass>[0] = {}) {
	const Cls = createTestToolClass(deps);
	return new Cls(
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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("KBToolBase", () => {
	describe("pipeline execution order", () => {
		it("executes stages in correct order and reports success", async () => {
			const callOrder: string[] = [];
			const mocks = makeMocks();
			const tool = makeTool(mocks, {
				callOrder,
				buildFn: (_input, ctx) => {
					ctx.proposals.push(makeProposal());
				},
			});

			const result = await tool.execute(makeInput(), "auto");

			expect(callOrder).toEqual(["scan", "analyze", "buildProposals"]);
			expect(result.status).toBe("success");
			expect(result.message).toContain("1 file(s) written");
		});
	});

	describe("scan failure", () => {
		it("returns error status when scan throws", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks, {
				scanFn: () => {
					throw new Error("Scanner exploded");
				},
			});

			const result = await tool.execute(makeInput());

			expect(result.status).toBe("error");
			expect(result.message).toBe("Scanner exploded");
		});

		it("handles non-Error throws", async () => {
			const mocks = makeMocks();

			class StringErrorTool extends createTestToolClass({}) {
				protected scan(): Promise<void> {
					throw "string error";
				}
			}

			const tool = new StringErrorTool(
				mocks.scanner,
				mocks.validator,
				mocks.firmRepo,
				mocks.rulesRepo,
				mocks.templates,
				mocks.approval,
				mocks.navSync,
				mocks.contentBuilder,
			);

			const result = await tool.execute(makeInput());
			expect(result.status).toBe("error");
			expect(result.message).toBe("string error");
		});
	});

	describe("empty analysis", () => {
		it("returns empty status when no proposals generated", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks);

			const result = await tool.execute(makeInput());

			expect(result.status).toBe("empty");
			expect(result.message).toBe("No proposals generated");
			expect(result.items).toBeUndefined();
		});
	});

	describe("dry-run mode", () => {
		it("returns proposals status without writing", async () => {
			const writtenPaths: string[] = [];
			const mocks = makeMocks();
			const origWrite = mocks.firmRepo.writeWithBackup.bind(mocks.firmRepo);
			mocks.firmRepo.writeWithBackup = (p: string, c: string) => {
				writtenPaths.push(p);
				return origWrite(p, c);
			};
			// dry-run: approval gate returns empty
			(mocks.approval as unknown as { approve: (p: Proposal[], m: string) => Promise<Proposal[]> }).approve =
				async () => [];

			const tool = makeTool(mocks, {
				buildFn: (_input, ctx) => {
					ctx.proposals.push(makeProposal());
				},
			});

			const result = await tool.execute(makeInput(), "dry-run");

			expect(result.status).toBe("proposals");
			expect(result.message).toContain("1 proposals generated");
			expect(result.items).toHaveLength(1);
			expect(writtenPaths).toHaveLength(0);
		});
	});

	describe("auto mode", () => {
		it("writes proposals and returns success", async () => {
			const mocks = makeMocks();
			const tool = makeTool(mocks, {
				buildFn: (_input, ctx) => {
					ctx.proposals.push(makeProposal({ targetPath: "concepts/test.md" }));
					ctx.proposals.push(makeProposal({ id: "prop-2", targetPath: "guides/guide.md" }));
				},
			});

			const result = await tool.execute(makeInput(), "auto");

			expect(result.status).toBe("success");
			expect(result.message).toContain("2 file(s) written");
			expect(result.items).toHaveLength(2);
		});
	});

	describe("validation errors", () => {
		it("captures validation errors but does not stop pipeline", async () => {
			const mocks = makeMocks();
			(mocks.validator as unknown as { validate: (c: string, t: Template) => ValidationResult }).validate = () => ({
				valid: false,
				errors: [
					{
						rule: "mvi-lines",
						message: "Content exceeds 200 line limit",
						section: "body",
					},
				],
				warnings: [],
			});

			const tool = makeTool(mocks, {
				buildFn: (_input, ctx) => {
					ctx.proposals.push(makeProposal({ id: "invalid-prop" }));
				},
			});

			const result = await tool.execute(makeInput(), "auto");

			// Pipeline didn't crash
			expect(result.status).toBe("success");
			// auto mode approves everything, so it still gets written
			expect(result.items).toHaveLength(1);
			expect(result.items?.[0].metadata.validationPassed).toBe(false);
			expect(result.items?.[0].metadata.validationErrors).toContain("Content exceeds 200 line limit");
		});

		it("handles missing template gracefully", async () => {
			const mocks = makeMocks();
			mocks.templates.getTemplate = async () => null;

			const tool = makeTool(mocks, {
				buildFn: (_input, ctx) => {
					ctx.proposals.push(
						makeProposal({
							id: "no-template-prop",
							metadata: {
								contentType: "unknown-type" as ProposalMetadata["contentType"],
								category: "concepts",
								template: "unknown",
								validationPassed: true,
							},
						}),
					);
				},
			});

			const result = await tool.execute(makeInput(), "auto");

			expect(result.status).toBe("success");
			expect(result.items?.[0].metadata.validationPassed).toBe(false);
			expect(result.items?.[0].metadata.validationErrors?.[0]).toContain("No template found");
		});
	});

	describe("delete action", () => {
		it("calls delete instead of writeWithBackup for delete proposals", async () => {
			const deletedPaths: string[] = [];
			const writtenPaths: string[] = [];
			const mocks = makeMocks();
			mocks.firmRepo.delete = (p: string) => {
				deletedPaths.push(p);
				return Promise.resolve();
			};
			const origWrite = mocks.firmRepo.writeWithBackup.bind(mocks.firmRepo);
			mocks.firmRepo.writeWithBackup = (p: string, c: string) => {
				writtenPaths.push(p);
				return origWrite(p, c);
			};

			const tool = makeTool(mocks, {
				buildFn: (_input, ctx) => {
					ctx.proposals.push(
						makeProposal({
							id: "del-1",
							action: "delete",
							targetPath: "concepts/old.md",
						}),
					);
				},
			});

			const result = await tool.execute(makeInput(), "auto");

			expect(result.status).toBe("success");
			expect(deletedPaths).toContain("concepts/old.md");
			expect(writtenPaths).toHaveLength(0);
		});
	});
});
