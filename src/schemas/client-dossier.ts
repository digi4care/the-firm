/**
 * Client Dossier Schema — Global level
 *
 * Lives at: ~/.firm/clients/<client-id>/client-dossier.yml
 *
 * This is the CRM-level record for a client. It contains who they are,
 * how to communicate with them, what they expect, and what we've learned.
 * It does NOT contain project-specific technical details — those live in
 * the project config (./.firm/project.yml).
 *
 * Relationship: Client 1:N Projects
 */
import { z } from "zod";

// --- Enums ---

export const ClientSource = z.enum(["direct", "referral", "rescue"]);
export const ClientStatus = z.enum(["active", "dormant", "archived"]);
export const SkillLevel = z.enum(["beginner", "intermediate", "advanced", "expert"]);
export const Availability = z.enum(["full-time", "evenings-and-weekends", "on-demand"]);
export const Bandwidth = z.enum(["unlimited", "flexible", "limited", "constrained"]);
export const CommunicationStyle = z.enum(["direct", "explanatory", "concise", "detailed"]);
export const EngagementMode = z.enum(["collaborative", "directed", "advisory"]);
export const QualityBar = z.enum(["prototype", "professional", "production"]);
export const DecisionVelocity = z.enum(["fast", "deliberate", "slow"]);
export const TimeSensitivity = z.enum(["low", "normal", "high", "critical"]);
export const EngagementStyle = z.enum(["structured", "flexible", "minimal"]);

// --- Section schemas ---

/**
 * Section 1: Identity
 * Who this client is. Immutable after creation except for last_contact and status.
 */
export const IdentitySchema = z.object({
	id: z
		.string()
		.regex(/^firm-client-[a-z0-9]+$/, "Client ID must match pattern: firm-client-<alphanumeric>"),
	display_name: z.string().min(1),
	created: z.string().date(),
	last_contact: z.string().date(),
	source: ClientSource,
	status: ClientStatus,
});

/**
 * Section 2: Profile
 * What kind of developer they are and when they work.
 */
export const ProfileSchema = z.object({
	background: z.string().min(1),
	skill_level: SkillLevel,
	known_stack: z.array(z.string()).min(1),
	availability: Availability,
	bandwidth: Bandwidth,
});

/**
 * Section 3: Communication
 * How to talk to them and how they interact with The Firm.
 */
export const CommunicationSchema = z.object({
	language: z.string().regex(/^[a-z]{2}$/, "ISO 639-1 language code (e.g. 'nl', 'en')"),
	response_language: z.string().regex(/^[a-z]{2}$/, "ISO 639-1 language code (e.g. 'nl', 'en')"),
	style: CommunicationStyle,
	accessibility: z.object({
		needs: z.array(z.string()),
		output_preferences: z.array(z.string()),
	}),
	mode: EngagementMode,
});

/**
 * Section 4: Preferences
 * What they want from The Firm and how they define success.
 */
export const PreferencesSchema = z.object({
	quality_bar: QualityBar,
	decision_velocity: DecisionVelocity,
	time_sensitivity: TimeSensitivity,
	success_criteria: z.array(z.string()),
	constraints: z.array(z.string()),
	engagement_style: EngagementStyle,
});

/**
 * Engagement outcome values (defined here for self-containment).
 */
export const EngagementOutcome = z.enum(["completed", "paused", "cancelled"]);

/**
 * Engagement types from the Client Engagement Model.
 */
export const EngagementType = z.enum([
	"idea-shaping",
	"plan-review",
	"plan-optimization",
	"greenfield-build",
	"brownfield-adoption",
	"scoped-delivery",
	"rescue",
]);

/**
 * Engagement status during lifecycle.
 */
export const EngagementStatus = z.enum([
	"new",
	"clarifying",
	"classified",
	"staffing_pending",
	"approved",
	"in_delivery",
	"paused",
	"closed",
]);

/**
 * Section 5: Engagement history
 * What we've done together. Append-only.
 */
export const EngagementHistorySchema = z.object({
	current: z
		.object({
			id: z.string(),
			type: EngagementType,
			status: EngagementStatus,
		})
		.nullable(),
	past: z.array(
		z.object({
			id: z.string(),
			type: EngagementType,
			date: z.string().date(),
			outcome: EngagementOutcome,
			summary: z.string(),
		}),
	),
});

/**
 * Section 6: Patterns
 * What we've learned about working with this client.
 */
export const PatternsSchema = z.object({
	request_types: z.array(EngagementType),
	strengths: z.array(z.string()),
	watch_outs: z.array(z.string()),
	distilled: z.array(z.string()),
});

// --- Full dossier schema ---

export const ClientDossierSchema = z.object({
	dossier: z.object({
		version: z.literal(1),
	}),
	identity: IdentitySchema,
	profile: ProfileSchema,
	communication: CommunicationSchema,
	preferences: PreferencesSchema,
	engagement_history: EngagementHistorySchema,
	patterns: PatternsSchema,
});

// --- Inferred types ---

export type ClientDossier = z.infer<typeof ClientDossierSchema>;
export type Identity = z.infer<typeof IdentitySchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type Communication = z.infer<typeof CommunicationSchema>;
export type Preferences = z.infer<typeof PreferencesSchema>;
export type EngagementHistory = z.infer<typeof EngagementHistorySchema>;
export type Patterns = z.infer<typeof PatternsSchema>;
