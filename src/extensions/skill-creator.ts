/**
 * Skill Creator — Create, audit, and optimize Pi skills with quality-first process
 *
 * A meta-skill for building other skills. Provides tools to:
 *   - plan: Draft a skill plan from a request
 *   - audit: Evaluate SKILL.md against quality rubric
 *   - create: Generate new skill skeletons
 *   - optimize: Update existing skills with quality gates
 *
 * Usage: pi -e extensions/skill-creator.ts
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

// ── Types ────────────────────────────────────────

interface Tests {
	shouldTrigger: string[];
	shouldNotTrigger: string[];
	functional: string[];
}

interface PlannedWrite {
	path: string;
	action: "create" | "update";
	content: string;
}

interface QualityMetrics {
	score: number;
	wordCount: number;
	descriptionWordCount: number;
	descriptionHasUseWhen: boolean;
	descriptionHasNegative: boolean;
	hasWhenToUse: boolean;
	hasErrorHandling: boolean;
	hasQuickTests: boolean;
	hasReferences: boolean;
	hasWorkflow: boolean;
	useCount: number;
	avoidCount: number;
	workflowCount: number;
	errorCount: number;
	testCount: number;
	referenceCount: number;
}

// ── Constants ────────────────────────────────────

const DEFAULT_NEGATIVE_TRIGGERS = [
	"general programming questions",
	"installation or troubleshooting",
	"framework-agnostic code help",
];
const DEFAULT_VERSION = "0.1.0";
const DEFAULT_LICENSE = "MIT";
const DEFAULT_BASE_DIR = ".pi/skills";

// ── Helper Functions ─────────────────────────────

const normalizeList = (items?: string[]) =>
	(items ?? []).map((item) => item.trim()).filter(Boolean);

const unique = (items: string[]) => [...new Set(items)];

const normalizeForMatch = (value: string) =>
	value
		.trim()
		.replace(/^['"]|['"]$/g, "")
		.replace(/[.!?]+$/g, "")
		.toLowerCase();

const toKebabCase = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

const toTitleCase = (value: string) =>
	value
		.split("-")
		.filter(Boolean)
		.map((word) => word[0]?.toUpperCase() + word.slice(1))
		.join(" ");

const normalizeFileName = (value: string) => {
	const base = toKebabCase(value.replace(/\.mdx?$/i, ""));
	return base ? `${base}.md` : "reference.md";
};

const buildSkillName = (name?: string, seed?: string) => {
	const normalized = toKebabCase(name ?? "");
	if (normalized) return normalized;
	const derived = toKebabCase(seed ?? "");
	return derived || "new-skill";
};

const mergeLists = (primary: string[], fallback: string[]) => {
	const merged = [...primary, ...fallback];
	const seen: string[] = [];
	const result: string[] = [];
	merged.forEach((item) => {
		const normalized = normalizeForMatch(item);
		if (!normalized) return;
		const overlaps = seen.some(
			(existing) =>
				existing === normalized || existing.includes(normalized) || normalized.includes(existing),
		);
		if (overlaps) return;
		seen.push(normalized);
		result.push(item.trim().replace(/^['"]|['"]$/g, ""));
	});
	return result;
};

const normalizeTests = (tests?: Partial<Tests>): Tests => ({
	shouldTrigger: normalizeList(tests?.shouldTrigger),
	shouldNotTrigger: normalizeList(tests?.shouldNotTrigger),
	functional: normalizeList(tests?.functional),
});

const buildDescriptionDraft = (purpose: string, triggers: string[], negatives: string[]) => {
	const purposeText = purpose.trim() || "This skill helps with <purpose>";
	const whenText = triggers.length
		? `Use when: ${triggers.join("; ")}.`
		: "Use when: <add trigger phrases>.";
	const notText = negatives.length
		? `Do not trigger for: ${negatives.join("; ")}.`
		: "Do not trigger for: <add negative triggers>.";
	return `${purposeText} ${whenText} ${notText}`.replace(/\s+/g, " ").trim();
};

const splitSentences = (text: string) =>
	text
		.split(/(?<=[.!?])\s+/)
		.map((part) => part.trim())
		.filter(Boolean);

const mergeDescription = (existing: string, incoming: string) => {
	if (!incoming.trim()) return existing;
	if (!existing.trim()) return incoming;
	const existingHasPolicy =
		/use when/i.test(existing) && /do not trigger|do not use/i.test(existing);
	const incomingHasPolicy =
		/use when/i.test(incoming) && /do not trigger|do not use/i.test(incoming);
	if (existingHasPolicy && !incomingHasPolicy) {
		return existing;
	}
	const merged = mergeLists(splitSentences(existing), splitSentences(incoming));
	return merged.join(" ").trim();
};

const formatBulletList = (items: string[], fallback: string) => {
	const list = items.length ? items : [fallback];
	return list.map((item) => `- ${item}`).join("\n");
};

const formatNumberedList = (items: string[], fallback: string) => {
	const list = items.length ? items : [fallback];
	return list.map((item, index) => `${index + 1}. ${item}`).join("\n");
};

const buildWhenToUseBody = (triggers: string[], negatives: string[]) => {
	const triggerLines = formatBulletList(triggers, "<add trigger phrases>");
	const negativeLines = formatBulletList(negatives, "<add negative triggers>");
	return `Use me when:\n\n${triggerLines}\n\nDo not use me for:\n\n${negativeLines}`;
};

const buildWorkflowBody = (workflow: string[]) =>
	formatNumberedList(workflow, "<add workflow steps>");

const buildErrorHandlingBody = (errors: string[]) =>
	formatBulletList(errors, "<add error handling steps>");

const buildQuickTestsBody = (tests: Tests) => {
	const shouldTrigger = formatBulletList(tests.shouldTrigger, "<add should-trigger prompt>");
	const shouldNotTrigger = formatBulletList(
		tests.shouldNotTrigger,
		"<add should-not-trigger prompt>",
	);
	const functional = formatBulletList(tests.functional, "<add functional test prompt>");

	return [
		"Should trigger:",
		"",
		shouldTrigger,
		"",
		"Should not trigger:",
		"",
		shouldNotTrigger,
		"",
		"Functional:",
		"",
		functional,
	].join("\n");
};

const buildReferencesBody = (references: string[]) =>
	formatBulletList(
		references.map((ref) => `\`references/${ref}\``),
		"<add reference files>",
	);

const buildSkillMarkdown = (input: {
	name: string;
	description: string;
	author: string;
	version: string;
	license: string;
	triggers: string[];
	negativeTriggers: string[];
	workflow: string[];
	errorHandling: string[];
	tests: Tests;
	references: string[];
}) => {
	const frontmatter = [
		"---",
		`name: ${input.name}`,
		`description: ${input.description}`,
		`license: ${input.license}`,
		"---",
	].join("\n");

	return [
		frontmatter,
		"",
		`# ${toTitleCase(input.name)}`,
		"",
		"## When to Use Me",
		"",
		buildWhenToUseBody(input.triggers, input.negativeTriggers),
		"",
		"## Workflow",
		"",
		buildWorkflowBody(input.workflow),
		"",
		"## Error Handling",
		"",
		buildErrorHandlingBody(input.errorHandling),
		"",
		"## Quick Tests",
		"",
		buildQuickTestsBody(input.tests),
		"",
		"## References",
		"",
		buildReferencesBody(input.references),
		"",
	].join("\n");
};

const buildReferenceStub = (filename: string) => {
	const title = toTitleCase(filename.replace(/\.mdx?$/i, ""));
	return `# ${title}\n\n<add content here>\n`;
};

const buildRegistryEntry = (filename: string, timestamp: string) => {
	const id = toKebabCase(filename.replace(/\.mdx?$/i, ""));
	return {
		id,
		title: toTitleCase(id),
		filename,
		category: "custom" as const,
		description: `Reference for ${toTitleCase(id)}.`,
		keywords: [id],
		topics: ["references"],
		language: "en",
		created: timestamp,
		last_updated: timestamp,
	};
};

const buildRegistry = (entries: ReturnType<typeof buildRegistryEntry>[]) => {
	const timestamp = new Date().toISOString();
	return {
		version: "1.0.0",
		created: timestamp,
		last_updated: timestamp,
		registry_type: "reference_documents" as const,
		entries,
	};
};

const ensureWithinRoot = (root: string, target: string) => {
	if (path.isAbsolute(target)) {
		throw new Error(`Absolute paths are not allowed: ${target}`);
	}
	const resolvedRoot = path.resolve(root);
	const resolvedTarget = path.resolve(root, target);
	if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
		throw new Error(`Path must be inside project root: ${target}`);
	}
	return resolvedTarget;
};

const readTextFile = async (filePath: string) => {
	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === "ENOENT") return null;
		throw error;
	}
};

const writeFileSafe = async (write: PlannedWrite, overwrite: boolean) => {
	const existing = await readTextFile(write.path);
	if (existing && !overwrite && write.action === "create") {
		throw new Error(`File exists: ${write.path}`);
	}
	await mkdir(path.dirname(write.path), { recursive: true });
	await writeFile(write.path, write.content, "utf8");
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasSection = (content: string, title: string) => {
	const pattern = new RegExp(`(^|\\n)##\\s+${escapeRegExp(title)}\\b`, "i");
	return pattern.test(content);
};

const upsertSection = (content: string, title: string, body: string) => {
	const section = `## ${title}\n\n${body}`.trim();
	const pattern = new RegExp(
		`(^|\\n)##\\s+${escapeRegExp(title)}\\b[\\s\\S]*?(?=\\n##\\s+|$)`,
		"i",
	);
	if (pattern.test(content)) {
		return content.replace(pattern, `\n${section}\n`);
	}
	return `${content.trim()}\n\n${section}\n`;
};

const updateFrontmatter = (content: string, description?: string, version?: string) => {
	const match = content.match(/^---\n([\s\S]*?)\n---\n/);
	if (!match) {
		return { content, warnings: ["missing_frontmatter"] };
	}

	const lines = match[1].split("\n");
	let updatedDescription = false;

	const updated = lines.map((line) => {
		if (description && line.startsWith("description:")) {
			updatedDescription = true;
			const existingDescription = line.replace(/^description:\s*/, "").trim();
			const mergedDescription = mergeDescription(existingDescription, description);
			return `description: ${mergedDescription}`;
		}
		return line;
	});

	if (description && !updatedDescription) {
		const nameIndex = updated.findIndex((line) => line.startsWith("name:"));
		const insertAt = nameIndex >= 0 ? nameIndex + 1 : 0;
		updated.splice(insertAt, 0, `description: ${description}`);
	}

	const frontmatter = updated.join("\n");
	const rebuilt = `---\n${frontmatter}\n---\n${content.slice(match[0].length)}`;
	return { content: rebuilt, warnings: [] as string[] };
};

