import { readFileSync, readdirSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
/**
 * SetupTool — Populates .firm/ with default standards and derived rules.
 *
 * Template mode: generates standards based on detected project stack.
 * - Always generates planning-output and implementation-workflow standards
 * - Generates language/framework-specific standards based on scan results
 * - Derives compact .pi/rules/ for each standard
 * - Skips files that already exist
 * - Updates config.json with standards metadata
 */
import { KBToolBase } from "../pipeline/tool-base.js";
import type { PipelineContext, ProjectProfile, ToolInput, WriteOperation } from "../types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Input type ──────────────────────────────────────────────────────────────

export interface SetupInput extends ToolInput {
	options: {
		answers?: Record<string, string>;
		autoDefaults?: boolean;
	};
}

// ── Analysis shape ──────────────────────────────────────────────────────────

interface SetupAnalysis {
	existingStandards: Set<string>;
	existingRules: Set<string>;
	existingWorkflowFiles: Set<string>;
	existingGuideFiles: Set<string>;
	existingPatternFiles: Set<string>;
	existingStandardDefaultFiles: Set<string>;
	existingTemplateFiles: Set<string>;
	originalConfigJson: string | null;
	updatedConfigJson: string | null;
	standardsToGenerate: StandardDef[];
	rulesToGenerate: RuleDef[];
	defaultFilesToDeploy: DefaultFile[];
	defaultRulesToDeploy: DefaultFile[];
}

interface StandardDef {
	fileName: string;
	name: string;
	description: string;
	owner: string;
	content: string;
}

interface RuleDef {
	fileName: string;
	name: string;
	description: string;
	alwaysApply: boolean;
	globs: string[];
	content: string;
}

interface DefaultFile {
	sourcePath: string; // absolute path to defaults/ file
	targetPath: string; // relative path within .firm/
	content: string;
}

// ── Standard file loading ─────────────────────────────────────────────────

export function parseFrontmatter(raw: string): {
	frontmatter: Record<string, string>;
	body: string;
} {
	const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
	if (!match) {
		return { frontmatter: {}, body: raw };
	}

	const frontmatter: Record<string, string> = {};
	for (const line of match[1].split("\n")) {
		const kv = line.match(/^(\w[\w-]*):\s*"?(.+?)"?\s*$/);
		if (kv) {
			frontmatter[kv[1]] = kv[2].replace(/"$/, "");
		}
	}

	return { frontmatter, body: match[2] };
}

export function loadStandardFiles(): {
	always: StandardDef[];
	byLanguage: Record<string, StandardDef>;
} {
	const always: StandardDef[] = [];
	const byLanguage: Record<string, StandardDef> = {};

	const standardsDir = join(__dirname, "..", "defaults", "standards");
	let entries: string[];
	try {
		entries = readdirSync(standardsDir)
			.filter((f) => f.endsWith(".md"))
			.sort();
	} catch {
		return { always, byLanguage };
	}

	for (const fileName of entries) {
		const raw = readFileSync(join(standardsDir, fileName), "utf-8");
		const { frontmatter, body } = parseFrontmatter(raw);

		const def: StandardDef = {
			fileName,
			name: frontmatter.name ?? fileName.replace(/\.md$/, ""),
			description: frontmatter.description ?? "",
			owner: frontmatter.owner ?? "The Firm Architecture Team",
			content: body.trim(),
		};

		const language = frontmatter.language ?? "unknown";
		if (language === "always") {
			always.push(def);
		} else {
			byLanguage[language] = def;
		}
	}

	return { always, byLanguage };
}

// ── Language glob patterns for rules ────────────────────────────────────────

const LANGUAGE_GLOBS: Record<string, string[]> = {
	TypeScript: ["**/*.ts", "**/*.tsx"],
	Svelte: ["**/*.svelte"],
	Python: ["**/*.py"],
	Go: ["**/*.go"],
	Rust: ["**/*.rs"],
	Java: ["**/*.java"],
};

// ── SetupTool ───────────────────────────────────────────────────────────────

export class SetupTool extends KBToolBase<SetupInput> {
	readonly name = "kb-setup";
	readonly description = "Populate .firm/ with default standards and derived rules";

	protected async scan(input: SetupInput, context: PipelineContext): Promise<void> {
		const profile = await this.scanner.scan(input.projectRoot);
		context.profile = profile;

		// Read existing standards
		const existingStandards = new Set<string>();
		const stdFiles = await this.firmRepo.list("lookup/standards");
		for (const f of stdFiles) {
			existingStandards.add(`lookup/standards/${f}`);
		}

		// Read existing rules
		const existingRules = new Set<string>();
		const ruleFiles = await this.rulesRepo.list();
		for (const f of ruleFiles) {
			existingRules.add(f);
		}
		// Read existing default file targets for skip-logic
		const existingWorkflowFiles = new Set(
			await this.firmRepo.listFiles("operations/workflows/templates", ".yaml")
		);
		const existingGuideFiles = new Set(await this.firmRepo.list("guides"));
		const existingPatternFiles = new Set(await this.firmRepo.list("concepts/patterns"));
		const existingStandardDefaultFiles = new Set(await this.firmRepo.list("lookup/standards"));
		const existingTemplateFiles = new Set(await this.firmRepo.list("templates"));

		// Read existing config.json
		const configContent = await this.firmRepo.read("config.json");

		context.rawAnalysis.push({
			existingStandards,
			existingRules,
			existingWorkflowFiles,
			existingGuideFiles,
			existingPatternFiles,
			existingStandardDefaultFiles,
			existingTemplateFiles,
			originalConfigJson: configContent,
			updatedConfigJson: null,
			standardsToGenerate: [],
			rulesToGenerate: [],
			defaultFilesToDeploy: [],
			defaultRulesToDeploy: []
		} satisfies SetupAnalysis);
	}

	protected async analyze(input: SetupInput, context: PipelineContext): Promise<void> {
		const profile = context.profile as ProjectProfile;
		const analysis = context.rawAnalysis[0] as SetupAnalysis;
		const today = new Date().toISOString().split("T")[0];

		// Detect languages
		const detectedLanguages = new Set(profile.languages.map((l) => l.name));

		// Detect frameworks
		const detectedFrameworks = new Set(profile.frameworks.map((f) => f.name.toLowerCase()));

		// Framework aliases: if sveltekit detected, also generate Svelte standard
		if (detectedFrameworks.has("sveltekit")) {
			detectedLanguages.add("Svelte");
		}

		// Collect standards to generate
		const standardsToGenerate: StandardDef[] = [];
		const { always, byLanguage } = loadStandardFiles();

		// Always-on standards
		for (const def of always) {
			standardsToGenerate.push(def);
		}

		// Language-specific standards
		for (const lang of detectedLanguages) {
			const langStd = byLanguage[lang];
			if (langStd) {
				standardsToGenerate.push(langStd);
			}
		}

		// Framework → language mapping (SvelteKit implies Svelte)
		if (detectedFrameworks.has("svelte") || detectedFrameworks.has("sveltekit")) {
			if (!standardsToGenerate.some((s) => s.fileName === "svelte-components.md")) {
				const svelteStd = byLanguage.Svelte;
				if (svelteStd) {
					standardsToGenerate.push(svelteStd);
				}
			}
		}

		// Derive rules from standards
		const rulesToGenerate: RuleDef[] = [];
		for (const std of standardsToGenerate) {
			const globs =
				LANGUAGE_GLOBS[std.name.replace(" Coding", "").replace(" Components", "")] ?? [];
			const isAlways = globs.length === 0;

			rulesToGenerate.push({
				fileName: std.fileName,
				name: std.name,
				description: std.description,
				alwaysApply: isAlways,
				globs,
				content: deriveRuleContent(std.content),
			});
		}

		// Build updated config.json with standards metadata
		let updatedConfigJson: string | null = null;
		if (analysis.originalConfigJson) {
			try {
				const config = JSON.parse(analysis.originalConfigJson);
				config.standards = standardsToGenerate.map((s) => ({
					file: s.fileName,
					name: s.name,
					description: s.description,
				}));
				config.updated = today;
				updatedConfigJson = JSON.stringify(config, null, 2);
			} catch {
				// If config is unparseable, skip the update
			}
		}

		// Update analysis in place
		analysis.standardsToGenerate = standardsToGenerate;
		analysis.rulesToGenerate = rulesToGenerate;
		analysis.updatedConfigJson = updatedConfigJson;

		// Discover default files to deploy
		analysis.defaultFilesToDeploy = await discoverDefaultFiles(
			analysis.existingWorkflowFiles,
			analysis.existingGuideFiles,
			analysis.existingPatternFiles,
			analysis.existingTemplateFiles
		);

		// Discover default rules from defaults/rules/
		const defaultRulesDir = join(__dirname, "..", "defaults", "rules");
		try {
			const ruleEntries = await readdir(defaultRulesDir);
			for (const entry of ruleEntries) {
				if (!entry.endsWith(".md")) { continue; }
				if (analysis.existingRules.has(entry)) { continue; }

				const content = await readFile(join(defaultRulesDir, entry), "utf-8");
				analysis.defaultRulesToDeploy.push({
					sourcePath: join(defaultRulesDir, entry),
					targetPath: entry,
					content,
				});
			}
		} catch {
			// defaults/rules/ may not exist yet
		}
	}

	protected buildProposals(_input: SetupInput, context: PipelineContext): void {
		const analysis = context.rawAnalysis[0] as SetupAnalysis;
		if (!analysis) {
			return;
		}

		const today = new Date().toISOString().split("T")[0];
		let proposalId = 1;

		// Proposals for standards → .firm/lookup/standards/
		for (const std of analysis.standardsToGenerate) {
			const targetPath = `lookup/standards/${std.fileName}`;

			// Skip already-existing standards
			if (analysis.existingStandards.has(targetPath)) {
				continue;
			}

			const content = buildStandardContent(std, today);
			context.proposals.push({
				id: `setup-${proposalId++}`,
				action: "create",
				targetPath,
				content,
				metadata: {
					contentType: "standard",
					category: "lookup",
					template: "standard",
					validationPassed: false,
				},
			});
		}

		// Proposals for rules → .pi/rules/
		for (const rule of analysis.rulesToGenerate) {
			// Skip already-existing rules
			if (analysis.existingRules.has(rule.fileName)) {
				continue;
			}

			const content = buildRuleContent(rule, today);
			context.proposals.push({
				id: `setup-${proposalId++}`,
				action: "create",
				targetPath: `rule:${rule.fileName}`,
				content,
				metadata: {
					contentType: "rule",
					category: "lookup",
					template: "rule",
					validationPassed: false,
				},
			});
		}

		// Proposals for default rules from defaults/rules/ → .pi/rules/
		for (const defaultRule of analysis.defaultRulesToDeploy) {
			context.proposals.push({
				id: `setup-${proposalId++}`,
				action: "create",
				targetPath: `rule:${defaultRule.targetPath}`,
				content: defaultRule.content,
				metadata: {
					contentType: "rule" as const,
					category: "lookup" as const,
					template: "rule",
					validationPassed: false,
				},
			});
		}

		// Config.json update proposal (only if we have an updated version)
		if (analysis.updatedConfigJson) {
			context.proposals.push({
				id: `setup-${proposalId++}`,
				action: "update",
				targetPath: "config.json",
				content: analysis.updatedConfigJson,
				metadata: {
					contentType: "standard",
					category: "lookup",
					template: "standard",
					validationPassed: false,
				},
			});
		}

		// Proposals for default files (workflow templates + guides)
		for (const defaultFile of analysis.defaultFilesToDeploy) {
			context.proposals.push({
				id: `setup-${proposalId++}`,
				action: "create",
				targetPath: `default:${defaultFile.targetPath}`,
				content: defaultFile.content,
				metadata: {
					contentType: "guide" as const,
					category: "guides" as const,
					template: "guide",
					validationPassed: false,
				},
			});
		}
	}

	/**
	 * Override write to also handle rule proposals through RulesRepository.
	 */
	protected async write(context: PipelineContext): Promise<void> {
		const written: WriteOperation[] = [];
		const errors: string[] = [];

		for (const proposal of context.approvedProposals) {
			if (proposal.targetPath.startsWith("rule:")) {
				// Rule proposals → .pi/rules/
				const ruleFileName = proposal.targetPath.slice(5);
				await this.rulesRepo.write(ruleFileName, proposal.content);
				written.push({
					action: "create",
					targetPath: `.pi/rules/${ruleFileName}`,
				});
			} else if (proposal.targetPath.startsWith("default:")) {
				// Default file proposals → .firm/<targetPath>
				const defaultTarget = proposal.targetPath.slice(8);
				const op = await this.firmRepo.writeWithBackup(defaultTarget, proposal.content);
				written.push(op);
			} else if (proposal.action === "delete") {
				await this.firmRepo.delete(proposal.targetPath);
				written.push({
					action: "delete",
					targetPath: proposal.targetPath,
				});
			} else {
				const op = await this.firmRepo.writeWithBackup(proposal.targetPath, proposal.content);
				written.push(op);
			}
		}

		context.writeResult = { written, navigationsUpdated: [], errors };
	}
}

// ── Content generation helpers ──────────────────────────────────────────────

function buildStandardContent(std: StandardDef, today: string): string {
	const lines = [
		"---",
		"status: active",
		`description: "${std.description}"`,
		`owner: ${std.owner}`,
		`created: ${today}`,
		`updated: ${today}`,
		"review-cadence: quarterly",
		"---",
		"",
		`# Standard: ${std.name}`,
		"",
		"## Rule",
		"",
		std.content,
		"",
		"## Rationale",
		"",
		`Establishes consistent practices for ${std.name.toLowerCase()} across the codebase.`,
		"Reduces cognitive load for contributors and enables automated enforcement.",
		"",
		"## Enforcement",
		"",
		"Reviewed during code review. Linting rules should mirror these conventions where possible.",
		"",
		"---",
		"*Navigation: [Back to parent](../navigation.md)*",
		"",
	];
	return lines.join("\n");
}

function buildRuleContent(rule: RuleDef, today: string): string {
	const frontmatterLines: string[] = ["---"];
	if (rule.alwaysApply) {
		frontmatterLines.push("alwaysApply: true");
	} else if (rule.globs.length > 0) {
		frontmatterLines.push(`globs: [${rule.globs.map((g) => `"${g}"`).join(", ")}]`);
	}
	frontmatterLines.push(`description: "${rule.description}"`);
	frontmatterLines.push("---");

	const lines = [...frontmatterLines, "", `# Rule: ${rule.name}`, "", rule.content, ""];
	return lines.join("\n");
}

/**
 * Derives compact rule content from a standard's content lines.
 * Strips rationale, keeps actionable "what to do" directives.
 */
function deriveRuleContent(standardContent: string): string {
	// Split into individual directives and keep them compact
	const lines = standardContent.split("\n").filter((l) => l.trim().length > 0);
	return lines.map((line) => `- ${line.trim()}`).join("\n");
}

/**
 * Discover default files from defaults/ directory that need deploying.
 * Skips files that already exist in .firm/.
 */
async function discoverDefaultFiles(
	existingWorkflowFiles: Set<string>,
	existingGuideFiles: Set<string>,
	existingPatternFiles: Set<string>,
	existingTemplateFiles: Set<string>
): Promise<DefaultFile[]> {
	const defaultsDir = join(__dirname, "..", "defaults");
	const files: DefaultFile[] = [];

	// Deploy workflow templates from defaults/workflows/
	const workflowDir = join(defaultsDir, "workflows");
	try {
		const wfEntries = await readdir(workflowDir);
		for (const entry of wfEntries) {
			if (!entry.endsWith(".yaml")) {
				continue;
			}
			if (existingWorkflowFiles.has(entry)) {
				continue;
			}

			const content = await readFile(join(workflowDir, entry), "utf-8");
			files.push({
				sourcePath: join(workflowDir, entry),
				targetPath: `operations/workflows/templates/${entry}`,
				content,
			});
		}
	} catch {
		// defaults/workflows/ may not exist yet
	}

	// Deploy guides from defaults/guides/
	const guidesDir = join(defaultsDir, "guides");
	try {
		const guideEntries = await readdir(guidesDir);
		for (const entry of guideEntries) {
			if (!entry.endsWith(".md")) {
				continue;
			}
			if (existingGuideFiles.has(entry)) {
				continue;
			}

			const content = await readFile(join(guidesDir, entry), "utf-8");
			files.push({
				sourcePath: join(guidesDir, entry),
				targetPath: `guides/${entry}`,
				content,
			});
		}
	} catch {
		// defaults/guides/ may not exist yet
	}
	// Deploy patterns from defaults/patterns/
	const patternsDir = join(defaultsDir, "patterns");
	try {
		const patternEntries = await readdir(patternsDir);
		for (const entry of patternEntries) {
			if (!entry.endsWith(".md")) {
				continue;
			}
			if (existingPatternFiles.has(entry)) {
				continue;
			}

			const content = await readFile(join(patternsDir, entry), "utf-8");
			files.push({
				sourcePath: join(patternsDir, entry),
				targetPath: `concepts/patterns/${entry}`,
				content,
			});
		}
	} catch {
		// defaults/patterns/ may not exist yet
	}

	// Deploy templates from defaults/templates/
	const tmplDir = join(defaultsDir, "templates");
	try {
		const tmplEntries = await readdir(tmplDir);
		for (const entry of tmplEntries) {
			if (!entry.endsWith(".md")) {
				continue;
			}
			if (existingTemplateFiles.has(entry)) {
				continue;
			}

			const content = await readFile(join(tmplDir, entry), "utf-8");
			files.push({
				sourcePath: join(tmplDir, entry),
				targetPath: `templates/${entry}`,
				content,
			});
		}
	} catch {
		// defaults/templates/ may not exist yet
	}

	return files;
}
