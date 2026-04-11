/**
 * LanguageScanner — Detects programming languages from config files.
 *
 * Each marker maps to a language with a fixed confidence score.
 * Confidence is 1.0 for definitive markers (e.g. tsconfig.json means TypeScript),
 * lower for heuristics (e.g. package.json without tsconfig could be JS or a mix).
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { DetectedLanguage } from "../types/index.js";

interface LanguageMarker {
	language: string;
	files: string[];
	/** Confidence when at least one marker file is found. */
	confidence: number;
	/** If true, only match when excludeFiles are ALL absent. */
	excludeFiles?: string[];
}

const MARKERS: readonly LanguageMarker[] = [
	{ language: "TypeScript", files: ["tsconfig.json"], confidence: 1.0 },
	{
		language: "JavaScript",
		files: ["package.json"],
		confidence: 0.7,
		excludeFiles: ["tsconfig.json"],
	},
	{
		language: "Python",
		files: ["pyproject.toml", "setup.py", "requirements.txt"],
		confidence: 1.0,
	},
	{ language: "Go", files: ["go.mod"], confidence: 1.0 },
	{ language: "Rust", files: ["Cargo.toml"], confidence: 1.0 },
	{ language: "Java", files: ["pom.xml", "build.gradle"], confidence: 1.0 },
];

async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isFile();
	} catch {
		return false;
	}
}

async function canReadPackageJson(root: string): Promise<Record<string, unknown> | null> {
	try {
		const raw = await readFile(join(root, "package.json"), "utf-8");
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return null;
	}
}

export class LanguageScanner {
	async scan(root: string): Promise<DetectedLanguage[]> {
		const results: DetectedLanguage[] = [];

		for (const marker of MARKERS) {
			// Check exclude conditions first
			if (marker.excludeFiles) {
				const excluded = await someExists(root, marker.excludeFiles);
				if (excluded) {
					continue;
				}
			}

			const found: string[] = [];
			for (const file of marker.files) {
				if (await fileExists(join(root, file))) {
					found.push(file);
				}
			}

			if (found.length > 0) {
				results.push({
					name: marker.language,
					confidence: marker.confidence,
					evidence: found,
				});
			}
		}

		// Boost JavaScript confidence if package.json declares no TS deps
		if (results.some((r) => r.name === "JavaScript")) {
			const pkg = await canReadPackageJson(root);
			if (pkg && !hasTypeScriptDependency(pkg)) {
				const js = results.find((r) => r.name === "JavaScript");
				if (js) {
					js.confidence = 0.9;
				}
			}
		}

		return results;
	}
}

/** Check whether any of the given filenames exist in root. */
async function someExists(root: string, files: string[]): Promise<boolean> {
	for (const file of files) {
		if (await fileExists(join(root, file))) {
			return true;
		}
	}
	return false;
}

function hasTypeScriptDependency(pkg: Record<string, unknown>): boolean {
	const deps = pkg.dependencies as Record<string, string> | undefined;
	const devDeps = pkg.devDependencies as Record<string, string> | undefined;
	return !!((deps && "typescript" in deps) || (devDeps && "typescript" in devDeps));
}