const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

const toNormalizedItem = (line: string) => line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim();

const parseListItems = (body: string) =>
	body
		.split("\n")
		.map((line) => toNormalizedItem(line))
		.filter((line) => !!line && !line.startsWith("<add "));

const parseWhenToUseBody = (body: string) => {
	const lines = body.split("\n");
	let mode: "use" | "avoid" | null = null;
	const use: string[] = [];
	const avoid: string[] = [];

	lines.forEach((line) => {
		if (/^\s*use me when:/i.test(line)) {
			mode = "use";
			return;
		}
		if (/^\s*do not use me for:/i.test(line)) {
			mode = "avoid";
			return;
		}

		const item = toNormalizedItem(line);
		if (!item || item.startsWith("<add ")) return;
		if (mode === "use") use.push(item);
		if (mode === "avoid") avoid.push(item);
	});

	return { use, avoid };
};

const parseQuickTestsBody = (body: string): Tests => {
	const lines = body.split("\n");
	let mode: "trigger" | "not" | "functional" | null = null;
	const tests: Tests = {
		shouldTrigger: [],
		shouldNotTrigger: [],
		functional: [],
	};

	lines.forEach((line) => {
		if (/^\s*should trigger:/i.test(line)) {
			mode = "trigger";
			return;
		}
		if (/^\s*should not trigger:/i.test(line)) {
			mode = "not";
			return;
		}
		if (/^\s*functional:/i.test(line)) {
			mode = "functional";
			return;
		}

		const item = toNormalizedItem(line);
		if (!item || item.startsWith("<add ")) return;
		if (mode === "trigger") tests.shouldTrigger.push(item);
		if (mode === "not") tests.shouldNotTrigger.push(item);
		if (mode === "functional") tests.functional.push(item);
	});

	return tests;
};

