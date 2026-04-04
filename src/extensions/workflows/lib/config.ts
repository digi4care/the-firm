/**
 * FirmConfig — Eén schema voor .pi/firm/config.json
 *
 * Alles in één bestand. Schaalbaar:
 *   - Verticaal: minimaal bij intake, groeit naarmate we meer leren
 *   - Horizontaal: 1 client/N projects, N clients — optioneel ~/.pi/firm/clients.json later
 *
 * Levenscyclus:
 *   1. Intake: client.display_name + project.name = genoeg
 *   2. Classificatie: engagement.type en engagement.office worden ingevuld
 *   3. Delivery: client.profile, client.communication, project.technical_context groeien mee
 *   4. Afronding: engagement.status → completed, patterns vastgelegd
 *
 * Old schemas (removed): client-dossier.ts, project.ts
 */
import { z } from "zod";

// ── Enums ────────────────────────────────────────────────

export const EngagementType = z.enum([
	"idea-shaping",
	"plan-review",
	"greenfield-build",
	"brownfield-adoption",
	"scoped-delivery",
	"rescue",
]);

export const EngagementStatus = z.enum([
	"new",
	"clarifying",
	"classified",
	"staffing_pending",
	"approved",
	"in_delivery",
	"paused",
	"completed",
	"archived",
]);

export const ProjectStatus = z.enum(["active", "paused", "completed", "archived"]);

export const SkillLevel = z.enum(["beginner", "intermediate", "advanced", "expert"]);

export const CommunicationStyle = z.enum(["direct", "explanatory", "concise", "detailed"]);

export const QualityBar = z.enum(["prototype", "professional", "production"]);

// ── Client sectie ────────────────────────────────────────

export const ClientSchema = z
	.object({
		// Verplicht bij intake
		display_name: z.string().min(1, "Client name is required"),
		spoken_language: z.string().optional(),
		preferred_language: z.string().optional(),
		created: z.string().datetime({ offset: true }),

		// Backward compat: oud 'language' veld wordt gemigreerd
		language: z.string().optional(),

		// Optioneel — gevuld naarmate we meer leren
		profile: z
			.object({
				background: z.string().default(""),
				skill_level: SkillLevel.optional(),
				known_stack: z.array(z.string()).default([]),
			})
			.optional(),

		communication: z
			.object({
				style: CommunicationStyle.default("direct"),
				accessibility_needs: z.array(z.string()).default([]),
			})
			.optional(),

		preferences: z
			.object({
				quality_bar: QualityBar.optional(),
				success_criteria: z.array(z.string()).default([]),
				constraints: z.array(z.string()).default([]),
			})
			.optional(),

		patterns: z
			.object({
				strengths: z.array(z.string()).default([]),
				watch_outs: z.array(z.string()).default([]),
				learned: z.array(z.string()).default([]),
			})
			.optional(),
	})
	.transform((data) => {
		// Backward compat: migreer oud 'language' veld
		const hasLegacyLanguage = !!data.language;
		const spoken = data.spoken_language ?? (hasLegacyLanguage ? data.language : undefined) ?? "nl";
		const preferred =
			data.preferred_language ?? (hasLegacyLanguage ? data.language : undefined) ?? "nl";
		// Verwijder legacy veld
		const { language, ...rest } = data;
		return { ...rest, spoken_language: spoken, preferred_language: preferred };
	});

// ── Project sectie ───────────────────────────────────────

export const ProjectSchema = z.object({
	// Verplicht bij intake
	name: z.string().min(1, "Project name is required"),
	description: z.string().default(""),
	created: z.string().datetime({ offset: true }),
	status: ProjectStatus.default("active"),

	// Optioneel — beslissing voor architecture office
	stack: z.array(z.string()).default([]),

	// Optioneel — gevuld tijdens delivery
	technical_context: z
		.object({
			entry_point: z.string().optional(),
			architecture_type: z.string().optional(),
			repository_url: z.string().url().optional(),
			test_framework: z.string().optional(),
			ci_cd: z.string().optional(),
		})
		.optional(),
});

// ── Engagement sectie ────────────────────────────────────

export const EngagementSchema = z
	.object({
		type: EngagementType.optional(),
		status: EngagementStatus.default("new"),
		office: z.string().optional(), // welke office heeft het stokje
		classified: z.boolean().default(false),
		started: z.string().datetime({ offset: true }).optional(),
		completed: z.string().datetime({ offset: true }).optional(),
	})
	.default({ status: "new", classified: false });

// ── Full schema ──────────────────────────────────────────

export const FirmConfigSchema = z.object({
	firm: z.object({
		version: z.literal(1),
	}),
	client: ClientSchema,
	project: ProjectSchema,
	engagement: EngagementSchema,
});

// ── Types ────────────────────────────────────────────────

export type FirmConfig = z.infer<typeof FirmConfigSchema>;
export type ClientConfig = z.infer<typeof ClientSchema>;
export type ProjectConfig = z.infer<typeof ProjectSchema>;
export type EngagementConfig = z.infer<typeof EngagementSchema>;
