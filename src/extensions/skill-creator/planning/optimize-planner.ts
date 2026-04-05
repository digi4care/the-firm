/**
 * Optimize planner for updating existing skills
 */

import path from "node:path";
import { readTextFile } from "../io/file-writer.js";
import { ensureWithinRoot } from "../io/path-guards.js";
import { mergeRegistryEntries } from "../io/registry.js";
import { updateFrontmatter } from "../markdown/frontmatter.js";
import { getSectionBody } from "../markdown/parsers.js";
import {
	buildErrorHandlingBody,
	buildQuickTestsBody,
	buildReferencesBody,
	buildWhenToUseBody,
	buildWorkflowBody,
} from "../markdown/sections.js";
import type { OptimizePlanResult, PlannedWrite, Tests } from "../types.js";
import { normalizeList } from "../utils/lists.js";
import { collectQualityMetrics } from "./audit.js";

const parseWhenToUseBody = (body: string): { use: string[]; avoid: string[] } => {
	const lines = body.split("\n");
	let mode: "use" | "avoid" | null = null;
	const use: string[] = [];
	const avoid: string[] = [];

	for (const line of lines) {
		if (/^\s*use me when:/i.test(line)) {
			mode = "use";
			continue;
		}
		if (/^\s*do not use me for:/i.test(line)) {
			mode = "avoid";
			continue;
		}
		const item = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim();
		if (!item || item.startsWith("<add ")) continue;
		if (mode === "use") use.push(item);
		if (mode === "avoid") avoid.push(item);
	}
	return { use, avoid };
};

const parseListItems = (body: string): string[] =>
	body
		.split("\n")
		.map((line) => line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim())
		.filter((line) => !!line && !line.startsWith("<add "));

const parseQuickTestsBody = (body: string): Tests => {
	const lines = body.split("\n");
	let mode: "trigger" | "not" | "functional" | null = null;
	const tests: Tests = { shouldTrigger: [], shouldNotTrigger: [], functional: [] };

	for (const line of lines) {
		if (/^\s*should trigger:/i.test(line)) {
			mode = "trigger";
			continue;
		}
		if (/^\s*should not trigger:/i.test(line)) {
			mode = "not";
			continue;
		}
		if (/^\s*functional:/i.test(line)) {
			mode = "functional";
			continue;
		}
		const item = line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim();
		if (!item || item.startsWith("<add ")) continue;
		if (mode === "trigger") tests.shouldTrigger.push(item);
		if (mode === "not") tests.shouldNotTrigger.push(item);
		if (mode === "functional") tests.functional.push(item);
	}
	return tests;
};

const parseReferenceItems = (body: string): string[] => {
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

const mergeLists = (primary: string[], fallback: string[]): string[] => {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const item of [...primary, ...fallback]) {
		const normalized = item
			.trim()
			.toLowerCase()
			.replace(/[.!?]+$/, "");
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		result.push(item.trim());
	}
	return result;
};

const upsertSection = (content: string, title: string, body: string): string => {
	const section = `## ${title}\n\n${body}`.trim();
	const pattern = new RegExp(
		`(^|\\n)##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b[\\s\\S]*?(?=\\n##\\s+|$)`,
		"i",
	);
	if (pattern.test(content)) {
		return content.replace(pattern, `\n${section}\n`);
	}
	return `${content.trim()}\n\n${section}\n`;
};

export interface BuildOptimizePlanArgs {
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
}

export const buildOptimizePlan = async (
	args: BuildOptimizePlanArgs,
	root: string,
): Promise<OptimizePlanResult> => {
	const skillDir = ensureWithinRoot(root, args.skillDir);
	const skillPath = path.join(skillDir, "SKILL.md");
	const current = await readTextFile(skillPath);
	if (!current) {
		throw new Error(`SKILL.md not found at ${skillPath}`);
	}

	const beforeMetrics = collectQualityMetrics(current);
	let updated = current;
	const updatesApplied: string[] = [];

	const frontmatter = updateFrontmatter(updated, args.description, args.version);
	updated = frontmatter.content;
	if (args.description) updatesApplied.push("description");
	if (args.version) updatesApplied.push("version");

	const triggers = normalizeList(args.triggers);
	const negatives = normalizeList(args.negativeTriggers);
	if (triggers.length || negatives.length) {
		const existingBody = getSectionBody(updated, "When to Use Me");
		const parsed = existingBody ? parseWhenToUseBody(existingBody) : { use: [], avoid: [] };
		const use = args.replaceSections ? triggers : mergeLists(parsed.use, triggers);
		const avoid = args.replaceSections ? negatives : mergeLists(parsed.avoid, negatives);
		const mergedBody = buildWhenToUseBody(use, avoid);
		updated = upsertSection(updated, "When to Use Me", mergedBody);
		updatesApplied.push("whenToUse");
	}

	const workflow = normalizeList(args.workflow);
	if (workflow.length) {
		const existingBody = getSectionBody(updated, "Workflow");
		const existing = existingBody ? parseListItems(existingBody) : [];
		const merged = args.replaceSections ? workflow : mergeLists(existing, workflow);
		updated = upsertSection(updated, "Workflow", buildWorkflowBody(merged));
		updatesApplied.push("workflow");
	}

	const errorHandling = normalizeList(args.errorHandling);
	if (errorHandling.length) {
		const existingBody = getSectionBody(updated, "Error Handling");
		const existing = existingBody ? parseListItems(existingBody) : [];
		const merged = args.replaceSections ? errorHandling : mergeLists(existing, errorHandling);
		updated = upsertSection(updated, "Error Handling", buildErrorHandlingBody(merged));
		updatesApplied.push("errorHandling");
	}

	const tests = {
		shouldTrigger: normalizeList(args.tests?.shouldTrigger),
		shouldNotTrigger: normalizeList(args.tests?.shouldNotTrigger),
		functional: normalizeList(args.tests?.functional),
	};
	if (tests.shouldTrigger.length || tests.shouldNotTrigger.length || tests.functional.length) {
		const existingBody = getSectionBody(updated, "Quick Tests");
		const parsed = existingBody
			? parseQuickTestsBody(existingBody)
			: { shouldTrigger: [], shouldNotTrigger: [], functional: [] };
		const merged: Tests = {
			shouldTrigger: args.replaceSections
				? tests.shouldTrigger
				: mergeLists(parsed.shouldTrigger, tests.shouldTrigger),
			shouldNotTrigger: args.replaceSections
				? tests.shouldNotTrigger
				: mergeLists(parsed.shouldNotTrigger, tests.shouldNotTrigger),
			functional: args.replaceSections
				? tests.functional
				: mergeLists(parsed.functional, tests.functional),
		};
		updated = upsertSection(updated, "Quick Tests", buildQuickTestsBody(merged));
		updatesApplied.push("quickTests");
	}

	const references = normalizeList(args.references).map((r) => (r.endsWith(".md") ? r : `${r}.md`));
	if (references.length) {
		const existingBody = getSectionBody(updated, "References");
		const existing = existingBody ? parseReferenceItems(existingBody) : [];
		const merged = args.replaceSections ? references : mergeLists(existing, references);
		updated = upsertSection(updated, "References", buildReferencesBody(merged));
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
					content: `# ${reference.replace(".md", "")}\n\n<add content here>\n`,
				});
			}
		}
	}

	return {
		skillDir,
		beforeMetrics,
		afterMetrics,
		scoreDelta,
		qualityGate: { enabled: qualityGateEnabled, passed: qualityGatePassed },
		writes,
		updatesApplied,
		missingReferences,
		beforeContent: current,
		afterContent: updated,
	};
};
