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

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { applyWrites } from "./io/file-writer.js";
import { auditSkill, collectQualityMetrics } from "./planning/audit.js";
import { buildCreatePlan } from "./planning/create-planner.js";
import { buildOptimizePlan } from "./planning/optimize-planner.js";
import { buildPlan } from "./planning/plan-builder.js";

// Re-export types for consumers
export type {
	AuditResult,
	CreatePlanResult,
	OptimizePlanResult,
	PlannedWrite,
	QualityMetrics,
	Registry,
	RegistryEntry,
	SkillPlan,
	Tests,
} from "./types.js";

export { auditSkill, buildCreatePlan, buildOptimizePlan, buildPlan, collectQualityMetrics };

export default async function skillCreator(pi: ExtensionAPI) {
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
			const _root = ctx.cwd;
			try {
				const plan = buildPlan(params as Parameters<typeof buildPlan>[0]);
				return {
					content: [
						{ type: "text" as const, text: JSON.stringify({ success: true, data: plan }, null, 2) },
					],
					details: plan,
				};
			} catch (error) {
				return {
					content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
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
			skillContent: Type.String({ description: "The SKILL.md content to audit" }),
			description: Type.Optional(Type.String({ description: "Optional skill description" })),
			maxWords: Type.Optional(Type.Number({ description: "Maximum word count (default 2000)" })),
		}),

		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const _root = ctx.cwd;
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
					content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
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
										writes: writes.map((w) => ({ path: w.path, action: w.action })),
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
					content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
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
			skillDir: Type.String({ description: "Path to skill directory (relative to project root)" }),
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
										writes: plan.writes.map((w) => ({ path: w.path, action: w.action })),
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
					content: [{ type: "text" as const, text: `Error: ${(error as Error).message}` }],
					details: { error: (error as Error).message },
				};
			}
		},
	});
}