const parseReferenceItems = (body: string) => {
	const matches = body.match(/`references\/([^`]+)`/g) ?? [];
	return matches
		.map((match) =>
			match
				.replace(/`references\//, "")
				.replace(/`$/, "")
				.trim(),
		)
		.filter(Boolean);
};

const getSectionBody = (content: string, title: string) => {
	const headingPattern = new RegExp(`(^|\\n)##\\s+${escapeRegExp(title)}\\b`, "i");
	const heading = headingPattern.exec(content);
	if (!heading) return null;

	const start = heading.index + heading[0].length;
	const nextHeadingPattern = /\n##\s+/g;
	nextHeadingPattern.lastIndex = start;
	const nextHeading = nextHeadingPattern.exec(content);
	const end = nextHeading ? nextHeading.index : content.length;
	return content.slice(start, end).trim();
};

const mergeWhenToUse = (existingBody: string | null, triggers: string[], negatives: string[]) => {
	if (!existingBody) return buildWhenToUseBody(triggers, negatives);
	const parsed = parseWhenToUseBody(existingBody);
	const use = mergeLists(parsed.use, triggers);
	const avoid = mergeLists(parsed.avoid, negatives);
	if (!use.length && !avoid.length) return existingBody;
	return buildWhenToUseBody(use, avoid);
};

