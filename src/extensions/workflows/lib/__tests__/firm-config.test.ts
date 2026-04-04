import { describe, expect, test } from "bun:test";
import {
	ClientSchema,
	EngagementStatus,
	EngagementType,
	FirmConfigSchema,
	FirmState,
	ProjectSchema,
} from "../config.js";

// ── Helpers ─────────────────────────────────────────────

const now = new Date().toISOString();

const minimalConfig = {
	firm: { version: 1 },
	client: { display_name: "Chris", created: now },
	project: { name: "the-firm", created: now },
};

const fullConfig = {
	firm: { version: 1 },
	client: {
		display_name: "Chris",
		spoken_language: "nl",
		preferred_language: "en",
		created: now,
		profile: {
			background: "MBO/HBO developer",
			skill_level: "intermediate",
			known_stack: ["typescript", "svelte"],
		},
		communication: {
			style: "direct",
			accessibility_needs: ["dyslexia: focus on meaning not spelling"],
		},
		preferences: {
			quality_bar: "production",
			success_criteria: ["working software", "clean code"],
			constraints: ["no over-engineering"],
		},
		patterns: {
			strengths: ["clear vision", "pragmatic"],
			watch_outs: ["typo's in instructions"],
			learned: ["keep it simple"],
		},
	},
	project: {
		name: "the-firm",
		description: "Engineering OS for AI-assisted development",
		created: now,
		status: "active",
		stack: ["bun", "typescript", "zod"],
		technical_context: {
			architecture_type: "monorepo",
			test_framework: "bun:test",
		},
	},
	engagement: {
		type: "greenfield-build",
		status: "in_delivery",
		office: "engineering",
		classified: true,
		started: now,
	},
};

// ── FirmConfigSchema ─────────────────────────────────────

describe("FirmConfigSchema", () => {
	test("parses minimal config (intake just started)", () => {
		const result = FirmConfigSchema.parse(minimalConfig);
		expect(result.client.display_name).toBe("Chris");
		expect(result.project.name).toBe("the-firm");
		expect(result.project.stack).toEqual([]);
		expect(result.engagement.status).toBe("new");
	});

	test("parses full config (everything filled in)", () => {
		const result = FirmConfigSchema.parse(fullConfig);
		expect(result.client.profile?.skill_level).toBe("intermediate");
		expect(result.client.spoken_language).toBe("nl");
		expect(result.client.preferred_language).toBe("en");
		expect(result.project.technical_context?.architecture_type).toBe("monorepo");
		expect(result.engagement.type).toBe("greenfield-build");
	});

	test("defaults engagement to empty object", () => {
		const config = {
			firm: { version: 1 },
			client: { display_name: "Test", created: now },
			project: { name: "test", created: now },
		};
		const result = FirmConfigSchema.parse(config);
		expect(result.engagement.status).toBe("new");
		expect(result.engagement.classified).toBe(false);
	});

	test("defaults project description to empty string", () => {
		const result = FirmConfigSchema.parse(minimalConfig);
		expect(result.project.description).toBe("");
	});

	test("defaults spoken_language and preferred_language to nl", () => {
		const result = FirmConfigSchema.parse(minimalConfig);
		expect(result.client.spoken_language).toBe("nl");
		expect(result.client.preferred_language).toBe("nl");
	});

	test("rejects missing client name", () => {
		expect(() =>
			FirmConfigSchema.parse({
				firm: { version: 1 },
				client: { created: now },
				project: { name: "test", created: now },
			}),
		).toThrow();
	});

	test("rejects missing project name", () => {
		expect(() =>
			FirmConfigSchema.parse({
				firm: { version: 1 },
				client: { display_name: "Chris", created: now },
				project: { created: now },
			}),
		).toThrow();
	});

	test("rejects wrong version", () => {
		expect(() =>
			FirmConfigSchema.parse({
				firm: { version: 2 },
				client: { display_name: "Chris", created: now },
				project: { name: "test", created: now },
			}),
		).toThrow();
	});

	test("backward compat: old 'language' migrates to spoken_language and preferred_language", () => {
		const result = FirmConfigSchema.parse({
			firm: { version: 1 },
			client: { display_name: "Legacy", language: "en", created: now },
			project: { name: "test", created: now },
		});
		expect(result.client.spoken_language).toBe("en");
		expect(result.client.preferred_language).toBe("en");
	});

	test("spoken and preferred language can differ", () => {
		const result = FirmConfigSchema.parse({
			firm: { version: 1 },
			client: {
				display_name: "Bilingual",
				spoken_language: "nl",
				preferred_language: "en",
				created: now,
			},
			project: { name: "test", created: now },
		});
		expect(result.client.spoken_language).toBe("nl");
		expect(result.client.preferred_language).toBe("en");
	});
});

