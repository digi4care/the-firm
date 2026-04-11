import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { PipelineContext } from "../pipeline/pipeline-context.js";
import { KBToolBase } from "../pipeline/tool-base.js";
import type { ContentType } from "../types/content.js";
import type { ToolInput } from "../types/index.js";

/**
 * MVI line limits by file role.
 * Content files (.firm/): 200 lines max.
 * Navigation files: 50 lines max.
 */
const MVI_LIMITS = {
	content: 200,
	navigation: 50,
} as const;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/** A file that exceeds its MVI line limit. */
interface ViolatingFile {
	relativePath: string;
	lines: number;
	limit: number;
}

/** A compacted file ready to become a proposal. */
interface CompactedFile {
	relativePath: string;
	originalLines: number;
	compactedContent: string;
}

/**
 * CompactTool — keeps .firm/ files within MVI line limits.
 *
 * Truncates files that exceed limits, preserving frontmatter and leading
 * sections. A truncation notice and summary of removed content are appended.
 */
export class CompactTool extends KBToolBase {
	readonly name = "kb-compact";
	readonly description = "Compact .firm/ files that exceed MVI line limits";

	protected async scan(input: ToolInput, context: PipelineContext): Promise<void> {
		const firmRoot = join(input.projectRoot, ".firm");
		const files = await collectMarkdownFiles(firmRoot, firmRoot);

		const violations: ViolatingFile[] = [];

		for (const relPath of files) {
			const absPath = join(firmRoot, relPath);
			const content = await readFile(absPath, "utf-8");

			const lines = content.split("\n").length;
			const limit = isNavigationFile(relPath) ? MVI_LIMITS.navigation : MVI_LIMITS.content;

			if (lines > limit) {
				violations.push({ relativePath: relPath, lines, limit });
			}
		}

		context.rawAnalysis = violations;
	}

	protected async analyze(input: ToolInput, context: PipelineContext): Promise<void> {
		const violations = context.rawAnalysis as ViolatingFile[];
		if (violations.length === 0) {
			return;
		}

		const firmRoot = join(input.projectRoot, ".firm");
		const compacted: CompactedFile[] = [];

		for (const { relativePath, lines, limit } of violations) {
			const absPath = join(firmRoot, relativePath);
			const content = await readFile(absPath, "utf-8");
			const compactedContent = compactFile(content, limit);

			compacted.push({ relativePath, originalLines: lines, compactedContent });
		}

		context.rawAnalysis = compacted;
	}

	protected buildProposals(_input: ToolInput, context: PipelineContext): void {
		const compacted = context.rawAnalysis as CompactedFile[];

		for (const { relativePath, originalLines, compactedContent } of compacted) {
			const contentType = inferContentType(relativePath);

			context.proposals.push({
				id: `compact-${relativePath}`,
				action: "compact",
				targetPath: relativePath,
				content: compactedContent,
				metadata: {
					contentType,
					category: "archive",
					template: contentType,
					validationPassed: true,
					validationErrors: [],
				},
				diff: `-${originalLines} lines -> ${compactedContent.split("\n").length} lines`,
			});
		}
	}
}

// ── Compaction logic ──────────────────────────────────────────────────────

/**
 * Compact a markdown file to fit within `maxLines`.
 *
 * Strategy:
 * 1. Extract and preserve YAML frontmatter.
 * 2. Split body into sections (delimited by `##` headings).
 * 3. Keep frontmatter + as many leading sections as fit.
 * 4. If truncation occurs, append a summary of removed sections.
 */
export function compactFile(content: string, maxLines: number): string {
	const parsed = parseFile(content);
	const totalLines = content.split("\n").length;
	const frontmatterLines = parsed.frontmatter ? parsed.frontmatter.split("\n").length : 0;

	// If frontmatter alone exceeds the limit, return frontmatter + notice
	if (frontmatterLines >= maxLines) {
		return `${parsed.frontmatter}\n<!-- Content truncated. Original: ${totalLines} lines -->\n`;
	}

	// Reserve 4 lines for truncation notice + summary header
	const RESERVE = 4;
	const availableLines = maxLines - frontmatterLines - RESERVE;
	const keptSections: string[] = [];
	let keptLineCount = 0;
	const removedSectionHeadings: string[] = [];

	for (const section of parsed.sections) {
		const sectionLines = section.split("\n").length;

		if (keptLineCount + sectionLines <= availableLines) {
			keptSections.push(section);
			keptLineCount += sectionLines;
		} else {
			removedSectionHeadings.push(extractHeading(section));
		}
	}

	// No sections removed — file fits within limit
	if (removedSectionHeadings.length === 0) {
		return content;
	}

	let result = parsed.frontmatter;
	for (const section of keptSections) {
		result += section;
	}

	result += `\n<!-- Content truncated. Original: ${totalLines} lines -->\n`;

	if (removedSectionHeadings.length > 0) {
		result += "\n## Summary of Truncated Content\n";
		for (const heading of removedSectionHeadings) {
			result += `- ${heading}\n`;
		}
	}

	return result;
}

/**
 * Parse a markdown file into frontmatter and body sections.
 */
function parseFile(content: string): { frontmatter: string; body: string; sections: string[] } {
	const match = content.match(FRONTMATTER_RE);
	const frontmatter = match ? match[0] : "";
	const body = match ? content.slice(match[0].length) : content;

	// Split body into sections at ## headings
	const sections: string[] = [];
	const parts = body.split(/(?=^## )/m);

	for (const part of parts) {
		const trimmed = part.trim();
		if (trimmed.length > 0) {
			sections.push(`${trimmed}\n`);
		}
	}

	return { frontmatter: frontmatter ? `${frontmatter}\n` : "", body, sections };
}

/**
 * Extract the heading text from a section (e.g. `## Context\n...` -> `Context`).
 */
function extractHeading(section: string): string {
	const headingMatch = section.match(/^## (.+)/);
	return headingMatch ? headingMatch[1].trim() : "Untitled section";
}

/**
 * Determine if a file is a navigation file based on its name.
 */
function isNavigationFile(path: string): boolean {
	return path.endsWith("navigation.md");
}

/**
 * Infer a ContentType from a file path by inspecting the directory structure.
 */
function inferContentType(path: string): ContentType {
	const segments = path.split("/");
	const dir = segments.length > 1 ? segments[0] : "";

	const dirToType: Record<string, ContentType> = {
		concepts: "concept",
		guides: "guide",
		errors: "error",
		lookup: "standard",
		specs: "spec",
		archive: "decision",
		templates: "guide",
	};

	return dirToType[dir] ?? "concept";
}

// ── Filesystem helpers ────────────────────────────────────────────────────

async function collectMarkdownFiles(dir: string, baseDir: string): Promise<string[]> {
	const results: string[] = [];
	let entries: string[];

	try {
		entries = await readdir(dir);
	} catch {
		return [];
	}

	for (const entry of entries) {
		const fullPath = join(dir, entry);

		let s: Awaited<ReturnType<typeof stat>>;
		try {
			s = await stat(fullPath);
		} catch {
			continue;
		}

		if (s.isDirectory()) {
			const nested = await collectMarkdownFiles(fullPath, baseDir);
			results.push(...nested);
		} else if (entry.endsWith(".md")) {
			results.push(relative(baseDir, fullPath));
		}
	}

	return results.sort();
}