const mergeWorkflow = (existingBody: string | null, workflow: string[]) => {
	if (!existingBody) return buildWorkflowBody(workflow);
	const merged = mergeLists(parseListItems(existingBody), workflow);
	if (!merged.length) return existingBody;
	return buildWorkflowBody(merged);
};

const mergeErrorHandling = (existingBody: string | null, errors: string[]) => {
	if (!existingBody) return buildErrorHandlingBody(errors);
	const merged = mergeLists(parseListItems(existingBody), errors);
	if (!merged.length) return existingBody;
	return buildErrorHandlingBody(merged);
};

const mergeQuickTests = (existingBody: string | null, tests: Tests) => {
	if (!existingBody) return buildQuickTestsBody(tests);
	const parsed = parseQuickTestsBody(existingBody);
	const merged: Tests = {
		shouldTrigger: mergeLists(parsed.shouldTrigger, tests.shouldTrigger),
		shouldNotTrigger: mergeLists(parsed.shouldNotTrigger, tests.shouldNotTrigger),
		functional: mergeLists(parsed.functional, tests.functional),
	};
	const hasAny =
		merged.shouldTrigger.length || merged.shouldNotTrigger.length || merged.functional.length;
	if (!hasAny) return existingBody;
	return buildQuickTestsBody(merged);
};

const mergeReferences = (existingBody: string | null, references: string[]) => {
	if (!existingBody) return buildReferencesBody(references);
	const merged = mergeLists(parseReferenceItems(existingBody), references);
	if (!merged.length) return existingBody;
	return buildReferencesBody(merged);
};

// ── Quality Metrics ──────────────────────────────

const collectQualityMetrics = (content: string): QualityMetrics => {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
	const frontmatter = frontmatterMatch ? frontmatterMatch[1] : "";
	const descriptionLine =
		frontmatter
			.split("\n")
			.find((line) => line.startsWith("description:"))
			?.replace(/^description:\s*/, "") ?? "";
	const descriptionWordCount = countWords(descriptionLine || "");
	const descriptionHasUseWhen = /use when/i.test(descriptionLine);
	const descriptionHasNegative = /do not trigger|do not use/i.test(descriptionLine);

	const whenToUseBody =
		getSectionBody(content, "When to Use Me") ?? getSectionBody(content, "When to Use");
	const workflowBody = getSectionBody(content, "Workflow");
	const errorBody = getSectionBody(content, "Error Handling");
	const testsBody = getSectionBody(content, "Quick Tests");
	const referencesBody = getSectionBody(content, "References");

	const whenToUse = whenToUseBody ? parseWhenToUseBody(whenToUseBody) : { use: [], avoid: [] };
	const workflow = workflowBody ? parseListItems(workflowBody) : [];
	const errors = errorBody ? parseListItems(errorBody) : [];
	const tests = testsBody
		? parseQuickTestsBody(testsBody)
		: { shouldTrigger: [], shouldNotTrigger: [], functional: [] };
	const references = referencesBody ? parseReferenceItems(referencesBody) : [];

	const hasWhenToUse = !!whenToUseBody;
	const hasWorkflow = !!workflowBody;
	const hasErrorHandling = !!errorBody;
	const hasQuickTests = !!testsBody;
	const hasReferences = !!referencesBody;

	const testCount =
		tests.shouldTrigger.length + tests.shouldNotTrigger.length + tests.functional.length;

	// Score calculation
	const score =
		(descriptionHasUseWhen ? 6 : 0) +
		(descriptionHasNegative ? 6 : 0) +
		Math.min(Math.floor(descriptionWordCount / 8), 5) +
		(hasWhenToUse ? 10 : 0) +
		(hasWorkflow ? 10 : 0) +
		(hasErrorHandling ? 10 : 0) +
		(hasQuickTests ? 10 : 0) +
		(hasReferences ? 10 : 0) +
		Math.min(whenToUse.use.length + whenToUse.avoid.length, 10) +
		Math.min(workflow.length, 8) * 2 +
		Math.min(errors.length, 6) * 2 +
		Math.min(testCount, 9) * 2 +
		Math.min(references.length, 10);

	return {
		score,
		wordCount: countWords(content),
		descriptionWordCount,
		descriptionHasUseWhen,
		descriptionHasNegative,
		hasWhenToUse,
		hasErrorHandling,
		hasQuickTests,
		hasReferences,
		hasWorkflow,
		useCount: whenToUse.use.length,
		avoidCount: whenToUse.avoid.length,
		workflowCount: workflow.length,
		errorCount: errors.length,
		testCount,
		referenceCount: references.length,
	};
};

// ── Build Functions ──────────────────────────────

