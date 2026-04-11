import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { KBToolBase } from "../pipeline/tool-base.js";
import type { PipelineContext, Proposal, ToolInput } from "../types/index.js";
import type { ContentType } from "../types/content.js";
import { CONTENT_TYPE_TO_CATEGORY } from "../types/content.js";

// ── Input ──────────────────────────────────────────────────────────────────

export interface HarvestInput extends ToolInput {
	options: {
		sourcePaths?: string[];
	};
}

// ── Analysis shape stored on context.rawAnalysis ───────────────────────────

interface HarvestedItem {
	sourcePath: string;
	content: string;
	contentType: ContentType;
	title: string;
}

// ── Keyword heuristics ────────────────────────────────────────────────────

const ERROR_KEYWORDS = /\b(error|bug|fix|fail|crash|broken|exception|stack.?trace|issue)\b/i;
const DECISION_KEYWORDS = /\b(we decided|decision|chose|agreed|opted|going with|settled on)\b/i;
const PATTERN_KEYWORDS = /\b(problem|solution|pattern|approach|workaround|best practice)\b/i;

/** Determine content type from text using keyword heuristics. */
function inferContentType(text: string): ContentType {
	if (ERROR_KEYWORDS.test(text)) { return "error"; }
	if (DECISION_KEYWORDS.test(text)) { return "decision"; }
	if (PATTERN_KEYWORDS.test(text)) { return "pattern"; }
	return "concept";
}

/** Derive a slug from a file name (without extension). */
function slugifyFromPath(filePath: string): string {
	const base = filePath.split("/").pop() ?? filePath;
	const noExt = base.replace(/\.[^.]+$/, "");
	return noExt
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
}

