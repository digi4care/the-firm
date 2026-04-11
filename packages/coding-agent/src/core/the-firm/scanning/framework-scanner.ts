/**
 * FrameworkScanner — Detects frameworks from config files and package.json deps.
 *
 * Each framework has one or more detection strategies:
 *   - Config file presence (svelte.config.js, next.config.js, etc.)
 *   - package.json dependency check (express, fastify)
 *   - Combined file heuristics (Django: manage.py + settings.py)
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { DetectedFramework } from "../types/index.js";

interface FrameworkRule {
	framework: string;
	/** Strategy 1: config files — any match is sufficient. */
	configFiles?: string[];
	/** Strategy 2: package.json dependency names. */
	packageDeps?: string[];
	/** Strategy 3: require ALL of these files to exist. */
	allFilesRequired?: string[];
	confidence: number;
}

const RULES: readonly FrameworkRule[] = [
	{
		framework: "Svelte",
		configFiles: ["svelte.config.js", "svelte.config.ts"],
		confidence: 1.0,
	},
	{
		framework: "SvelteKit",
		configFiles: ["svelte.config.js", "svelte.config.ts"],
		packageDeps: ["@sveltejs/kit"],
		confidence: 1.0,
	},
	{
		framework: "Next.js",
		configFiles: ["next.config.js", "next.config.ts", "next.config.mjs"],
		confidence: 1.0,
	},
	{
		framework: "Express",
		packageDeps: ["express"],
		confidence: 0.9,
	},
	{
		framework: "Fastify",
		packageDeps: ["fastify"],
		confidence: 0.9,
	},
	{
		framework: "Django",
		allFilesRequired: ["manage.py", "settings.py"],
		confidence: 0.8,
	},
	{
		framework: "Spring Boot",
		configFiles: ["pom.xml"],
		confidence: 0.7,
	},
];

async function fileExists(path: string): Promise<boolean> {
	try {
		const s = await stat(path);
		return s.isFile();
	} catch {
		return false;
	}
}

async function readPackageJson(root: string): Promise<Record<string, unknown> | null> {
	try {
		const raw = await readFile(join(root, "package.json"), "utf-8");
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function hasDependency(pkg: Record<string, unknown>, dep: string): boolean {
	const deps = pkg.dependencies as Record<string, string> | undefined;
	const devDeps = pkg.devDependencies as Record<string, string> | undefined;
	return !!((deps && dep in deps) || (devDeps && dep in devDeps));
}

export class FrameworkScanner {
	async scan(root: string): Promise<DetectedFramework[]> {
		const results: DetectedFramework[] = [];
		const pkg = await readPackageJson(root);

		for (const rule of RULES) {
			const evidence: string[] = [];

			// Strategy 1: config files
			if (rule.configFiles) {
				for (const cf of rule.configFiles) {
					if (await fileExists(join(root, cf))) {
						evidence.push(cf);
					}
				}
			}

			// Strategy 2: package.json deps
			if (rule.packageDeps && pkg) {
				for (const dep of rule.packageDeps) {
					if (hasDependency(pkg, dep)) {
						evidence.push(`package.json:${dep}`);
					}
				}
			}

			// Strategy 3: all files required
			if (rule.allFilesRequired) {
				const allPresent = await everyFileExists(root, rule.allFilesRequired);
				if (allPresent) {
					evidence.push(...rule.allFilesRequired);
				}
			}

			if (evidence.length > 0) {
				results.push({
					name: rule.framework,
					confidence: rule.confidence,
					evidence,
				});
			}
		}

		return results;
	}
}

async function everyFileExists(root: string, files: string[]): Promise<boolean> {
	for (const file of files) {
		if (!(await fileExists(join(root, file)))) {
			return false;
		}
	}
	return true;
}
