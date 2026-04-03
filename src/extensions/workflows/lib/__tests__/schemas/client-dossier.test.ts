import { describe, expect, it } from "bun:test";
import { ClientDossierSchema } from "../../client-dossier.js";

describe("ClientDossierSchema", () => {
	const baseValidDossier = {
		dossier: { version: 1 as const },
		identity: {
			id: "firm-client-abc123",
			display_name: "Acme Corp",
			created: "2026-04-03",
			last_contact: "2026-04-03",
			source: "direct" as const,
			status: "active" as const,
		},
		profile: {
			skill_level: "intermediate" as const,
			known_stack: ["typescript", "node"],
			availability: "full-time" as const,
			bandwidth: "flexible" as const,
		},
		communication: {
			language: "en",
			response_language: "en",
			style: "direct" as const,
			accessibility: {
				needs: [],
				output_preferences: [],
			},
			mode: "collaborative" as const,
		},
		preferences: {
			quality_bar: "professional" as const,
			decision_velocity: "deliberate" as const,
			time_sensitivity: "normal" as const,
			success_criteria: ["clean code", "on time"],
			constraints: [],
			engagement_style: "structured" as const,
		},
		engagement_history: {
			current: {
				id: "eng-001",
				type: "greenfield-build" as const,
				status: "in_delivery" as const,
			},
			past: [],
		},
		patterns: {
			request_types: ["greenfield-build"],
			strengths: ["clear requirements"],
			watch_outs: ["scope creep"],
			distilled: ["prefers async communication"],
		},
	};

	describe("valid data", () => {
		it("parses a complete valid dossier with all sections filled", () => {
			const result = ClientDossierSchema.safeParse(baseValidDossier);
			expect(result.success).toBe(true);
		});

		it("parses a minimal dossier with only required fields", () => {
			const minimal = {
				dossier: { version: 1 as const },
				identity: {
					id: "firm-client-min123",
					display_name: "Min Corp",
					created: "2026-04-03",
					last_contact: "2026-04-03",
					source: "direct" as const,
					status: "active" as const,
				},
				profile: {
					skill_level: "beginner" as const,
					known_stack: ["python"],
					availability: "on-demand" as const,
					bandwidth: "limited" as const,
				},
				communication: {
					language: "nl",
					response_language: "nl",
					style: "concise" as const,
					accessibility: {
						needs: [],
						output_preferences: [],
					},
					mode: "advisory" as const,
				},
				preferences: {
					quality_bar: "prototype" as const,
					decision_velocity: "fast" as const,
					time_sensitivity: "low" as const,
					success_criteria: [],
					constraints: [],
					engagement_style: "minimal" as const,
				},
				engagement_history: {
					current: null,
					past: [],
				},
				patterns: {
					request_types: [],
					strengths: [],
					watch_outs: [],
					distilled: [],
				},
			};
			const result = ClientDossierSchema.safeParse(minimal);
			expect(result.success).toBe(true);
		});

		it("defaults profile.background to empty string when omitted", () => {
			const dossierWithoutBackground = {
				...baseValidDossier,
				profile: {
					...baseValidDossier.profile,
					background: undefined,
				},
			};
			const result = ClientDossierSchema.safeParse(dossierWithoutBackground);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.profile.background).toBe("");
			}
		});

		it("accepts null for engagement_history.current", () => {
			const dossierWithNullCurrent = {
				...baseValidDossier,
				engagement_history: {
					...baseValidDossier.engagement_history,
					current: null,
				},
			};
			const result = ClientDossierSchema.safeParse(dossierWithNullCurrent);
			expect(result.success).toBe(true);
		});
	});

	describe("invalid data", () => {
		it("fails when identity.id does not match firm-client-<alphanumeric> pattern", () => {
			const invalid = {
				...baseValidDossier,
				identity: {
					...baseValidDossier.identity,
					id: "bad-id",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when display_name is empty", () => {
			const invalid = {
				...baseValidDossier,
				identity: {
					...baseValidDossier.identity,
					display_name: "",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when known_stack is empty array", () => {
			const invalid = {
				...baseValidDossier,
				profile: {
					...baseValidDossier.profile,
					known_stack: [],
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when language code is not 2 characters", () => {
			const invalid = {
				...baseValidDossier,
				communication: {
					...baseValidDossier.communication,
					language: "eng",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when response_language code is not 2 characters", () => {
			const invalid = {
				...baseValidDossier,
				communication: {
					...baseValidDossier.communication,
					response_language: "English",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when created date is not a valid ISO date", () => {
			const invalid = {
				...baseValidDossier,
				identity: {
					...baseValidDossier.identity,
					created: "not-a-date",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when last_contact date is not a valid ISO date", () => {
			const invalid = {
				...baseValidDossier,
				identity: {
					...baseValidDossier.identity,
					last_contact: "yesterday",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when source is not a valid enum value", () => {
			const invalid = {
				...baseValidDossier,
				identity: {
					...baseValidDossier.identity,
					source: "organic",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when status is not a valid enum value", () => {
			const invalid = {
				...baseValidDossier,
				identity: {
					...baseValidDossier.identity,
					status: "inactive",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when skill_level is not a valid enum value", () => {
			const invalid = {
				...baseValidDossier,
				profile: {
					...baseValidDossier.profile,
					skill_level: "novice",
				},
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when dossier.version is not 1", () => {
			const invalid = {
				...baseValidDossier,
				dossier: { version: 2 as const },
			};
			const result = ClientDossierSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});
	});
});