const buildPlan = (args: {
	request: string;
	name?: string;
	purpose?: string;
	triggers?: string[];
	negativeTriggers?: string[];
	workflow?: string[];
	errorHandling?: string[];
	tests?: Partial<Tests>;
	references?: string[];
	constraints?: string[];
}) => {
	const triggers = normalizeList(args.triggers);
	const negativeTriggers = mergeLists(
		normalizeList(args.negativeTriggers),
		DEFAULT_NEGATIVE_TRIGGERS,
	);
	const workflow = normalizeList(args.workflow);
	const errorHandling = normalizeList(args.errorHandling);
	const tests = normalizeTests(args.tests);
	const references = normalizeList(args.references).map(normalizeFileName);
	const constraints = normalizeList(args.constraints);

	const name = buildSkillName(args.name, args.purpose ?? args.request);
	const purpose = (args.purpose ?? args.request).trim();

	const missing = [] as string[];
	if (!triggers.length) missing.push("triggers");
	if (!workflow.length) missing.push("workflow");
	if (!errorHandling.length) missing.push("errorHandling");
	if (!tests.shouldTrigger.length) missing.push("tests.shouldTrigger");
	if (!tests.shouldNotTrigger.length) missing.push("tests.shouldNotTrigger");

	const defaultsApplied = [] as string[];
	if (!args.negativeTriggers?.length) defaultsApplied.push("negativeTriggers");

	return {
		name,
		purpose,
		descriptionDraft: buildDescriptionDraft(purpose, triggers, negativeTriggers),
		triggers,
		negativeTriggers,
		workflow,
		errorHandling,
		tests,
		references,
		constraints,
		missing,
		defaultsApplied,
	};
};

const auditSkill = (args: { skillContent: string; description?: string; maxWords?: number }) => {
	const maxWords = args.maxWords ?? 2000;
	const combined = [args.description ?? "", args.skillContent].join("\n");
	const wordCount = countWords(args.skillContent);
	const checks = {
		hasWhenToUse:
			hasSection(args.skillContent, "When to Use Me") ||
			hasSection(args.skillContent, "When to Use"),
		hasNegativeTriggers: /do not use|should not trigger|do not trigger/i.test(combined),
		hasErrorHandling: hasSection(args.skillContent, "Error Handling"),
		hasQuickTests: hasSection(args.skillContent, "Quick Tests"),
		hasReferences: hasSection(args.skillContent, "References"),
		withinWordLimit: wordCount <= maxWords,
	};

	const warnings = [] as string[];
	if (!checks.withinWordLimit) {
		warnings.push(`Word count ${wordCount} exceeds ${maxWords}.`);
	}

	const missing = Object.entries(checks)
		.filter(([key, value]) => !value && key !== "withinWordLimit")
		.map(([key]) => key);

	return {
		wordCount,
		maxWords,
		checks,
		missing,
		warnings,
	};
};

const buildCreatePlan = (
	args: {
		request: string;
		name?: string;
		purpose?: string;
		triggers?: string[];
		negativeTriggers?: string[];
		workflow?: string[];
		errorHandling?: string[];
		tests?: Partial<Tests>;
		references?: string[];
		author?: string;
		version?: string;
		license?: string;
		baseDir?: string;
	},
	root: string,
) => {
	const plan = buildPlan(args);
	const baseDir = args.baseDir?.trim() || DEFAULT_BASE_DIR;
	const skillDir = ensureWithinRoot(root, path.join(baseDir, plan.name));
	const referencesDir = path.join(skillDir, "references");
	const author = args.author?.trim() || "unknown";
	const version = args.version?.trim() || DEFAULT_VERSION;
	const license = args.license?.trim() || DEFAULT_LICENSE;
	const skillContent = buildSkillMarkdown({
		name: plan.name,
		description: plan.descriptionDraft,
		author,
		version,
		license,
		triggers: plan.triggers,
		negativeTriggers: plan.negativeTriggers,
		workflow: plan.workflow,
		errorHandling: plan.errorHandling,
		tests: plan.tests,
		references: plan.references,
	});

	const writes: PlannedWrite[] = [
		{
			path: path.join(skillDir, "SKILL.md"),
			action: "create",
			content: skillContent,
		},
	];

	if (plan.references.length) {
		plan.references.forEach((reference) => {
			writes.push({
				path: path.join(referencesDir, reference),
				action: "create",
				content: buildReferenceStub(reference),
			});
		});

		const registryEntries = plan.references.map((reference) =>
			buildRegistryEntry(reference, new Date().toISOString()),
		);
		const registry = buildRegistry(registryEntries);
		writes.push({
			path: path.join(referencesDir, "registry.json"),
			action: "create",
			content: `${JSON.stringify(registry, null, 2)}\n`,
		});
	}

	return { plan, writes, skillDir };
};

