/**
 * OrganizeTool — restructures .firm/ content for better organization.
 *
 * Detects organizational issues in template mode:
 * 1. Misplaced files (e.g., ADR files not in decisions/)
 * 2. Empty directories (only navigation.md, no subdirectories)
 * 3. Files that could be grouped into feature subdirectories (3+ shared prefix)
 *
 * Creates move/delete proposals. Overrides write() to handle file moves
 * via FirmRepository.move() and directory removal via rmdir.
 */
import { readdir, rmdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { PipelineContext } from "../pipeline/pipeline-context.js";
import { KBToolBase } from "../pipeline/tool-base.js";
import type { ToolInput, WriteOperation } from "../types/index.js";

// ── Scan data structures ──────────────────────────────────────────────────

interface FirmFile {
	/** Path relative to .firm/ root, e.g. "concepts/adr-001.md". */
	relativePath: string;
	/** Filename only, e.g. "adr-001.md". */
	fileName: string;
	/** Parent directory relative to .firm/, e.g. "concepts". Empty for root. */
	directory: string;
}

interface FirmDir {
	/** Path relative to .firm/ root, e.g. "concepts/decisions". */
	relativePath: string;
	/** Files in this directory (non-recursive). */
	files: string[];
	/** Subdirectory names present in this directory. */
	subDirs: string[];
}

interface ScanResult {
	files: FirmFile[];
	dirs: FirmDir[];
}

// ── Analysis issues ───────────────────────────────────────────────────────

type OrganizeIssue =
	| { type: "misplaced"; sourcePath: string; targetPath: string; reason: string }
	| { type: "empty-dir"; directoryPath: string; reason: string }
	| {
			type: "groupable";
			prefix: string;
			files: string[];
			suggestedDir: string;
			sourceDir: string;
			reason: string;
	  };

// ── Directories to skip during scanning ───────────────────────────────────

const SKIP_DIRS = new Set([".firm.backup", ".git", "node_modules"]);

// ── OrganizeTool ──────────────────────────────────────────────────────────

export class OrganizeTool extends KBToolBase {
	readonly name = "kb-organize";
	readonly description = "Restructure .firm/ content for better organization";

	protected async scan(input: ToolInput, context: PipelineContext): Promise<void> {
		const firmRoot = join(input.projectRoot, ".firm");
		const result = await scanFirmTree(firmRoot);
		context.rawAnalysis = [result];
	}

	protected async analyze(_input: ToolInput, context: PipelineContext): Promise<void> {
		const scan = context.rawAnalysis[0] as ScanResult | undefined;
		if (!scan) {
			return;
		}

		const issues: OrganizeIssue[] = [];

		// 1. Misplaced ADR files: filename starts with "adr-" but not under decisions/
		for (const file of scan.files) {
			if (file.fileName.startsWith("adr-") && !file.relativePath.includes("/decisions/")) {
				issues.push({
					type: "misplaced",
					sourcePath: file.relativePath,
					targetPath: `concepts/decisions/${file.fileName}`,
					reason: `ADR file "${file.fileName}" should be in concepts/decisions/`,
				});
			}
		}

		// Track files already flagged for move so they aren't also proposed for grouping
		const misplacedPaths = new Set(
			issues.filter((i) => i.type === "misplaced").map((i) => i.sourcePath)
		);

		// 2. Empty directories: only navigation.md, no subdirectories
		for (const dir of scan.dirs) {
			const nonNavFiles = dir.files.filter((f) => f !== "navigation.md");
			if (
				dir.files.includes("navigation.md") &&
				nonNavFiles.length === 0 &&
				dir.subDirs.filter((d) => !SKIP_DIRS.has(d)).length === 0
			) {
				issues.push({
					type: "empty-dir",
					directoryPath: dir.relativePath,
					reason: `Directory "${dir.relativePath}" contains only navigation.md`,
				});
			}
		}

		// 3. Groupable files: 3+ files sharing a common prefix in the same directory.
		//    Prefix is everything before the last dash-separated segment,
		//    so "the-firm-adr-001.md" → "the-firm-adr", "adr-001.md" → "adr".
		const filesByDir = new Map<string, FirmFile[]>();
		for (const file of scan.files) {
			if (file.fileName === "navigation.md") {
				continue;
			}
			if (misplacedPaths.has(file.relativePath)) {
				continue;
			}
			const list = filesByDir.get(file.directory) ?? [];
			list.push(file);
			filesByDir.set(file.directory, list);
		}

		for (const [dir, files] of filesByDir) {
			const prefixGroups = new Map<string, string[]>();

			for (const file of files) {
				const stem = file.fileName.replace(/\.md$/, "");
				const parts = stem.split("-");
				if (parts.length < 2) {
					continue; // need at least prefix + suffix
				}
				const prefix = parts.slice(0, -1).join("-");
				const group = prefixGroups.get(prefix) ?? [];
				group.push(file.relativePath);
				prefixGroups.set(prefix, group);
			}

			for (const [prefix, paths] of prefixGroups) {
				if (paths.length >= 3) {
					const suggestedDir = `${dir}/${prefix}`;
					issues.push({
						type: "groupable",
						prefix,
						files: paths,
						suggestedDir,
						sourceDir: dir,
						reason: `${paths.length} files in "${dir}/" share prefix "${prefix}-"`,
					});
				}
			}
		}

		context.rawAnalysis.push(issues);
	}

	protected buildProposals(_input: ToolInput, context: PipelineContext): void {
		const issues = (context.rawAnalysis[1] as OrganizeIssue[]) ?? [];

		for (const issue of issues) {
			switch (issue.type) {
				case "misplaced":
					context.proposals.push({
						id: `organize-move-${issue.sourcePath}`,
						action: "move",
						targetPath: issue.targetPath,
						content: "",
						diff: issue.sourcePath,
						metadata: {
							contentType: "concept",
							category: "concepts",
							template: "concept",
							validationPassed: true,
						},
					});
					break;

				case "empty-dir":
					context.proposals.push({
						id: `organize-delete-${issue.directoryPath}`,
						action: "delete",
						targetPath: issue.directoryPath,
						content: "",
						metadata: {
							contentType: "guide",
							category: "guides",
							template: "guide",
							validationPassed: true,
						},
					});
					break;

				case "groupable":
					for (const filePath of issue.files) {
						const segments = filePath.split("/");
						const fileName = segments[segments.length - 1] ?? filePath;
						context.proposals.push({
							id: `organize-group-${filePath}`,
							action: "move",
							targetPath: `${issue.suggestedDir}/${fileName}`,
							content: "",
							diff: filePath,
							metadata: {
								contentType: "concept",
								category: "concepts",
								template: "concept",
								validationPassed: true,
							},
						});
					}
					break;
			}
		}
	}

	/**
	 * Override write to handle move proposals (base class only handles create/update/delete).
	 * Move: firmRepo.move() relocates the file.
	 * Delete (directory): removes navigation.md then rmdir's the directory.
	 */
	protected async write(context: PipelineContext): Promise<void> {
		const written: WriteOperation[] = [];
		const errors: string[] = [];

		for (const proposal of context.approvedProposals) {
			try {
				if (proposal.action === "move") {
					const sourcePath = proposal.diff;
					if (!sourcePath) {
						errors.push(`Move proposal missing source path: ${proposal.id}`);
						continue;
					}
					await this.firmRepo.move(sourcePath, proposal.targetPath);
					written.push({
						action: "move",
						targetPath: proposal.targetPath,
						previousPath: sourcePath,
					});
				} else if (proposal.action === "delete" && !proposal.targetPath.endsWith(".md")) {
					// Directory delete: remove navigation.md inside, then remove the directory
					const navPath = `${proposal.targetPath}/navigation.md`;
					try {
						await this.firmRepo.delete(navPath);
					} catch {
						// navigation.md might not exist; proceed with rmdir anyway
					}
					const absDir = resolve(this.firmRepo.getRoot(), proposal.targetPath);
					await rmdir(absDir);
					written.push({
						action: "delete",
						targetPath: proposal.targetPath,
					});
				} else {
					const op = await this.firmRepo.writeWithBackup(proposal.targetPath, proposal.content);
					written.push(op);
				}
			} catch (err) {
				errors.push(`${proposal.id}: ${err instanceof Error ? err.message : String(err)}`);
			}
		}

		context.writeResult = { written, navigationsUpdated: [], errors };
	}
}

// ── Directory scanning helpers ────────────────────────────────────────────

async function scanFirmTree(firmRoot: string): Promise<ScanResult> {
	const files: FirmFile[] = [];
	const dirs: FirmDir[] = [];
	await walkDir(firmRoot, firmRoot, files, dirs);
	return { files, dirs };
}

async function walkDir(
	current: string,
	root: string,
	files: FirmFile[],
	dirs: FirmDir[]
): Promise<void> {
	let entries: string[];
	try {
		entries = await readdir(current);
	} catch {
		return;
	}

	const relDir = current === root ? "" : current.slice(root.length + 1);
	const fileNames: string[] = [];
	const subDirNames: string[] = [];

	for (const entry of entries) {
		if (SKIP_DIRS.has(entry)) {
			continue;
		}

		const fullPath = join(current, entry);
		let s: Awaited<ReturnType<typeof stat>>;
		try {
			s = await stat(fullPath);
		} catch {
			continue;
		}

		if (s.isDirectory()) {
			subDirNames.push(entry);
			await walkDir(fullPath, root, files, dirs);
		} else if (entry.endsWith(".md")) {
			fileNames.push(entry);
			files.push({
				relativePath: relDir ? `${relDir}/${entry}` : entry,
				fileName: entry,
				directory: relDir,
			});
		}
	}

	// Record non-root directories
	if (relDir) {
		dirs.push({
			relativePath: relDir,
			files: fileNames,
			subDirs: subDirNames.filter((d) => !SKIP_DIRS.has(d)),
		});
	}
}
