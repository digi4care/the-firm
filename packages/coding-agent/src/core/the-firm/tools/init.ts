/**
 * InitTool — Phase 2 kb-init command.
 *
 * Creates .firm/ structure dynamically based on project scan.
 * No AI involved — fully deterministic. Produces proposals for:
 *   - config.json with resolved values from the scan
 *   - navigation.md seeding for each .firm/ subdirectory
 *
 * Handles existing .firm/ gracefully: skips files that already exist.
 */
import { readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { KBToolBase } from "../pipeline/tool-base.js";
import type { PipelineContext, ProjectProfile, Proposal, ToolInput } from "../types/index.js";

// ── Analysis shape stored in PipelineContext.rawAnalysis ────────────────────

interface InitAnalysis {
	configJson: string;
	navigationFiles: NavigationEntry[];
	existingConfig: boolean;
}

interface NavigationEntry {
	/** Relative path under .firm/ (e.g. "concepts/decisions/navigation.md"). */
	targetPath: string;
	content: string;
}

// ── Directory structure ────────────────────────────────────────────────────

/** Standard .firm/ subdirectories. Each gets a navigation.md. */
const FIRM_DIRECTORIES = [
	"concepts/decisions",
	"concepts/patterns",
	"guides/workflows",
	"lookup/standards",
	"errors",
	"specs",
	"templates",
] as const;

// ── Package.json shape ────────────────────────────────────────────────────

interface PackageJson {
	name?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

// ── InitTool ───────────────────────────────────────────────────────────────

export class InitTool extends KBToolBase {
	readonly name = "kb-init";
	readonly description = "Initialize .firm/ knowledge base structure from project scan";

	protected async scan(input: ToolInput, context: PipelineContext): Promise<void> {
		const profile = await this.scanner.scan(input.projectRoot);
		context.profile = profile;

		const pkgJson = await readPackageJson(input.projectRoot);
		context.rawAnalysis.push({ pkgJson });
	}

	protected async analyze(input: ToolInput, context: PipelineContext): Promise<void> {
		const profile = context.profile as ProjectProfile;
		const { pkgJson } = context.rawAnalysis[0] as { pkgJson: PackageJson | null };

		const today = new Date().toISOString().split("T")[0];
		const language = resolveLanguage(profile.languages);
		const packageManager = await inferPackageManager(input.projectRoot);

		// Build config.json
		const configJson = buildConfigJson({
			projectRoot: input.projectRoot,
			profile,
			pkgJson,
			today,
			language,
			packageManager,
		});

		// Check for existing config.json (FirmScanner only lists .md files)
		const existingConfig = await fileExistsInRoot(join(input.projectRoot, ".firm"), "config.json");

		// Build navigation.md entries, skipping existing files
		const existingFiles = new Set(profile.existingFirm.files);
		const navigationFiles: NavigationEntry[] = [];

		for (const dir of FIRM_DIRECTORIES) {
			const navPath = `${dir}/navigation.md`;
			if (existingFiles.has(navPath)) {
				continue;
			}
			navigationFiles.push({
				targetPath: navPath,
				content: buildNavigationMd(dir, today),
			});
		}

		// Root navigation.md
		if (!existingFiles.has("navigation.md")) {
			navigationFiles.push({
				targetPath: "navigation.md",
				content: buildNavigationMd("", today),
			});
		}

		context.rawAnalysis.push({
			configJson,
			navigationFiles,
			existingConfig,
		} satisfies InitAnalysis);
	}

	protected buildProposals(_input: ToolInput, context: PipelineContext): void {
		const analysis = context.rawAnalysis[1] as InitAnalysis | undefined;
		if (!analysis) {
			return;
		}

		let proposalId = 1;

		// config.json proposal (skip if already exists)
		if (!analysis.existingConfig) {
			context.proposals.push({
				id: `init-${proposalId++}`,
				action: "create",
				targetPath: "config.json",
				content: analysis.configJson,
				metadata: {
					contentType: "standard",
					category: "lookup",
					template: "standard",
					validationPassed: false,
				},
			});
		}

		// navigation.md proposals
		for (const entry of analysis.navigationFiles) {
			context.proposals.push({
				id: `init-${proposalId++}`,
				action: "create",
				targetPath: entry.targetPath,
				content: entry.content,
				metadata: {
					contentType: "guide",
					category: "guides",
					template: "guide",
					validationPassed: false,
				},
			});
		}
	}
}

// ── config.json generation ─────────────────────────────────────────────────

interface ConfigParams {
	projectRoot: string;
	profile: ProjectProfile;
	pkgJson: PackageJson | null;
	today: string;
	language: string;
	packageManager: string;
}

function buildConfigJson(params: ConfigParams): string {
	const { projectRoot, profile, pkgJson, today, language, packageManager } = params;

	const projectName = pkgJson?.name ?? basename(projectRoot);
	const projectType = inferProjectType(profile.frameworks);
	const runtime = inferRuntime(profile.languages);
	const commands = inferCommands(pkgJson, language, packageManager);

	const config = {
		$schema: "https://the-firm.ai/schemas/config.json",
		version: "1",
		project: {
			name: projectName,
			type: projectType,
			root: projectRoot,
			created: today,
			initialized: today,
		},
		stack: {
			language,
			runtime,
			packageManager,
		},
		commands,
		preferences: {
			defaultOwner: "auto-generated",
			reviewCadence: "quarterly",
		},
		integrations: {
			git: true,
			beads: false,
			mcp: false,
		},
	};

	return JSON.stringify(config, null, 2);
}

// ── navigation.md generation ──────────────────────────────────────────────

function buildNavigationMd(dir: string, date: string): string {
	const displayName = dir === "" ? ".firm" : (dir.split("/").pop() ?? dir);
	const title = dir === "" ? ".firm/ — Navigation" : `${displayName}/ — Navigation`;

	return `${[
		"---",
		"status: active",
		"owner: auto-generated",
		`created: ${date}`,
		`updated: ${date}`,
		"---",
		"",
		`# ${title}`,
		"",
		"| Name | Description |",
		"|------|-------------|",
	].join("\n")}\n`;
}

// ── Inference helpers ─────────────────────────────────────────────────────

function inferProjectType(frameworks: ProjectProfile["frameworks"]): string {
	if (frameworks.length === 0) {
		return "library";
	}
	const names = frameworks.map((f) => f.name.toLowerCase());
	if (
		names.some((n) => ["svelte", "next", "nuxt", "remix", "angular", "react", "vue"].includes(n))
	) {
		return "web-app";
	}
	if (
		names.some((n) =>
			["express", "fastify", "koa", "hapi", "django", "flask", "fastapi"].includes(n)
		)
	) {
		return "web-service";
	}
	return "library";
}

function resolveLanguage(languages: ProjectProfile["languages"]): string {
	if (languages.length === 0) {
		return "unknown";
	}
	return [...languages].sort((a, b) => b.confidence - a.confidence)[0].name;
}

function inferRuntime(languages: ProjectProfile["languages"]): string {
	const langNames = new Set(languages.map((l) => l.name.toLowerCase()));
	if (langNames.has("typescript") || langNames.has("javascript")) {
		return "bun";
	}
	if (langNames.has("python")) {
		return "python";
	}
	if (langNames.has("go")) {
		return "go";
	}
	if (langNames.has("rust")) {
		return "cargo";
	}
	if (langNames.has("java")) {
		return "jvm";
	}
	return "unknown";
}

async function inferPackageManager(root: string): Promise<string> {
	const lockfileChecks: Array<{ file: string; manager: string }> = [
		{ file: "bun.lockb", manager: "bun" },
		{ file: "bun.lock", manager: "bun" },
		{ file: "pnpm-lock.yaml", manager: "pnpm" },
		{ file: "yarn.lock", manager: "yarn" },
		{ file: "package-lock.json", manager: "npm" },
	];

	for (const { file, manager } of lockfileChecks) {
		if (await fileExistsInRoot(root, file)) {
			return manager;
		}
	}

	return "unknown";
}

function inferCommands(
	pkgJson: PackageJson | null,
	language: string,
	packageManager: string
): Record<string, string> {
	const commands: Record<string, string> = {};

	if (pkgJson?.scripts) {
		// If package.json defines scripts, reference them via the detected package manager
		const runPrefix = packageManager === "npm" ? "npm run" : packageManager;

		if (pkgJson.scripts.test) {
			commands.test = `${runPrefix} test`;
		}
		if (pkgJson.scripts.build) {
			commands.build = `${runPrefix} build`;
		}
		if (pkgJson.scripts.lint) {
			commands.lint = `${runPrefix} lint`;
		}
		if (pkgJson.scripts.format) {
			commands.format = `${runPrefix} format`;
		}
	}

	// Fill defaults for missing commands
	const defaults = LANGUAGE_DEFAULTS[language] ?? LANGUAGE_DEFAULTS.TypeScript;
	if (!commands.test) {
		commands.test = defaults.test;
	}
	if (!commands.build) {
		commands.build = defaults.build;
	}
	if (!commands.lint) {
		commands.lint = defaults.lint;
	}

	return commands;
}

const LANGUAGE_DEFAULTS: Record<string, { test: string; build: string; lint: string }> = {
	TypeScript: { test: "bun test", build: "bun run build", lint: "biome lint ." },
	JavaScript: { test: "npm test", build: "npm run build", lint: "eslint ." },
	Python: { test: "pytest", build: "python -m build", lint: "ruff check ." },
	Go: { test: "go test ./...", build: "go build", lint: "golangci-lint run" },
	Rust: { test: "cargo test", build: "cargo build", lint: "cargo clippy" },
	Java: { test: "mvn test", build: "mvn package", lint: "mvn checkstyle:check" },
};

// ── Filesystem helpers ─────────────────────────────────────────────────────

async function readPackageJson(root: string): Promise<PackageJson | null> {
	try {
		const raw = await readFile(join(root, "package.json"), "utf-8");
		return JSON.parse(raw) as PackageJson;
	} catch {
		return null;
	}
}

async function fileExistsInRoot(root: string, fileName: string): Promise<boolean> {
	try {
		const s = await stat(join(root, fileName));
		return s.isFile();
	} catch {
		return false;
	}
}
