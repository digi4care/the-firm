import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { KBToolBase } from "../pipeline/tool-base.js";
import type { PipelineContext, Proposal, ToolInput } from "../types/index.js";
import type { ContentType } from "../types/content.js";
import { CONTENT_TYPE_TO_CATEGORY } from "../types/content.js";

// ── Input ──────────────────────────────────────────────────────────────────

export interface ExtractInput extends ToolInput {
	options: {
		source: string;
		contentType?: ContentType;
		title?: string;
	};
}

// ── Analysis shape ─────────────────────────────────────────────────────────

interface ExtractedContent {
	sourcePath: string;
	content: string;
	contentType: ContentType;
	title: string;
	summary: string;
	details: string;
}

// ── Content inference ──────────────────────────────────────────────────────

const ERROR_KEYWORDS = /\b(error|bug|fix|fail|crash|exception)\b/i;
const DECISION_KEYWORDS = /\b(we decided|decision|chose|agreed|ADR)\b/i;
const PATTERN_KEYWORDS = /\b(problem|solution|pattern|approach)\b/i;
const GUIDE_KEYWORDS = /\b(how to|guide|tutorial|setup|install|getting started)\b/i;

function inferContentType(text: string): ContentType {
	if (ERROR_KEYWORDS.test(text)) {
		return "error";
	}
	if (DECISION_KEYWORDS.test(text)) {
		return "decision";
	}
	if (PATTERN_KEYWORDS.test(text)) {
		return "pattern";
	}
	if (GUIDE_KEYWORDS.test(text)) {
		return "guide";
	}
	return "concept";
}

/** Truncate with ellipsis. */
function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) {
		return text;
	}
	return `${text.slice(0, maxLen - 1)}\u2026`;
}

/** Slugify text for use in file names. */
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
}

// ── Inline template for sync access ───────────────────────────────────────

const INLINE_TEMPLATES: Record<
	string,
	{ name: string; sections: Array<{ name: string; required: boolean; hint: string }> }
> = {
	error: {
		name: "Error",
		sections: [
			{ name: "Symptoms", required: true, hint: "Observable signs." },
			{ name: "Root Cause", required: true, hint: "Why this happens." },
			{ name: "Solution", required: true, hint: "How to fix it." },
		],
	},
	decision: {
		name: "Decision",
		sections: [
			{ name: "Context", required: true, hint: "What prompted this decision." },
			{ name: "Decision", required: true, hint: "What was decided." },
			{ name: "Rationale", required: true, hint: "Why." },
		],
	},
	pattern: {
		name: "Pattern",
		sections: [
			{ name: "Problem", required: true, hint: "What problem this solves." },
			{ name: "Solution", required: true, hint: "How it works." },
			{ name: "When to Use", required: true, hint: "When it applies." },
		],
	},
	guide: {
		name: "Guide",
		sections: [
			{ name: "Summary", required: true, hint: "Brief overview." },
			{ name: "Details", required: true, hint: "Step-by-step content." },
			{ name: "References", required: false, hint: "Related links." },
		],
	},
	concept: {
		name: "Concept",
		sections: [
			{ name: "Summary", required: true, hint: "Core idea." },
			{ name: "Details", required: false, hint: "Expanded explanation." },
			{ name: "References", required: false, hint: "Related links." },
		],
	},
	standard: {
		name: "Standard",
		sections: [
			{ name: "Summary", required: true, hint: "Brief overview." },
			{ name: "Details", required: true, hint: "Full content." },
		],
	},
	spec: {
		name: "Spec",
		sections: [
			{ name: "Summary", required: true, hint: "Brief overview." },
			{ name: "Details", required: true, hint: "Full specification." },
		],
	},
	rule: {
		name: "Rule",
		sections: [
			{ name: "Summary", required: true, hint: "Brief overview." },
			{ name: "Details", required: true, hint: "Full rule content." },
		],
	},
};

/** Basic HTML to plain text conversion. Strips tags, decodes common entities. */
function htmlToText(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<style[\s\S]*?<\/style>/gi, "")
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<\/(?:p|div|h[1-6]|li|tr|br)\b[^>]*>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

// ── ExtractTool ────────────────────────────────────────────────────────────

/**
 * ExtractTool — imports external knowledge (docs/URLs/files) into .firm/.
 *
 * Supports file paths and HTTP/HTTPS URLs.
 * Reads the source, infers or uses provided content type, splits content
 * into summary (first 50 lines) and details (rest), and generates a Proposal.
 */
export class ExtractTool extends KBToolBase<ExtractInput> {
	readonly name = "kb-extract";
	readonly description = "Import external knowledge (files/URLs) into .firm/";