const mergeRegistryEntries = (
	existing: {
		version?: string;
		created?: string;
		entries?: ReturnType<typeof buildRegistryEntry>[];
	} | null,
	references: string[],
) => {
	const timestamp = new Date().toISOString();
	const entries = existing?.entries ? [...existing.entries] : [];
	const entryMap = new Map(entries.map((entry) => [entry.filename, entry]));

	references.forEach((reference) => {
		const entry = buildRegistryEntry(reference, timestamp);
		const current = entryMap.get(reference);
		if (current) {
			entryMap.set(reference, {
				...current,
				...entry,
				created: current.created || entry.created,
			});
		} else {
			entryMap.set(reference, entry);
		}
	});

	return {
		version: existing?.version ?? "1.0.0",
		created: existing?.created ?? timestamp,
		last_updated: timestamp,
		registry_type: "reference_documents",
		entries: Array.from(entryMap.values()),
	};
};

const buildOptimizePlan = async (
	args: {
		skillDir: string;
		description?: string;
		triggers?: string[];
		negativeTriggers?: string[];
		workflow?: string[];
		errorHandling?: string[];
		tests?: Partial<Tests>;
		references?: string[];
		version?: string;
		replaceSections?: boolean;
		enforceQualityGate?: boolean;
		allowQualityDrop?: boolean;
		createMissingReferences?: boolean;
	},
	root: string,
) => {
	const skillDir = ensureWithinRoot(root, args.skillDir);
	const skillPath = path.join(skillDir, "SKILL.md");
	const current = await readTextFile(skillPath);
	if (!current) {
		throw new Error(`SKILL.md not found at ${skillPath}`);
	}

	const updatesApplied: string[] = [];
	const beforeMetrics = collectQualityMetrics(current);
	let updated = current;
	const frontmatter = updateFrontmatter(updated, args.description, args.version);
	updated = frontmatter.content;
	if (args.description) updatesApplied.push("description");
	if (args.version) updatesApplied.push("version");

	const triggers = normalizeList(args.triggers);
	const negatives = normalizeList(args.negativeTriggers);
	if (triggers.length || negatives.length) {
		const existingBody = getSectionBody(updated, "When to Use Me");
		const mergedBody = args.replaceSections
			? buildWhenToUseBody(triggers, negatives)
			: mergeWhenToUse(existingBody, triggers, negatives);
		updated = upsertSection(updated, "When to Use Me", mergedBody);
		updatesApplied.push("whenToUse");
	}

	const workflow = normalizeList(args.workflow);
	if (workflow.length) {
		const existingBody = getSectionBody(updated, "Workflow");
		const mergedBody = args.replaceSections
			? buildWorkflowBody(workflow)
			: mergeWorkflow(existingBody, workflow);
		updated = upsertSection(updated, "Workflow", mergedBody);
		updatesApplied.push("workflow");
	}

	const errorHandling = normalizeList(args.errorHandling);
	if (errorHandling.length) {
		const existingBody = getSectionBody(updated, "Error Handling");
		const mergedBody = args.replaceSections
			? buildErrorHandlingBody(errorHandling)
			: mergeErrorHandling(existingBody, errorHandling);
		updated = upsertSection(updated, "Error Handling", mergedBody);
		updatesApplied.push("errorHandling");
	}

	const tests = normalizeTests(args.tests);
	if (tests.shouldTrigger.length || tests.shouldNotTrigger.length || tests.functional.length) {
		const existingBody = getSectionBody(updated, "Quick Tests");
		const mergedBody = args.replaceSections
			? buildQuickTestsBody(tests)
			: mergeQuickTests(existingBody, tests);
		updated = upsertSection(updated, "Quick Tests", mergedBody);
		updatesApplied.push("quickTests");
	}

	const references = normalizeList(args.references).map(normalizeFileName);
	if (references.length) {
		const existingBody = getSectionBody(updated, "References");
		const mergedBody = args.replaceSections
			? buildReferencesBody(references)
			: mergeReferences(existingBody, references);
		updated = upsertSection(updated, "References", mergedBody);
		updatesApplied.push("references");
	}

	const afterMetrics = collectQualityMetrics(updated);
	const scoreDelta = afterMetrics.score - beforeMetrics.score;
	const qualityGateEnabled = args.enforceQualityGate && !args.allowQualityDrop;
	const qualityGatePassed = !qualityGateEnabled || scoreDelta >= 0;

	if (!qualityGatePassed) {
		throw new Error(
			`Quality gate blocked optimize: score dropped ${beforeMetrics.score} -> ${afterMetrics.score}`,
		);
	}

	const writes: PlannedWrite[] = [{ path: skillPath, action: "update", content: updated }];

	const referencesDir = path.join(skillDir, "references");
	const registryPath = path.join(referencesDir, "registry.json");

	if (references.length) {
		const registryText = await readTextFile(registryPath);
		const registry = registryText ? JSON.parse(registryText) : null;
		const mergedRegistry = mergeRegistryEntries(registry, references);
		writes.push({
			path: registryPath,
			action: registry ? "update" : "create",
			content: `${JSON.stringify(mergedRegistry, null, 2)}\n`,
		});
	}

	const missingReferences: string[] = [];
	if (references.length && args.createMissingReferences) {
		for (const reference of references) {
			const refPath = path.join(referencesDir, reference);
			const exists = await readTextFile(refPath);
			if (!exists) {
				missingReferences.push(reference);
				writes.push({
					path: refPath,
					action: "create",
					content: buildReferenceStub(reference),
				});
			}
		}
	}

	return {
		skillDir,
		beforeMetrics,
		afterMetrics,
		scoreDelta,
		qualityGate: {
			enabled: qualityGateEnabled,
			passed: qualityGatePassed,
		},
		writes,
		updatesApplied,
		missingReferences,
		beforeContent: current,
		afterContent: updated,
	};
};