/** Extract a short title from content (first non-empty line, trimmed). */
function titleFromContent(content: string, fallback: string): string {
	const firstLine = content.split("\n").map((l) => l.trim()).find((l) => l.length > 0);
	if (!firstLine) { return fallback; }
	// Strip leading markdown heading markers
	const cleaned = firstLine.replace(/^#+\s*/, "");
	if (cleaned.length <= 80) { return cleaned; }
	return cleaned.slice(0, 60);
}

/** Truncate text to maxLen, appending ellipsis if needed. */
function truncate(text: string, maxLen: number): string {
	if (text.length <= maxLen) { return text; }
	return `${text.slice(0, maxLen - 1)}\u2026`;
}

// ── Inline templates for sync access in buildProposals ─────────────────────

const INLINE_TEMPLATES: Record<string, { name: string; sections: Array<{ name: string; required: boolean; hint: string }> }> = {
	error: {
		name: "Error",
		sections: [
			{ name: "Symptoms", required: true, hint: "Observable signs." },
			{ name: "Root Cause", required: true, hint: "Why this happens." },
			{ name: "Solution", required: true, hint: "How to fix it." },
			{ name: "Prevention", required: false, hint: "How to prevent recurrence." },
		],
	},
	decision: {
		name: "Decision",
		sections: [
			{ name: "Context", required: true, hint: "What situation prompted this decision." },
			{ name: "Decision", required: true, hint: "What was decided." },
			{ name: "Rationale", required: true, hint: "Why this option was chosen." },
			{ name: "Consequences", required: false, hint: "Expected impact." },
		],
	},
	pattern: {
		name: "Pattern",
		sections: [
			{ name: "Problem", required: true, hint: "What problem this solves." },
			{ name: "Solution", required: true, hint: "How the pattern works." },
			{ name: "When to Use", required: true, hint: "When this pattern applies." },
			{ name: "Trade-offs", required: false, hint: "Benefits vs costs." },
		],
	},
	concept: {
		name: "Concept",
		sections: [
			{ name: "Summary", required: true, hint: "Core idea in a few sentences." },
			{ name: "Details", required: false, hint: "Expanded explanation." },
			{ name: "References", required: false, hint: "Related links." },
		],
	},
};

// ── Default scan globs ────────────────────────────────────────────────────

/** File names / extensions to look for when no sourcePaths are given. */
const DEFAULT_SCAN_PATTERNS = [
	".pi/agent/sessions",
	"NOTES.md",
	"KNOWLEDGE.md",
	"DECISIONS.md",
	"PATTERNS.md",
	"docs/",
];

// ── HarvestTool ────────────────────────────────────────────────────────────

/**
 * HarvestTool — extracts knowledge from code/text files into .firm/ artifacts.
 *
 * In template mode (no AI), it reads candidate files, classifies them by
 * keyword heuristics (error / decision / pattern / concept), and produces
 * one Proposal per harvested item.
 */
export class HarvestTool extends KBToolBase<HarvestInput> {
	readonly name = "kb-harvest";
	readonly description = "Extract knowledge from code files into .firm/ artifacts";

	protected async scan(input: HarvestInput, context: PipelineContext): Promise<void> {
		const candidates: string[] = [];

		if (input.options.sourcePaths && input.options.sourcePaths.length > 0) {
			// User-specified paths — resolve relative to projectRoot
			for (const p of input.options.sourcePaths) {
				const abs = join(input.projectRoot, p);
				if (await isFile(abs)) {
					candidates.push(abs);
				} else if (await isDir(abs)) {
					const files = await collectFiles(abs);
					candidates.push(...files);
				}
			}
		} else {
			// Default: scan common knowledge locations
			for (const pattern of DEFAULT_SCAN_PATTERNS) {
				const abs = join(input.projectRoot, pattern);
				if (await isFile(abs)) {
					candidates.push(abs);
				} else if (await isDir(abs)) {
					const files = await collectFiles(abs);
					candidates.push(...files);
				}
			}
		}

		context.rawAnalysis.push({ candidates });
	}

	protected async analyze(input: HarvestInput, context: PipelineContext): Promise<void> {
		const { candidates } = context.rawAnalysis[0] as { candidates: string[] };
		const items: HarvestedItem[] = [];

		for (const absPath of candidates) {
			let content: string;
			try {
				content = await readFile(absPath, "utf-8");
			} catch {
				// Skip unreadable files
				continue;
			}

			if (content.trim().length === 0) { continue; }

			const contentType = inferContentType(content);
			const relPath = absPath.slice(input.projectRoot.length + 1);
			const title = titleFromContent(content, slugifyFromPath(relPath));

			items.push({ sourcePath: relPath, content, contentType, title });
		}

		context.rawAnalysis.push({ items });
	}

	protected buildProposals(input: HarvestInput, context: PipelineContext): void {
		const { items } = context.rawAnalysis[1] as { items: HarvestedItem[] };
		if (!items || items.length === 0) { return; }

		const today = new Date().toISOString().slice(0, 10);
		let id = 1;

		for (const item of items) {
			const slug = slugifyFromPath(item.title);
			const category = CONTENT_TYPE_TO_CATEGORY[item.contentType];
			const contentType = item.contentType;

			// Determine target directory from content type
			let targetDir: string;
			if (contentType === "error") {
				targetDir = "errors";
			} else if (contentType === "pattern") {
				targetDir = "concepts/patterns";
			} else if (contentType === "decision") {
				targetDir = "concepts/decisions";
			} else {
				targetDir = "concepts";
			}

			const targetPath = `${targetDir}/${slug}-${today}.md`;
			const template = INLINE_TEMPLATES[contentType] ?? INLINE_TEMPLATES.concept;

			// Build frontmatter
			const frontmatter: Record<string, unknown> = {
				status: "draft",
				description: truncate(item.title, 120),
				owner: "harvest",
				created: today,
				updated: today,
				source: item.sourcePath,
				"review-cadence": "as-needed",
			};

			// Map content into the first required section
			const sections = new Map<string, string>();
			const primarySection = template.sections.find((s) => s.required);
			if (primarySection) {
				sections.set(primarySection.name, item.content);
			}

			const content = this.contentBuilder.build(
				{ ...template, contentType: contentType as ContentType, frontmatterSchema: {}, mviLimits: { maxLines: 200, maxDescription: 120 } },
				sections,
				frontmatter,
			);

			const proposal: Proposal = {
				id: `harvest-${id++}`,
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
}

// ── Filesystem helpers ────────────────────────────────────────────────────

async function isFile(abs: string): Promise<boolean> {
	try {
		const s = await stat(abs);
		return s.isFile();
	} catch {
		return false;
	}
}

async function isDir(abs: string): Promise<boolean> {
	try {
		const s = await stat(abs);
		return s.isDirectory();
	} catch {
		return false;
	}
}

/** Recursively collect file paths (skipping hidden dirs, node_modules, .git). */
async function collectFiles(dir: string): Promise<string[]> {
	const skip = new Set([".git", "node_modules", ".firm.backup"]);
	const results: string[] = [];

	async function walk(d: string): Promise<void> {
		let entries: import("node:fs").Dirent[];
		try {
			entries = await readdir(d, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.name.startsWith(".") || skip.has(entry.name)) { continue; }
			const full = join(d, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.isFile()) {
				results.push(full);
			}
		}
	}

	await walk(dir);
	return results;
}
