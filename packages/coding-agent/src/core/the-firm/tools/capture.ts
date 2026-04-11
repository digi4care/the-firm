import type { PipelineContext } from "../pipeline/pipeline-context.js";
import { KBToolBase } from "../pipeline/tool-base.js";
import type { Proposal, ToolInput, ToolResult } from "../types/index.js";

/**
 * Input type for CaptureTool.
 * Captures recurring errors and patterns into .firm/.
 */
export interface CaptureInput extends ToolInput {
	options: {
		description: string;
		type: "error" | "pattern";
		title?: string;
	};
}

/**
 * CaptureTool — captures recurring errors and patterns into the .firm/ knowledge base.
 *
 * Works in "template mode" (no AI integration yet): takes the user-provided
 * description and title, fills in the template sections based on type, and
 * stores the raw description as the main content.
 *
 * - For errors: targetPath = `.firm/errors/<title>-<date>.md`
 * - For patterns: targetPath = `.firm/concepts/patterns/<title>-<date>.md`
 */
export class CaptureTool extends KBToolBase<CaptureInput> {
	readonly name = "kb-capture";
	readonly description = "Capture recurring errors and patterns into .firm/";

	protected async scan(input: CaptureInput, context: PipelineContext): Promise<void> {
		const { type } = input.options;
		const dir = type === "error" ? "errors" : "concepts/patterns";
		const existing = await this.firmRepo.list(dir);
		context.rawAnalysis = existing;
	}

	protected async analyze(input: CaptureInput, _context: PipelineContext): Promise<void> {
		// Template mode: no AI analysis yet.
		// The description is the primary content; type determines the template.
		// All assembly happens in buildProposals.
	}

	protected buildProposals(input: CaptureInput, context: PipelineContext): void {
		const { type, description, title } = input.options;
		const today = new Date().toISOString().slice(0, 10);
		const safeTitle = slugify(title ?? extractTitle(description));
		const contentType = type === "error" ? ("error" as const) : ("pattern" as const);
		const category = type === "error" ? ("errors" as const) : ("concepts" as const);
		const targetPath =
			type === "error"
				? `errors/${safeTitle}-${today}.md`
				: `concepts/patterns/${safeTitle}-${today}.md`;

		const frontmatter: Record<string, unknown> = {
			status: "draft",
			description: truncate(description, 120),
			owner: "capture",
			created: today,
			updated: today,
			"review-cadence": "as-needed",
		};

		// Build sections: put description into the first required section.
		// For errors -> "Symptoms", for patterns -> "Problem".
		const sections = new Map<string, string>();
		if (type === "error") {
			sections.set("Symptoms", description);
		} else {
			sections.set("Problem", description);
		}

		// We need the template synchronously here, but buildProposals is sync.
		// We'll store section data on the context and resolve the template during execute.
		// Instead, generate content inline using the template we already know.
		const template = this.getTemplateForType(type);
		const content = this.contentBuilder.build(template, sections, frontmatter);

		const proposal: Proposal = {
			id: `capture-${safeTitle}-${today}`,
			action: "create",
			targetPath,
			content,
			metadata: {
				contentType,
				category,
				template: contentType,
				validationPassed: true,
			},
		};

		context.proposals.push(proposal);
	}

	/**
	 * Returns the builtin Template object for the given capture type.
	 * Uses BuiltinTemplates which is always available via the template provider.
	 */
	private getTemplateForType(type: "error" | "pattern") {
		// Synchronous access: the template is always available for builtin types.
		// We resolve it here because buildProposals is synchronous.
		// Fall back to a minimal inline template if the provider doesn't return one.
		const contentType = type === "error" ? "error" : "pattern";
		// We can't await in a sync method, so we use a cached trick:
		// The base class validateProposals resolves templates async later.
		// Here we need a synchronous template, so we use the known structure.
		return INLINE_TEMPLATES[type];
	}
}

// ── Inline templates for sync access in buildProposals ────────────────────

const INLINE_TEMPLATES = {
	error: {
		name: "Error",
		contentType: "error" as const,
		sections: [
			{ name: "Symptoms", required: true, hint: "Observable signs that this error is occurring." },
			{ name: "Root Cause", required: true, hint: "Why this happens. The underlying mechanism." },
			{
				name: "Detection",
				required: false,
				hint: "How to recognize this error: triggers, log patterns, behavior.",
			},
			{ name: "Solution", required: true, hint: "How to fix it. Step-by-step if needed." },
			{ name: "Prevention", required: false, hint: "How to prevent it from recurring." },
			{
				name: "References",
				required: false,
				hint: "Links to related errors, patterns, or decisions.",
			},
		],
		frontmatterSchema: {},
		mviLimits: { maxLines: 200, maxDescription: 120 },
	},
	pattern: {
		name: "Pattern",
		contentType: "pattern" as const,
		sections: [
			{
				name: "Problem",
				required: true,
				hint: "What problem does this pattern solve? Describe the concrete scenario.",
			},
			{
				name: "Solution",
				required: true,
				hint: "How the pattern works. Steps, structure, or approach.",
			},
			{
				name: "When to Use",
				required: true,
				hint: "Specific situations where this pattern applies.",
			},
			{
				name: "When NOT to Use",
				required: false,
				hint: "Situations where this pattern would be wrong.",
			},
			{ name: "Trade-offs", required: false, hint: "Benefits vs costs in table form." },
			{
				name: "Example",
				required: false,
				hint: "Concrete code, config, or command example demonstrating the pattern.",
			},
			{
				name: "References",
				required: false,
				hint: "Links to related patterns, decisions, or concepts.",
			},
		],
		frontmatterSchema: {},
		mviLimits: { maxLines: 200, maxDescription: 120 },
	},
};

// ── Helpers ───────────────────────────────────────────────────────────────

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
}

function extractTitle(description: string): string {
	// Take first meaningful line or first N words.
	const firstLine = description.split("\n")[0]?.trim() ?? "";
	if (firstLine.length > 0 && firstLine.length <= 80) {
		return firstLine;
	}
	return description.split(/\s+/).slice(0, 6).join(" ");
}

function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) {
		return text;
	}
	return `${text.slice(0, maxLen - 1)}…`;
}