const applyWrites = async (writes: PlannedWrite[], overwrite: boolean) => {
	for (const write of writes) {
		await writeFileSafe(write, overwrite);
	}
};

// ── Main Extension ───────────────────────────────

export default async function skillCreator(pi: ExtensionAPI) {
	// Root is obtained from ctx.cwd in each tool execution

	// ── skill-creator-plan Tool ──────────────────
	pi.registerTool({
		name: "skill-creator-plan",
		label: "Skill Creator: Plan",
		description:
			"Create a skill plan from a request without writing files. Use this to draft a structured skill specification.",
		parameters: Type.Object({
			request: Type.String({ description: "The skill request/description" }),
			name: Type.Optional(Type.String({ description: "Optional skill name (kebab-case)" })),
			purpose: Type.Optional(Type.String({ description: "Skill purpose/goal" })),
			triggers: Type.Optional(Type.Array(Type.String(), { description: "Trigger phrases" })),
			negativeTriggers: Type.Optional(
				Type.Array(Type.String(), { description: "Negative triggers" }),
			),
			workflow: Type.Optional(Type.Array(Type.String(), { description: "Workflow steps" })),
			errorHandling: Type.Optional(
				Type.Array(Type.String(), { description: "Error handling steps" }),
			),
			tests: Type.Optional(
				Type.Object({
					shouldTrigger: Type.Optional(Type.Array(Type.String())),
					shouldNotTrigger: Type.Optional(Type.Array(Type.String())),
					functional: Type.Optional(Type.Array(Type.String())),
				}),
			),
			references: Type.Optional(Type.Array(Type.String(), { description: "Reference files" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const root = ctx.cwd;
			try {
				const plan = buildPlan(params as Parameters<typeof buildPlan>[0]);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ success: true, data: plan }, null, 2),
						},
					],
					details: plan,
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

	// ── skill-creator-audit Tool ──────────────────
	pi.registerTool({
		name: "skill-creator-audit",
		label: "Skill Creator: Audit",
		description: "Audit SKILL.md content for best-practice signals and quality metrics.",
		parameters: Type.Object({
			skillContent: Type.String({
				description: "The SKILL.md content to audit",
			}),
			description: Type.Optional(Type.String({ description: "Optional skill description" })),
			maxWords: Type.Optional(Type.Number({ description: "Maximum word count (default 2000)" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const root = ctx.cwd;
			try {
				const audit = auditSkill(params as Parameters<typeof auditSkill>[0]);
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ success: true, data: audit }, null, 2),
						},
					],
					details: audit,
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

	// ── skill-creator-create Tool ─────────────────
	pi.registerTool({
		name: "skill-creator-create",
		label: "Skill Creator: Create",
		description: "Create a new skill skeleton with optional dry-run support.",
		parameters: Type.Object({
			request: Type.String({ description: "The skill request/description" }),
			name: Type.Optional(Type.String({ description: "Skill name (kebab-case)" })),
			purpose: Type.Optional(Type.String({ description: "Skill purpose" })),
			triggers: Type.Optional(Type.Array(Type.String(), { description: "Trigger phrases" })),
			negativeTriggers: Type.Optional(
				Type.Array(Type.String(), { description: "Negative triggers" }),
			),
			workflow: Type.Optional(Type.Array(Type.String(), { description: "Workflow steps" })),
			errorHandling: Type.Optional(Type.Array(Type.String(), { description: "Error handling" })),
			tests: Type.Optional(
				Type.Object({
					shouldTrigger: Type.Optional(Type.Array(Type.String())),
					shouldNotTrigger: Type.Optional(Type.Array(Type.String())),
					functional: Type.Optional(Type.Array(Type.String())),
				}),
			),
			references: Type.Optional(Type.Array(Type.String(), { description: "Reference files" })),
			author: Type.Optional(Type.String({ description: "Author name" })),
			version: Type.Optional(Type.String({ description: "Version (default 0.1.0)" })),
			license: Type.Optional(Type.String({ description: "License (default MIT)" })),
			baseDir: Type.Optional(Type.String({ description: "Base directory (default .pi/skills)" })),
			dryRun: Type.Optional(Type.Boolean({ description: "Dry-run mode (default true)" })),
			confirm: Type.Optional(Type.Boolean({ description: "Confirm and write files" })),
			overwrite: Type.Optional(Type.Boolean({ description: "Overwrite existing files" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const root = ctx.cwd;
			try {
				const dryRun = params.dryRun ?? true;
				const doConfirm = params.confirm ?? false;
				const shouldWrite = !dryRun || doConfirm;

				const { plan, writes, skillDir } = buildCreatePlan(
					params as Parameters<typeof buildCreatePlan>[0],
					root,
				);

				if (shouldWrite) {
					await applyWrites(writes, params.overwrite ?? false);
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									success: true,
									data: {
										dryRun,
										skillDir,
										plan,
										writes: writes.map((w) => ({
											path: w.path,
											action: w.action,
										})),
									},
								},
								null,
								2,
							),
						},
					],
					details: {
						dryRun,
						skillDir,
						writes: writes.map((w) => ({ path: w.path, action: w.action })),
					},
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

	// ── skill-creator-optimize Tool ───────────────
	pi.registerTool({
		name: "skill-creator-optimize",
		label: "Skill Creator: Optimize",
		description: "Optimize an existing SKILL.md with structured updates and quality gates.",
		parameters: Type.Object({
			skillDir: Type.String({
				description: "Path to skill directory (relative to project root)",
			}),
			description: Type.Optional(Type.String({ description: "Updated description" })),
			triggers: Type.Optional(Type.Array(Type.String(), { description: "Updated triggers" })),
			negativeTriggers: Type.Optional(
				Type.Array(Type.String(), { description: "Updated negative triggers" }),
			),
			workflow: Type.Optional(Type.Array(Type.String(), { description: "Updated workflow" })),
			errorHandling: Type.Optional(
				Type.Array(Type.String(), { description: "Updated error handling" }),
			),
			tests: Type.Optional(
				Type.Object({
					shouldTrigger: Type.Optional(Type.Array(Type.String())),
					shouldNotTrigger: Type.Optional(Type.Array(Type.String())),
					functional: Type.Optional(Type.Array(Type.String())),
				}),
			),
			references: Type.Optional(Type.Array(Type.String(), { description: "Updated references" })),
			version: Type.Optional(Type.String({ description: "Updated version" })),
			dryRun: Type.Optional(Type.Boolean({ description: "Dry-run mode (default true)" })),
			confirm: Type.Optional(Type.Boolean({ description: "Confirm and write changes" })),
			replaceSections: Type.Optional(
				Type.Boolean({ description: "Replace sections instead of merge" }),
			),
			enforceQualityGate: Type.Optional(Type.Boolean({ description: "Block if quality drops" })),
			allowQualityDrop: Type.Optional(Type.Boolean({ description: "Allow quality drop" })),
			createMissingReferences: Type.Optional(
				Type.Boolean({ description: "Create missing reference files" }),
			),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const root = ctx.cwd;
			try {
				const dryRun = params.dryRun ?? true;
				const doConfirm = params.confirm ?? false;
				const shouldWrite = !dryRun || doConfirm;

				const plan = await buildOptimizePlan(
					params as Parameters<typeof buildOptimizePlan>[0],
					root,
				);

				if (shouldWrite) {
					await applyWrites(plan.writes, true);
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(
								{
									success: true,
									data: {
										dryRun,
										skillDir: plan.skillDir,
										quality: {
											before: plan.beforeMetrics,
											after: plan.afterMetrics,
											scoreDelta: plan.scoreDelta,
											gate: plan.qualityGate,
										},
										updatesApplied: plan.updatesApplied,
										missingReferences: plan.missingReferences,
										writes: plan.writes.map((w) => ({
											path: w.path,
											action: w.action,
										})),
									},
								},
								null,
								2,
							),
						},
					],
					details: {
						dryRun,
						skillDir: plan.skillDir,
						quality: plan.qualityGate,
						updatesApplied: plan.updatesApplied,
					},
				};
			} catch (error) {
				return {
					content: [
						{
							type: "text" as const,
							text: `Error: ${(error as Error).message}`,
						},
					],
					details: { error: (error as Error).message },
				};
			}
		},
	});

}
