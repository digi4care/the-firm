/**
 * StructureScanner — Detects directory structure: top-level dirs, entry points, test patterns.
 *
 * Scans the project root for conventional directories and file patterns
 * that reveal how the project is organized.
 */
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { DirectoryStructure } from "../types/index.js";

const ENTRY_POINT_NAMES = [
	"index.ts",
	"index.js",
	"main.ts",
	"main.js",
	"app.ts",
	"app.js",
	"main.py",
	"app.py",
	"main.go",
	"lib.rs",
	"index.rs",
];

const KNOWN_DIRS = new Set([
	"src",
	"lib",
	"app",
	"test",
	"tests",
	"__tests__",
	"spec",
	"specs",
	"docs",
	"scripts",
	"config",
	"public",
	"static",
	"dist",
	"build",
	"bin",
	"cmd",
	"pkg",
	"internal",
	"migrations",
]);

const TEST_DIR_PATTERNS = ["test", "tests", "__tests__", "spec", "specs"];

export class StructureScanner {
	async scan(root: string): Promise<DirectoryStructure> {
		const entries = await readDirSafe(root);

		const directories: string[] = [];
		const testPatterns: string[] = [];

		for (const entry of entries) {
			const fullPath = join(root, entry);
			if (await isDirectory(fullPath)) {
				if (KNOWN_DIRS.has(entry)) {
					directories.push(entry);
				}
				if (TEST_DIR_PATTERNS.includes(entry)) {
					testPatterns.push(`${entry}/**`);
				}
			}
		}

		// Detect *.test.* patterns by scanning for test file extensions
		const testFilePatterns = await detectTestFilePatterns(root, entries);
		testPatterns.push(...testFilePatterns);

		// Detect entry points
		const entryPoints = await detectEntryPoints(root, entries);

		return {
			directories: directories.sort(),
			entryPoints,
			testPatterns,
		};
	}
}

async function readDirSafe(dir: string): Promise<string[]> {
	try {
		return await readdir(dir);
	} catch {
		return [];
	}
}

async function isDirectory(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isDirectory();
	} catch {
		return false;
	}
}

async function detectEntryPoints(root: string, entries: string[]): Promise<string[]> {
	const found: string[] = [];

	// Root-level entry points
	for (const name of ENTRY_POINT_NAMES) {
		if (entries.includes(name)) {
			found.push(name);
		}
	}

	// src/ subdirectory entry points
	const srcEntries = await readDirSafe(join(root, "src"));
	for (const name of ENTRY_POINT_NAMES) {
		if (srcEntries.includes(name)) {
			found.push(`src/${name}`);
		}
	}

	return found.sort();
}

async function detectTestFilePatterns(root: string, entries: string[]): Promise<string[]> {
	const patterns: string[] = [];

	// Check root-level files for *.test.* pattern
	for (const entry of entries) {
		if (/\.(test|spec)\.[a-z]+$/.test(entry)) {
			const ext = entry.split(".").pop();
			if (ext) {
				const pattern = `*.test.${ext}`;
				if (!patterns.includes(pattern)) {
					patterns.push(pattern);
				}
			}
		}
	}

	// Check src/ for test files
	const srcEntries = await readDirSafe(join(root, "src"));
	for (const entry of srcEntries) {
		if (/\.(test|spec)\.[a-z]+$/.test(entry)) {
			const ext = entry.split(".").pop();
			if (ext) {
				const pattern = `*.test.${ext}`;
				if (!patterns.includes(pattern)) {
					patterns.push(pattern);
				}
			}
		}
	}

	return patterns;
}
