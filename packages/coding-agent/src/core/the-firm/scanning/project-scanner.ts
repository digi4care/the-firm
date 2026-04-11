/**
 * ProjectScanner — Orchestrates all scanners and produces a ProjectProfile.
 *
 * Runs LanguageScanner, FrameworkScanner, StructureScanner, and FirmScanner
 * in parallel for maximum throughput, then scans .pi/rules/ for RuleState.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ProjectProfile, RuleState } from "../types/index.js";
import type { FirmScanner } from "./firm-scanner.js";
import type { FrameworkScanner } from "./framework-scanner.js";
import type { LanguageScanner } from "./language-scanner.js";
import type { StructureScanner } from "./structure-scanner.js";

export class ProjectScanner {
	constructor(
		private languageScanner: LanguageScanner,
		private frameworkScanner: FrameworkScanner,
		private structureScanner: StructureScanner,
		private firmScanner: FirmScanner
	) {}

	async scan(root: string): Promise<ProjectProfile> {
		const [languages, frameworks, structure, firm] = await Promise.all([
			this.languageScanner.scan(root),
			this.frameworkScanner.scan(root),
			this.structureScanner.scan(root),
			this.firmScanner.scan(root),
		]);

		const existingRules = await scanRules(root);

		return { root, languages, frameworks, structure, existingFirm: firm, existingRules };
	}
}

/** Scan .pi/rules/ directory for rule files. */
async function scanRules(root: string): Promise<RuleState> {
	const rulesDir = join(root, ".pi/rules");
	const exists = await isDirectory(rulesDir);

	if (!exists) {
		return { exists: false, files: [], alwaysApply: [], globBased: [] };
	}

	const files = await collectRuleFiles(rulesDir, rulesDir);
	const alwaysApply: string[] = [];
	const globBased: string[] = [];

	for (const file of files) {
		const fullPath = join(rulesDir, file);
		const content = await readFileSafe(fullPath);
		if (!content) {
			continue;
		}

		// Rules with "alwaysApply: true" in frontmatter
		if (/alwaysApply:\s*true/i.test(content)) {
			alwaysApply.push(file);
		} else {
			globBased.push(file);
		}
	}

	return { exists: true, files, alwaysApply, globBased };
}

async function collectRuleFiles(dir: string, baseDir: string): Promise<string[]> {
	const entries = await readDirSafe(dir);
	const results: string[] = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const s = await statSafe(fullPath);
		if (!s) {
			continue;
		}

		if (s.isDirectory()) {
			const nested = await collectRuleFiles(fullPath, baseDir);
			results.push(...nested);
		} else if (entry.endsWith(".md")) {
			results.push(relative(baseDir, fullPath));
		}
	}

	return results.sort();
}

async function readFileSafe(filePath: string): Promise<string | null> {
	try {
		return await readFile(filePath, "utf-8");
	} catch {
		return null;
	}
}

async function readDirSafe(dir: string): Promise<string[]> {
	try {
		return await readdir(dir);
	} catch {
		return [];
	}
}

async function statSafe(
	path: string
): Promise<{ isDirectory(): boolean; isFile(): boolean } | null> {
	try {
		return await stat(path);
	} catch {
		return null;
	}
}

async function isDirectory(path: string): Promise<boolean> {
	const s = await statSafe(path);
	return s?.isDirectory() ?? false;
}
