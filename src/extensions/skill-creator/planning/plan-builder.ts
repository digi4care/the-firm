/**
 * Core plan building functionality for skill creation
 */

import type { SkillPlan, Tests } from "../types.js";
import { mergeLists, normalizeList } from "../utils/lists.js";
import { toKebabCase } from "../utils/strings.js";

const DEFAULT_NEGATIVE_TRIGGERS = [
	"general programming questions",
	"installation or troubleshooting",
	"framework-agnostic code help",
];

const normalizeTests = (tests?: Partial<Tests>): Tests => ({
	shouldTrigger: normalizeList(tests?.shouldTrigger),
	shouldNotTrigger: normalizeList(tests?.shouldNotTrigger),
	functional: normalizeList(tests?.functional),
});

const buildSkillName = (name?: string, seed?: string): string => {
	const normalized = toKebabCase(name ?? "");
	if (normalized) return normalized;
	const derived = toKebabCase(seed ?? "");
	return derived || "new-skill";
};

const buildDescriptionDraft = (
	purpose: string,
	triggers: string[],
	negatives: string[],
): string => {
	const purposeText = purpose.trim() || "This skill helps with <purpose>";
	const whenText = triggers.length
		? `Use when: ${triggers.join("; ")}.`
		: "Use when: <add trigger phrases>.";
	const notText = negatives.length
		? `Do not trigger for: ${negatives.join("; ")}.`
		: "Do not trigger for: <add negative triggers>.";
	return `${purposeText} ${whenText} ${notText}`.replace(/\s+/g, " ").trim();
};

export interface BuildPlanArgs {
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
}

export const buildPlan = (args: BuildPlanArgs): SkillPlan => {
	const triggers = normalizeList(args.triggers);
	const negativeTriggers = mergeLists(
		normalizeList(args.negativeTriggers),
		DEFAULT_NEGATIVE_TRIGGERS,
	);
	const workflow = normalizeList(args.workflow);
	const errorHandling = normalizeList(args.errorHandling);
	const tests = normalizeTests(args.tests);
	const references = normalizeList(args.references).map((r) =>
		r.replace(/\.mdx?$/i, "").trim() ? `${r.replace(/\.mdx?$/i, "").trim()}.md` : "reference.md",
	);
	const constraints = normalizeList(args.constraints);

	const name = buildSkillName(args.name, args.purpose ?? args.request);
	const purpose = (args.purpose ?? args.request).trim();

	const missing: string[] = [];
	if (!triggers.length) missing.push("triggers");
	if (!workflow.length) missing.push("workflow");
	if (!errorHandling.length) missing.push("errorHandling");
	if (!tests.shouldTrigger.length) missing.push("tests.shouldTrigger");
	if (!tests.shouldNotTrigger.length) missing.push("tests.shouldNotTrigger");

	const defaultsApplied: string[] = [];
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
