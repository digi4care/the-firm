import { describe, expect, it } from "bun:test";
import { ProjectConfigSchema } from "../../project.js";

describe("ProjectConfigSchema", () => {
	const baseValidProject = {
		project: { version: 1 as const },
		identity: {
			id: "firm-project-abc123",
			name: "Website Redesign",
			description: "Complete overhaul of the corporate website",
			client_id: "firm-client-xyz789",
			created: "2026-04-03",
			status: "active" as const,
		},
		technical_context: {
			stack: ["typescript", "sveltekit", "tailwind"],
			entry_point: "src/index.ts",
			architecture_type: "spa",
			repository_url: "https://github.com/example/project",
			test_framework: "vitest",
			ci_cd: "github-actions",
		},
		current_engagement: {
			id: "eng-001",
			type: "greenfield-build" as const,
			status: "in_delivery" as const,
			started: "2026-04-01",
		},
		constraints: {
			additional: ["must use existing auth"],
			excluded: ["no-php"],
		},
	};

	describe("valid data", () => {
		it("parses a complete valid project config", () => {
			const result = ProjectConfigSchema.safeParse(baseValidProject);
			expect(result.success).toBe(true);
		});

		it("parses a minimal project with only required fields", () => {
			const minimal = {
				project: { version: 1 as const },
				identity: {
					id: "firm-project-min456",
					name: "Minimal Project",
					description: "A minimal project config",
					client_id: "firm-client-min123",
					created: "2026-04-03",
					status: "paused" as const,
				},
				technical_context: {
					stack: ["python"],
				},
				current_engagement: null,
				constraints: {
					additional: [],
					excluded: [],
				},
			};
			const result = ProjectConfigSchema.safeParse(minimal);
			expect(result.success).toBe(true);
		});

		it("accepts null for current_engagement", () => {
			const projectWithNullEngagement = {
				...baseValidProject,
				current_engagement: null,
			};
			const result = ProjectConfigSchema.safeParse(projectWithNullEngagement);
			expect(result.success).toBe(true);
		});

		it("accepts project without optional technical_context fields", () => {
			const projectWithoutOptionals = {
				...baseValidProject,
				technical_context: {
					stack: ["rust"],
					// entry_point, architecture_type, repository_url omitted
				},
			};
			const result = ProjectConfigSchema.safeParse(projectWithoutOptionals);
			expect(result.success).toBe(true);
		});

		it("accepts project with empty constraint arrays", () => {
			const projectWithEmptyConstraints = {
				...baseValidProject,
				constraints: {
					additional: [],
					excluded: [],
				},
			};
			const result = ProjectConfigSchema.safeParse(projectWithEmptyConstraints);
			expect(result.success).toBe(true);
		});

		it("accepts all valid project status values", () => {
			const statuses = ["active", "paused", "completed", "archived"] as const;
			for (const status of statuses) {
				const project = {
					...baseValidProject,
					identity: {
						...baseValidProject.identity,
						status,
					},
				};
				const result = ProjectConfigSchema.safeParse(project);
				expect(result.success).toBe(true);
			}
		});
	});

	describe("invalid data", () => {
		it("fails when identity.id does not match firm-project-<alphanumeric> pattern", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					id: "bad-id",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when identity.id has wrong prefix", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					id: "firm-client-abc123",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when name is empty", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					name: "",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when description is empty", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					description: "",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when client_id does not match firm-client-<alphanumeric> pattern", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					client_id: "client-1",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when client_id is missing firm- prefix", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					client_id: "client-abc123",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when stack is empty array", () => {
			const invalid = {
				...baseValidProject,
				technical_context: {
					...baseValidProject.technical_context,
					stack: [],
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when created date is not a valid ISO date", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					created: "not-a-date",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when project.version is not 1", () => {
			const invalid = {
				...baseValidProject,
				project: { version: 2 as const },
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when status is not a valid enum value", () => {
			const invalid = {
				...baseValidProject,
				identity: {
					...baseValidProject.identity,
					status: "pending",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when current_engagement.type is not a valid enum value", () => {
			const invalid = {
				...baseValidProject,
				current_engagement: {
					...baseValidProject.current_engagement,
					type: "development",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when current_engagement.status is not a valid enum value", () => {
			const invalid = {
				...baseValidProject,
				current_engagement: {
					...baseValidProject.current_engagement,
					status: "ongoing",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});

		it("fails when repository_url is not a valid URL", () => {
			const invalid = {
				...baseValidProject,
				technical_context: {
					...baseValidProject.technical_context,
					repository_url: "not-a-url",
				},
			};
			const result = ProjectConfigSchema.safeParse(invalid);
			expect(result.success).toBe(false);
		});
	});
});
