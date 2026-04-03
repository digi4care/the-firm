/**
 * Project Config Schema — Project level
 *
 * Lives at: ./.firm/project.yml
 *
 * This is the project-level configuration. It references a global client dossier
 * and contains everything specific to this project: stack, architecture, engagement
 * state, and project-level overrides.
 *
 * Relationship: belongs to one client (referenced by client_id).
 */
import { z } from "zod";
import { EngagementStatus, EngagementType } from "./client-dossier.js";

// --- Enums ---

export const ProjectStatus = z.enum(["active", "paused", "completed", "archived"]);

// --- Schema ---

/**
 * Project identity and metadata.
 */
export const ProjectIdentitySchema = z.object({
	id: z
		.string()
		.regex(
			/^firm-project-[a-z0-9]+$/,
			"Project ID must match pattern: firm-project-<alphanumeric>",
		),
	name: z.string().min(1),
	description: z.string().min(1),
	client_id: z.string().regex(/^firm-client-[a-z0-9]+$/, "Must reference a valid client ID"),
	created: z.string().date(),
	status: ProjectStatus,
});

/**
 * Technical context for this project.
 * These are engagement-specific details that don't belong in the client dossier.
 */
export const TechnicalContextSchema = z.object({
	stack: z.array(z.string()).min(1),
	entry_point: z.string().optional(),
	architecture_type: z.string().optional(),
	repository_url: z.string().url().optional(),
	test_framework: z.string().optional(),
	ci_cd: z.string().optional(),
});

/**
 * Current engagement state within this project.
 * Nullable — a project can exist without an active engagement.
 */
export const CurrentEngagementSchema = z
	.object({
		id: z.string(),
		type: EngagementType,
		status: EngagementStatus,
		started: z.string().date(),
	})
	.nullable();

/**
 * Project-level constraint overrides.
 * These extend (not replace) client-level constraints.
 */
export const ProjectConstraintsSchema = z.object({
	additional: z.array(z.string()),
	excluded: z.array(z.string()),
});

/**
 * Full project config schema.
 */
export const ProjectConfigSchema = z.object({
	project: z.object({
		version: z.literal(1),
	}),
	identity: ProjectIdentitySchema,
	technical_context: TechnicalContextSchema,
	current_engagement: CurrentEngagementSchema,
	constraints: ProjectConstraintsSchema,
});

// --- Inferred types ---

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type ProjectIdentity = z.infer<typeof ProjectIdentitySchema>;
export type TechnicalContext = z.infer<typeof TechnicalContextSchema>;
export type CurrentEngagement = z.infer<typeof CurrentEngagementSchema>;
export type ProjectConstraints = z.infer<typeof ProjectConstraintsSchema>;