	protected async scan(input: ExtractInput, context: PipelineContext): Promise<void> {
		const { source } = input.options;

		if (/^https?:\/\//.test(source)) {
			const response = await fetch(source, {
				signal: AbortSignal.timeout(30000),
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
			}
			const contentType = response.headers.get("content-type") ?? "";
			let content: string;
			if (contentType.includes("text/html")) {
				const html = await response.text();
				content = htmlToText(html);
			} else {
				content = await response.text();
			}
			context.rawAnalysis.push({ content, sourcePath: source });
		} else {
			const absPath = join(input.projectRoot, source);
			let content: string;
			try {
				content = await readFile(absPath, "utf-8");
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				throw new Error(`Cannot read source file: ${msg}`);
			}

			context.rawAnalysis.push({ content, absPath });
		}
	}

	// biome-ignore lint/suspicious/useAwait: async reserved for OMP runtime compatibility
	protected async analyze(input: ExtractInput, context: PipelineContext): Promise<void> {
		const { content } = context.rawAnalysis[0] as { content: string; absPath: string };
		const contentType = input.options.contentType ?? inferContentType(content);

		const lines = content.split("\n");
		const summaryLines = lines.slice(0, 50);
		const detailLines = lines.slice(50);

		const summary = summaryLines.join("\n").trim();
		const details = detailLines.join("\n").trim();

		const title = input.options.title ?? titleFromSummary(summary, input.options.source);

		context.rawAnalysis.push({
			sourcePath: input.options.source,
			content,
			contentType,
			title,
			summary,
			details,
		} satisfies ExtractedContent);
	}

	protected buildProposals(input: ExtractInput, context: PipelineContext): void {
		const extracted = context.rawAnalysis[1] as ExtractedContent | undefined;
		if (!extracted) {
			return;
		}

		const today = new Date().toISOString().slice(0, 10);
		const slug = slugify(extracted.title);
		const contentType = extracted.contentType;
		const category = CONTENT_TYPE_TO_CATEGORY[contentType];
		const template = INLINE_TEMPLATES[contentType] ?? INLINE_TEMPLATES.concept;

		// Determine target directory
		let targetDir: string;
		if (contentType === "error") {
			targetDir = "errors";
		} else if (contentType === "pattern") {
			targetDir = "concepts/patterns";
		} else if (contentType === "decision") {
			targetDir = "concepts/decisions";
		} else if (contentType === "guide") {
			targetDir = "guides/workflows";
		} else if (contentType === "spec") {
			targetDir = "specs";
		} else if (contentType === "standard" || contentType === "rule") {
			targetDir = "lookup/standards";
		} else {
			targetDir = "concepts";
		}

		const targetPath = `${targetDir}/${slug}-${today}.md`;

		const frontmatter: Record<string, unknown> = {
			status: "draft",
			description: truncate(extracted.title, 120),
			owner: "extract",
			created: today,
			updated: today,
			source: extracted.sourcePath,
			"review-cadence": "as-needed",
		};

		// Map extracted content into template sections
		const sections = new Map<string, string>();
		const requiredSections = template.sections.filter((s) => s.required);
		if (requiredSections.length >= 1) {
			sections.set(requiredSections[0].name, extracted.summary);
		}
		if (requiredSections.length >= 2 && extracted.details) {
			sections.set(requiredSections[1].name, extracted.details);
		} else if (extracted.details) {
			// Put details in the first optional section if available
			const optional = template.sections.find((s) => !s.required);
			if (optional) {
				sections.set(optional.name, extracted.details);
			}
		}

		const content = this.contentBuilder.build(
			{
				...template,
				contentType,
				frontmatterSchema: {},
				mviLimits: { maxLines: 200, maxDescription: 120 },
			},
			sections,
			frontmatter
		);

		const proposal: Proposal = {
			id: `extract-${slug}-${today}`,
			action: "create",
			targetPath,
			content,
			metadata: {
				contentType,
				category,
				template: contentType,
				validationPassed: false,
			},
		};

		context.proposals.push(proposal);
	}
}

// ── Helpers ────────────────────────────────────────────────────────────────

function titleFromSummary(summary: string, fallback: string): string {
	// First non-empty line, stripped of markdown headings
	const firstLine = summary
		.split("\n")
		.map((l) => l.trim())
		.find((l) => l.length > 0);
	if (!firstLine) {
		return slugify(fallback);
	}
	const cleaned = firstLine.replace(/^#+\s*/, "");
	if (cleaned.length <= 80) {
		return cleaned;
	}
	return cleaned.slice(0, 60);
}
