/**
 * Simple config schema for .pi/firm/config.json
 *
 * One client = one project = one config file.
 * Lives inside .pi/ (the Pi runtime layer) so it's never deleted.
 * Everything lives in the project.
 */
import { z } from "zod";

/**
 * Engagement types (determined by Request Analyst during intake).
 */
export const EngagementType = z.enum([
	"idea-shaping",
	"plan-review",
	"greenfield-build",
	"brownfield-adoption",
	"scoped-delivery",
	"rescue",
]);

/**
 * Client info — who the client is.
 */
export const ClientConfigSchema = z.object({
	display_name: z.string().min(1, "Client name is required"),
	language: z.string().default("en"),
	created: z.string().date(),
});

/**
 * Project info — what is being built.
 */
export const ProjectConfigSchema = z.object({
	name: z.string().min(1, "Project name is required"),
	description: z.string().default(""),
	stack: z.array(z.string()).default([]),
	created: z.string().date(),
	status: z.enum(["active", "paused", "completed", "archived"]).default("active"),
});

/**
 * Intake info — what happened during intake.
 */
export const IntakeConfigSchema = z.object({
	engagement_type: EngagementType.optional(),
	classified: z.boolean().default(false),
	next_office: z.string().optional(),
	completed: z.string().date().optional(),
});

/**
 * Full config schema for .pi/firm/config.json
 */
export const FirmConfigSchema = z.object({
	firm: z.object({
		version: z.literal(1),
	}),
	client: ClientConfigSchema,
	project: ProjectConfigSchema,
	intake: IntakeConfigSchema.default({}),
});

export type FirmConfig = z.infer<typeof FirmConfigSchema>;
export type ClientConfig = z.infer<typeof ClientConfigSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type IntakeConfig = z.infer<typeof IntakeConfigSchema>;
