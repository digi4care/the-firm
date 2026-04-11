/**
 * FirmScanner — Detects existing .firm/ knowledge base state.
 *
 * Checks whether .firm/ exists, lists its .md files, identifies
 * standards in lookup/standards/, and evaluates navigation health.
 */
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { FirmState } from "../types/index.js";

const FIRM_DIR = ".firm";
const STANDARDS_DIR = ".firm/lookup/standards";

export class FirmScanner {
	async scan(root: string): Promise<FirmState> {
		const firmPath = join(root, FIRM_DIR);
		const exists = await isDirectory(firmPath);

		if (!exists) {
			return { exists: false, files: [], standards: [], navigationHealth: "missing" };
		}

		const files = await collectMarkdownFiles(firmPath, firmPath);
		const standards = await collectMarkdownFiles(
			join(root, STANDARDS_DIR),
			join(root, STANDARDS_DIR)
		);
		const navigationHealth = await assessNavigationHealth(firmPath);

		return { exists: true, files, standards, navigationHealth };
	}
}

/** Recursively collect all .md files, returning paths relative to baseDir. */
async function collectMarkdownFiles(dir: string, baseDir: string): Promise<string[]> {
	const results: string[] = [];
	const entries = await readDirSafe(dir);

	for (const entry of entries) {
		const fullPath = join(dir, entry);
		const s = await statSafe(fullPath);
		if (!s) {
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

/**
 * Assess navigation health by checking subdirectories for navigation.md.
 * - "healthy": all content subdirectories have navigation.md
 * - "stale": some subdirectories lack navigation.md
 * - "missing": no navigation.md files at all
 */
async function assessNavigationHealth(firmPath: string): Promise<"healthy" | "stale" | "missing"> {
	const subdirs = await getSubdirectories(firmPath);

	if (subdirs.length === 0) {
		// Root-only .firm/ — check if root has navigation.md
		const hasRootNav = await fileExists(join(firmPath, "navigation.md"));
		return hasRootNav ? "healthy" : "missing";
	}

	let total = 0;
	let withNav = 0;

	// Check root level
	total++;
	if (await fileExists(join(firmPath, "navigation.md"))) {
		withNav++;
	}

	// Check each subdirectory
	for (const subdir of subdirs) {
		const subPath = join(firmPath, subdir);
		const nested = await getSubdirectories(subPath);

		if (nested.length > 0) {
			for (const nestedDir of nested) {
				total++;
				if (await fileExists(join(subPath, nestedDir, "navigation.md"))) {
					withNav++;
				}
			}
		}

		total++;
		if (await fileExists(join(subPath, "navigation.md"))) {
			withNav++;
		}
	}

	if (withNav === 0) {
		return "missing";
	}
	if (withNav === total) {
		return "healthy";
	}
	return "stale";
}

async function getSubdirectories(dir: string): Promise<string[]> {
	const entries = await readDirSafe(dir);
	const result: string[] = [];
	for (const entry of entries) {
		const fullPath = join(dir, entry);
		if (await isDirectory(fullPath)) {
			result.push(entry);
		}
	}
	return result;
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

async function fileExists(path: string): Promise<boolean> {
	const s = await statSafe(path);
	return s?.isFile() ?? false;
}
