import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ToolInput } from "../types/index.js";
import type { FirmRepository } from "../writing/firm-repository.js";

const MVI_MAX_LINES = 200;

export interface TreeNode {
	name: string;
	type: "directory" | "file";
	children?: TreeNode[];
	lines?: number;
}

export interface MviViolation {
	file: string;
	lines: number;
	maxLines: number;
}

export interface MapStats {
	totalFiles: number;
	totalDirectories: number;
	filesByType: Record<string, number>;
	mviViolations: MviViolation[];
	missingNavigations: string[];
	emptyDirectories: string[];
}

export interface MapResult {
	tree: TreeNode;
	stats: MapStats;
	healthScore: number;
}

/**
 * kb-map — shows .firm/ structure and health.
 *
 * Read-only tool that scans the knowledge base tree, collects per-directory
 * statistics, checks MVI compliance and navigation.md presence, then
 * computes an aggregate health score.
 */
export class MapTool {
	readonly name = "kb-map";
	readonly description = "Show .firm/ structure and health";

	private readonly root: string;

	constructor(firmRepo: FirmRepository) {
		this.root = firmRepo.getRoot();
	}

	async execute(_input: ToolInput): Promise<MapResult> {
		const stats: MapStats = {
			totalFiles: 0,
			totalDirectories: 0,
			filesByType: {},
			mviViolations: [],
			missingNavigations: [],
			emptyDirectories: [],
		};

		let tree: TreeNode;
		try {
			tree = await this.buildTree(this.root, this.root, stats);
		} catch (err: unknown) {
			if (isEnoent(err)) {
				tree = { name: ".firm", type: "directory", children: [] };
			} else {
				throw err;
			}
		}

		const healthScore = computeHealth(stats);
		return { tree, stats, healthScore };
	}

	/**
	 * Recursively build a tree rooted at `dir`, accumulating stats.
	 * `baseRoot` is the .firm/ root used for computing relative paths.
	 */
	private async buildTree(
		dir: string,
		baseRoot: string,
		stats: MapStats,
	): Promise<TreeNode> {
		const entries = await readdir(dir, { withFileTypes: true });

		// Filter out hidden files/dirs and the backup directory
		const visible = entries.filter(
			(e) => !e.name.startsWith(".") && e.name !== ".firm.backup",
		);

		const name = dir === baseRoot ? ".firm" : dir.split("/").pop() ?? "unknown";
		const children: TreeNode[] = [];
		const node: TreeNode = { name, type: "directory", children };

		const subdirs: string[] = [];
		const childFiles: TreeNode[] = [];

		for (const entry of visible) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				subdirs.push(fullPath);
				stats.totalDirectories++;
			} else if (entry.isFile()) {
				stats.totalFiles++;

				const ext = getExtension(entry.name);
				stats.filesByType[ext] = (stats.filesByType[ext] ?? 0) + 1;

				let lines: number | undefined;
				if (ext === "md") {
					lines = await countLines(fullPath);
					if (lines > MVI_MAX_LINES) {
						const relativePath = fullPath.slice(baseRoot.length + 1);
						stats.mviViolations.push({
							file: relativePath,
							lines,
							maxLines: MVI_MAX_LINES,
						});
					}
				}

				childFiles.push({ name: entry.name, type: "file", lines });
			}
		}

		// Check navigation.md presence for directories with .md files or subdirs
		const hasMdFiles = childFiles.some((f) => f.name.endsWith(".md"));
		const hasSubdirs = subdirs.length > 0;
		if (hasMdFiles || hasSubdirs) {
			const hasNav = childFiles.some((f) => f.name === "navigation.md");
			if (!hasNav) {
				const relativeDir = dir === baseRoot ? "." : dir.slice(baseRoot.length + 1);
				stats.missingNavigations.push(relativeDir);
			}
		}

		// Detect empty directories (no files, no subdirs after filtering)
		if (childFiles.length === 0 && subdirs.length === 0 && dir !== baseRoot) {
			const relativeDir = dir.slice(baseRoot.length + 1);
			stats.emptyDirectories.push(relativeDir);
		}

		// Recurse into subdirectories first, then append file nodes
		for (const subdir of subdirs) {
			const child = await this.buildTree(subdir, baseRoot, stats);
			children.push(child);
		}
		children.push(...childFiles);

		return node;
	}
}

// --- Pure helpers ---

function computeHealth(stats: MapStats): number {
	let score = 100;
	score -= stats.missingNavigations.length * 5;
	score -= stats.mviViolations.length * 3;
	score -= stats.emptyDirectories.length * 2;
	return Math.max(0, Math.min(100, score));
}

async function countLines(filePath: string): Promise<number> {
	const content = await readFile(filePath, "utf-8");
	return content.split("\n").length;
}

function getExtension(filename: string): string {
	const dot = filename.lastIndexOf(".");
	if (dot === -1) {
		return "";
	}
	return filename.slice(dot + 1);
}

function isEnoent(err: unknown): boolean {
	return (
		err instanceof Error &&
		"code" in err &&
		(err as NodeJS.ErrnoException).code === "ENOENT"
	);
}