// ── EngagementType enum ──────────────────────────────────

describe("EngagementType", () => {
	test("accepts valid types", () => {
		for (const type of [
			"idea-shaping",
			"plan-review",
			"greenfield-build",
			"brownfield-adoption",
			"scoped-delivery",
			"rescue",
		]) {
			expect(EngagementType.parse(type)).toBe(type);
		}
	});

	test("rejects invalid type", () => {
		expect(() => EngagementType.parse("invalid")).toThrow();
	});
});

// ── EngagementStatus lifecycle ───────────────────────────

describe("EngagementStatus lifecycle", () => {
	test("accepts all valid statuses", () => {
		const statuses = [
			"new",
			"clarifying",
			"classified",
			"staffing_pending",
			"approved",
			"in_delivery",
			"paused",
			"completed",
			"archived",
		];
		for (const status of statuses) {
			expect(EngagementStatus.parse(status)).toBe(status);
		}
	});
});

// ── FirmState enum ──────────────────────────────────────

describe("FirmState", () => {
	test("accepts active", () => {
		expect(FirmState.parse("active")).toBe("active");
	});

	test("accepts paused", () => {
		expect(FirmState.parse("paused")).toBe("paused");
	});

	test("rejects invalid state", () => {
		expect(() => FirmState.parse("idle")).toThrow();
	});
});

describe("FirmConfigSchema firmState", () => {
	test("defaults to undefined when missing", () => {
		const result = FirmConfigSchema.parse(minimalConfig);
		expect(result.firmState).toBeUndefined();
	});

	test("accepts firmState: active", () => {
		const result = FirmConfigSchema.parse({ ...minimalConfig, firmState: "active" });
		expect(result.firmState).toBe("active");
	});

	test("accepts firmState: paused", () => {
		const result = FirmConfigSchema.parse({ ...minimalConfig, firmState: "paused" });
		expect(result.firmState).toBe("paused");
	});

	test("rejects invalid firmState", () => {
		expect(() => FirmConfigSchema.parse({ ...minimalConfig, firmState: "idle" })).toThrow();
	});
});

// ── Optional sections grow over time ─────────────────────

describe("Progressive disclosure", () => {
	test("client without optional sections", () => {
		const client = ClientSchema.parse({ display_name: "Chris", created: now });
		expect(client.profile).toBeUndefined();
		expect(client.communication).toBeUndefined();
		expect(client.preferences).toBeUndefined();
		expect(client.patterns).toBeUndefined();
		expect(client.spoken_language).toBe("nl");
		expect(client.preferred_language).toBe("nl");
	});

	test("client with profile added later", () => {
		const client = ClientSchema.parse({
			display_name: "Chris",
			created: now,
			profile: { background: "Developer", known_stack: ["ts"] },
		});
		expect(client.profile?.background).toBe("Developer");
		expect(client.profile?.skill_level).toBeUndefined();
	});

	test("project without technical_context", () => {
		const project = ProjectSchema.parse({ name: "test", created: now });
		expect(project.technical_context).toBeUndefined();
		expect(project.stack).toEqual([]);
	});

	test("project with technical_context added later", () => {
		const project = ProjectSchema.parse({
			name: "test",
			created: now,
			technical_context: { test_framework: "bun:test" },
		});
		expect(project.technical_context?.test_framework).toBe("bun:test");
	});
});
