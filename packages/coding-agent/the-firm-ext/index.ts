/**
 * The Firm — Pi Extension
 *
 * Registers all 9 KB tools and 6 commands via Pi's ExtensionAPI.
 * The tools use the internal KB pipeline (scan → analyze → build → validate → write).
 *
 * Architecture:
 * - Extension loads → wires up dependencies → registers tools/commands
 * - Tools are pure TS classes, no build step needed (jiti loads .ts directly)
 * - The AI IS the analyzer — no separate LLMClient needed
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { join } from "node:path";

// ─── KB Infrastructure ─────────────────────────────────────────────────────

import { ProjectScanner } from "../src/core/the-firm/scanning/project-scanner.js";
import { LanguageScanner } from "../src/core/the-firm/scanning/language-scanner.js";
import { FrameworkScanner } from "../src/core/the-firm/scanning/framework-scanner.js";
import { StructureScanner } from "../src/core/the-firm/scanning/structure-scanner.js";
import { FirmScanner } from "../src/core/the-firm/scanning/firm-scanner.js";
import { CompositeValidator } from "../src/core/the-firm/validation/composite-validator.js";
import { FrontmatterValidator } from "../src/core/the-firm/validation/frontmatter-validator.js";
import { MVIValidator } from "../src/core/the-firm/validation/mvi-validator.js";
import { TemplateValidator } from "../src/core/the-firm/validation/template-validator.js";
import { LinkValidator } from "../src/core/the-firm/validation/link-validator.js";
import { FirmRepository } from "../src/core/the-firm/writing/firm-repository.js";
import { RulesRepository } from "../src/core/the-firm/writing/rules-repository.js";
import { NavigationSync } from "../src/core/the-firm/writing/navigation-sync.js";
import { WorkflowRepository } from "../src/core/the-firm/writing/workflow-repository.js";
import { ContentBuilder } from "../src/core/the-firm/writing/content-builder.js";
import { ApprovalGate } from "../src/core/the-firm/pipeline/approval-gate.js";
import { FileTemplateProvider } from "../src/core/the-firm/template-engine/file-template-provider.js";

// ─── KB Tools ───────────────────────────────────────────────────────────────

import { InitTool } from "../src/core/the-firm/tools/init.js";
import { SetupTool } from "../src/core/the-firm/tools/setup.js";
import { HarvestTool } from "../src/core/the-firm/tools/harvest.js";
import { CaptureTool } from "../src/core/the-firm/tools/capture.js";
import { ExtractTool } from "../src/core/the-firm/tools/extract.js";
import { OrganizeTool } from "../src/core/the-firm/tools/organize.js";
import { CompactTool } from "../src/core/the-firm/tools/compact.js";
import { MapTool } from "../src/core/the-firm/tools/map.js";
import { WorkflowTool } from "../src/core/the-firm/tools/workflow.js";

// ─── Parameter Schemas ──────────────────────────────────────────────────────

const ProjectRootParam = Type.String({
	description: "Absolute path to the project root directory",
});

const ApprovalModeParam = Type.Optional(
	Type.Union([Type.Literal("dry-run"), Type.Literal("selective"), Type.Literal("auto")], {
		description: "Approval mode: dry-run (preview only), selective (confirm each), auto (approve all)",
	}),
);

const OptionsParam = Type.Optional(
	Type.Record(Type.String(), Type.Unknown(), {
		description: "Tool-specific options",
	}),
);

// ─── Tool Definitions ──────────────────────────────────────────────────────

interface ToolDef {
	name: string;
	label: string;
	description: string;
	promptSnippet: string;
	promptGuidelines: string[];
	schema: ReturnType<typeof Type.Object>;
	factory: (deps: Dependencies) => ToolLike;
}

interface ToolLike {
	readonly name: string;
	readonly description: string;
	execute(input: any, approvalMode?: string): Promise<any>;
}

interface Dependencies {
	scanner: ProjectScanner;
	validator: CompositeValidator;
	firmRepo: FirmRepository;
	rulesRepo: RulesRepository;
	templates: FileTemplateProvider;
	approval: ApprovalGate;
	navSync: NavigationSync;
	contentBuilder: ContentBuilder;
	workflowRepo: import("../src/core/the-firm/writing/workflow-repository.js").WorkflowRepository;
}

const TOOLS: ToolDef[] = [
	{
		name: "firm_init",
		label: "Firm Init",
		description:
			"Initialize .firm/ knowledge base structure for a project. Creates directories, config.json, and navigation files based on project scan. Safe to re-run — skips existing files.",
		promptSnippet: "Initialize The Firm governance (.firm/) for a project",
		promptGuidelines: [
			"Run firm_init before other Firm tools when setting up a new project.",
			"Re-running is safe — existing files are preserved.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			approvalMode: ApprovalModeParam,
		}),
		factory: (deps) => new InitTool(deps.scanner, deps.validator, deps.firmRepo, deps.rulesRepo, deps.templates, deps.approval, deps.navSync, deps.contentBuilder),
	},
	{
		name: "firm_setup",
		label: "Firm Setup",
		description:
			"Set up The Firm governance configuration. Configures project name, root, and governance settings in .firm/config.json.",
		promptSnippet: "Configure The Firm governance settings for a project",
		promptGuidelines: [
			"Run after firm_init to configure project-specific settings.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			options: OptionsParam,
			approvalMode: ApprovalModeParam,
		}),
		factory: (deps) => new SetupTool(deps.scanner, deps.validator, deps.firmRepo, deps.rulesRepo, deps.templates, deps.approval, deps.navSync, deps.contentBuilder),
	},
	{
		name: "firm_harvest",
		label: "Firm Harvest",
		description:
			"Harvest knowledge from source code — extract patterns, decisions, errors, and concepts from project files into the .firm/ knowledge base.",
		promptSnippet: "Harvest knowledge and patterns from source code into .firm/",
		promptGuidelines: [
			"Use firm_harvest to analyze source code and extract institutional knowledge.",
			"Harvest is AI-assisted — provide sourcePaths to focus the analysis.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			options: Type.Optional(Type.Object({
				sourcePaths: Type.Optional(Type.Array(Type.String(), { description: "Paths to analyze" })),
			})),
			approvalMode: ApprovalModeParam,
		}),
		factory: (deps) => new HarvestTool(deps.scanner, deps.validator, deps.firmRepo, deps.rulesRepo, deps.templates, deps.approval, deps.navSync, deps.contentBuilder),
	},
	{
		name: "firm_capture",
		label: "Firm Capture",
		description:
			"Capture a specific piece of knowledge (error, decision, pattern, concept) into the .firm/ knowledge base. Used for targeted, structured knowledge entry.",
		promptSnippet: "Capture a specific knowledge item (error, decision, pattern) into .firm/",
		promptGuidelines: [
			"Use firm_capture for targeted knowledge entry rather than bulk harvest.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			options: OptionsParam,
			approvalMode: ApprovalModeParam,
		}),
		factory: (deps) => new CaptureTool(deps.scanner, deps.validator, deps.firmRepo, deps.rulesRepo, deps.templates, deps.approval, deps.navSync, deps.contentBuilder),
	},
	{
		name: "firm_extract",
		label: "Firm Extract",
		description:
			"Extract knowledge from external documentation (URLs, files) into the .firm/ knowledge base. Converts external references into structured Firm content.",
		promptSnippet: "Extract knowledge from external docs/URLs into .firm/",
		promptGuidelines: [
			"Use firm_extract to import external documentation into the knowledge base.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			options: OptionsParam,
			approvalMode: ApprovalModeParam,
		}),
		factory: (deps) => new ExtractTool(deps.scanner, deps.validator, deps.firmRepo, deps.rulesRepo, deps.templates, deps.approval, deps.navSync, deps.contentBuilder),
	},
	{
		name: "firm_organize",
		label: "Firm Organize",
		description:
			"Reorganize the .firm/ knowledge base structure — move, rename, or categorize existing knowledge items.",
		promptSnippet: "Reorganize the .firm/ knowledge base structure",
		promptGuidelines: [
			"Use firm_organize to restructure existing knowledge, not to add new content.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			options: OptionsParam,
			approvalMode: ApprovalModeParam,
		}),
		factory: (deps) => new OrganizeTool(deps.scanner, deps.validator, deps.firmRepo, deps.rulesRepo, deps.templates, deps.approval, deps.navSync, deps.contentBuilder),
	},
	{
		name: "firm_compact",
		label: "Firm Compact",
		description:
			"Compact and deduplicate the .firm/ knowledge base. Merges related items, removes redundancies, and summarizes verbose content.",
		promptSnippet: "Compact and deduplicate the .firm/ knowledge base",
		promptGuidelines: [
			"Run firm_compact periodically to keep the knowledge base lean.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			options: OptionsParam,
			approvalMode: ApprovalModeParam,
		}),
		factory: (deps) => new CompactTool(deps.scanner, deps.validator, deps.firmRepo, deps.rulesRepo, deps.templates, deps.approval, deps.navSync, deps.contentBuilder),
	},
	{
		name: "firm_map",
		label: "Firm Map",
		description:
			"Show .firm/ knowledge base structure and health. Returns a tree view, health score, MVI violations, and missing navigations.",
		promptSnippet: "Show .firm/ structure and health score",
		promptGuidelines: [
			"Run firm_map to check knowledge base health before and after operations.",
			"firm_map is read-only and safe to run at any time.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
		}),
		factory: (deps) => new MapTool(deps.firmRepo),
	},
	{
		name: "firm_workflow",
		label: "Firm Workflow",
		description:
			"Execute or query governance workflows. Lists available workflows, checks status, and executes workflow steps.",
		promptSnippet: "Execute or query governance workflows in .firm/",
		promptGuidelines: [
			"Use firm_workflow to run structured governance processes.",
		],
		schema: Type.Object({
			projectRoot: ProjectRootParam,
			options: OptionsParam,
		}),
		factory: (deps) => new WorkflowTool(deps.workflowRepo),
	},
];

// ─── Extension Factory ─────────────────────────────────────────────────────

export default function theFirmExtension(pi: ExtensionAPI): void {
	// ── Dependency wiring ────────────────────────────────────────────────

	function createDeps(projectRoot: string): Dependencies {
		const firmRoot = join(projectRoot, ".firm");
		const firmRepo = new FirmRepository(firmRoot);
		const rulesRepo = new RulesRepository(firmRoot);
		const navSync = new NavigationSync(firmRepo);
		const contentBuilder = new ContentBuilder();

		const languageScanner = new LanguageScanner();
		const frameworkScanner = new FrameworkScanner();
		const structureScanner = new StructureScanner();
		const firmScanner = new FirmScanner();
		const scanner = new ProjectScanner(languageScanner, frameworkScanner, structureScanner, firmScanner);

		const validators = [
			new FrontmatterValidator(),
			new MVIValidator(),
			new TemplateValidator(),
			new LinkValidator(),
		];
		const validator = new CompositeValidator(validators);

		const templates = new FileTemplateProvider(firmRoot);
		const approval = new ApprovalGate();
		const workflowRepo = new WorkflowRepository(firmRepo);

		return { scanner, validator, firmRepo, rulesRepo, templates, approval, navSync, contentBuilder, workflowRepo };
	}

	// Cache deps per project root to avoid re-creating heavy objects
	const depsCache = new Map<string, Dependencies>();

	function getDeps(projectRoot: string): Dependencies {
		const cached = depsCache.get(projectRoot);
		if (cached) return cached;
		const deps = createDeps(projectRoot);
		depsCache.set(projectRoot, deps);
		return deps;
	}

	// ── Register Tools ───────────────────────────────────────────────────

	for (const def of TOOLS) {
		pi.registerTool({
			name: def.name,
			label: def.label,
			description: def.description,
			promptSnippet: def.promptSnippet,
			promptGuidelines: def.promptGuidelines,
			parameters: def.schema,
			async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
				const projectRoot = params.projectRoot as string;
				if (!projectRoot) {
					return {
						content: [{ type: "text", text: "Error: projectRoot is required" }],
						details: { error: true },
					};
				}

				try {
					const deps = getDeps(projectRoot);
					const tool = def.factory(deps);
					const approvalMode = (params.approvalMode as string) ?? "dry-run";

					// MapTool and WorkflowTool have different execute signatures
					const input = { projectRoot, options: params.options ?? {} };

					// Use the tool's execute — it returns a ToolResult
					const result = await tool.execute(input, approvalMode);

					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
						details: result,
					};
				} catch (error) {
					return {
						content: [{
							type: "text",
							text: `Error in ${def.name}: ${error instanceof Error ? error.message : String(error)}`,
						}],
						details: { error: true, message: error instanceof Error ? error.message : String(error) },
					};
				}
			},
		});
	}

	// ── Register Commands ────────────────────────────────────────────────

	pi.registerCommand("firm-init", {
		description: "Initialize .firm/ governance structure for the current project",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Use the firm_init tool to initialize .firm/", "info");
		},
	});

	pi.registerCommand("firm-harvest", {
		description: "Start a knowledge harvest from source code",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Use the firm_harvest tool to harvest knowledge from source code", "info");
		},
	});

	pi.registerCommand("firm-extract", {
		description: "Extract knowledge from external documentation",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Use the firm_extract tool to extract external docs into .firm/", "info");
		},
	});

	pi.registerCommand("firm-error", {
		description: "Capture an error with root cause analysis into .firm/",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Use the firm_capture tool with contentType 'error' to capture an error", "info");
		},
	});

	pi.registerCommand("firm-pattern", {
		description: "Capture a pattern with trade-offs into .firm/",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Use the firm_capture tool with contentType 'pattern' to capture a pattern", "info");
		},
	});

	pi.registerCommand("firm-map", {
		description: "Show .firm/ knowledge base health and structure",
		handler: async (_args, ctx) => {
			ctx.ui.notify("Use the firm_map tool to check .firm/ health", "info");
		},
	});

	// ── Events ───────────────────────────────────────────────────────────

	pi.on("session_start", async (_event, ctx) => {
		// Check if .firm/ exists in the project
		const { stat } = await import("node:fs/promises");
		const { join } = await import("node:path");
		const firmPath = join(ctx.cwd, ".firm");

		try {
			const s = await stat(firmPath);
			if (s.isDirectory()) {
				// .firm/ exists — pre-warm deps cache
				getDeps(ctx.cwd);
			}
		} catch {
			// No .firm/ directory — that's fine, user hasn't initialized yet
		}
	});

	pi.on("before_agent_start", async (event, _ctx) => {
		// The tools are already registered and available.
		// If we want to inject KB context into the system prompt, we can do it here.
		// For now, the tools handle their own context via projectRoot parameter.
		return { systemPrompt: event.systemPrompt };
	});
}
