/**
 * Create planner for building new skills
 */

import path from "node:path";
import { ensureWithinRoot } from "../io/path-guards.js";
import { buildRegistry, buildRegistryEntry } from "../io/registry.js";
import { buildReferenceStub, buildSkillMarkdown } from "../markdown/builder.js";
import type { CreatePlanResult, PlannedWrite } from "../types.js";
import { buildPlan } from "./plan-builder.js";

const DEFAULT_VERSION = "0.1.0";
const DEFAULT_LICENSE = "MIT";
const DEFAULT_BASE_DIR = ".pi/skills";

export interface BuildCreatePlanArgs {
	request: string;
	name?: string;
	purpose?: string;
	triggers?: string[];
	negativeTriggers?: string[];
	workflow?: string[];
	errorHandling?: string[];
	tests?: Partial<{
		shouldTrigger?: string[];
		shouldNotTrigger?: string[];
		functional?: string[];
	}>;
	references?: string[];
	author?: string;
	version?: string;
	license?: string;
	baseDir?: string;
}

export const buildCreatePlan = (args: BuildCreatePlanArgs, root: string): CreatePlanResult => {
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
		for (const reference of plan.references) {
			writes.push({
				path: path.join(referencesDir, reference),
				action: "create",
				content: buildReferenceStub(reference),
			});
		}

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
