import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { FirmRepository } from "../../writing/firm-repository.ts";
import {
	WorkflowRepository,
	instanceFileName,
	parseInstanceYaml,
	parseTemplateYaml,
	serializeInstanceYaml,
} from "../../writing/workflow-repository.ts";

// -- Test helpers -----------------------------------------------------------

let makeRepoCounter = 0;


async function makeRepo(): Promise<{
	root: string;
	firmRepo: FirmRepository;
	workflowRepo: WorkflowRepository;
}> {
	const root = join(tmpdir(), `wf-repo-${Date.now()}-${++makeRepoCounter}`);
	await mkdir(root, { recursive: true });
	const firmRepo = new FirmRepository(root);
	const workflowRepo = new WorkflowRepository(firmRepo);
	return { root, firmRepo, workflowRepo };
}

const SAMPLE_TEMPLATE_YAML = `name: "spec-implementation"
description: "Standard spec-to-implementation workflow"
type: "implementation"
phases:
  - name: "Design"
    agent: "plan"
    skills: ["writing-plans"]
    gate: ["Design reviewed"]
    retrospective: ["Did we consider alternatives?"]
  - name: "Build"
    agent: "task"
    gate: ["All tests pass"]
    retrospective: ["Were estimates accurate?"]
  - name: "Verify"
    agent: "task"
    gate: ["No regressions"]
    retrospective: ["What did we miss?"]
`;

const SAMPLE_INSTANCE_YAML = `template: "spec-implementation"
name: "my-feature"
linkedSpec: "specs/my-feature-2026-04-09.md"
status: "in-progress"
currentPhase: "Build"
created: "2026-04-09T10:00:00.000Z"
updated: "2026-04-09T11:00:00.000Z"
phaseState:
  Design:
    status: "completed"
    completedAt: "2026-04-09T10:30:00.000Z"
    retrospectiveFindings:
      - "Considered Option A and B"
    backlogItems: []
  Build:
    status: "in-progress"
    retrospectiveFindings: []
    backlogItems:
      - description: "Add edge case handling"
        priority: "high"
      - description: "Write integration tests"
        priority: "medium"
        deferredTo: "Verify"
  Verify:
    status: "not-started"
    retrospectiveFindings: []
    backlogItems: []
`;

// -- Tests ------------------------------------------------------------------

describe("WorkflowRepository", () => {
	describe("readTemplate", () => {
		it("returns null when template file does not exist", async () => {
			const { workflowRepo } = await makeRepo();
			expect(await workflowRepo.readTemplate("nope.yaml")).toBeNull();
		});

		it("parses a valid template YAML", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			await firmRepo.write(
				"operations/workflows/templates/spec-implementation.yaml",
				SAMPLE_TEMPLATE_YAML,
			);

			const template = await workflowRepo.readTemplate(
				"spec-implementation.yaml",
			);
			expect(template).not.toBeNull();
			expect(template!.name).toBe("spec-implementation");
			expect(template!.description).toBe(
				"Standard spec-to-implementation workflow",
			);
			expect(template!.type).toBe("implementation");
			expect(template!.phases).toHaveLength(3);
			expect(template!.phases[0]).toEqual({
				name: "Design",
				agent: "plan",
				skills: ["writing-plans"],
				gate: ["Design reviewed"],
				retrospective: ["Did we consider alternatives?"],
			});
			expect(template!.phases[1].name).toBe("Build");
			expect(template!.phases[1].agent).toBe("task");
			expect(template!.phases[1].skills).toBeUndefined();
		});

		it("throws on template with missing name", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			await firmRepo.write(
				"operations/workflows/templates/bad.yaml",
				"description: 'no name'\ntype: 'test'\nphases:\n  - name: 'Phase1'\n    gate: []\n    retrospective: []\n",
			);
			await expect(
				workflowRepo.readTemplate("bad.yaml"),
			).rejects.toThrow("missing required 'name' field");
		});

		it("throws on template with no phases", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			await firmRepo.write(
				"operations/workflows/templates/no-phases.yaml",
				'name: "empty"\ndescription: "no phases"\ntype: "test"\nphases:\n',
			);
			await expect(
				workflowRepo.readTemplate("no-phases.yaml"),
			).rejects.toThrow("has no phases");
		});
	});

	describe("listTemplates", () => {
		it("returns empty array when no templates exist", async () => {
			const { workflowRepo } = await makeRepo();
			expect(await workflowRepo.listTemplates()).toEqual([]);
		});

		it("lists deployed template filenames", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			await firmRepo.write(
				"operations/workflows/templates/a.yaml",
				'name: "a"\ntype: "x"\nphases:\n  - name: "P1"\n    gate: []\n    retrospective: []\n',
			);
			await firmRepo.write(
				"operations/workflows/templates/b.yaml",
				'name: "b"\ntype: "x"\nphases:\n  - name: "P1"\n    gate: []\n    retrospective: []\n',
			);

			const templates = await workflowRepo.listTemplates();
			expect(templates).toEqual(["a.yaml", "b.yaml"]);
		});
	});

	describe("createInstance", () => {
		it("creates instance with all phases in not-started state", async () => {
			const { workflowRepo } = await makeRepo();

			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			const instance = await workflowRepo.createInstance(
				template,
				"my-feature",
			);

			expect(instance.name).toBe("my-feature");
			expect(instance.template).toBe("spec-implementation");
			expect(instance.status).toBe("not-started");
			expect(instance.currentPhase).toBe("Design");
			expect(instance.linkedSpec).toBeUndefined();
			expect(Object.keys(instance.phaseState)).toHaveLength(3);
			for (const state of Object.values(instance.phaseState)) {
				expect(state.status).toBe("not-started");
				expect(state.retrospectiveFindings).toEqual([]);
				expect(state.backlogItems).toEqual([]);
			}
		});

		it("creates instance with linked spec", async () => {
			const { workflowRepo } = await makeRepo();

			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			const instance = await workflowRepo.createInstance(
				template,
				"feature-2",
				"specs/feature-2.md",
			);

			expect(instance.linkedSpec).toBe("specs/feature-2.md");
		});

		it("persists the instance to disk", async () => {
			const { workflowRepo } = await makeRepo();

			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			await workflowRepo.createInstance(template, "persist-test");

			const readBack = await workflowRepo.readInstance("persist-test");
			expect(readBack).not.toBeNull();
			expect(readBack!.name).toBe("persist-test");
			expect(readBack!.template).toBe("spec-implementation");
		});
	});

	describe("readInstance", () => {
		it("returns null when instance does not exist", async () => {
			const { workflowRepo } = await makeRepo();
			expect(await workflowRepo.readInstance("missing")).toBeNull();
		});

		it("round-trips an instance through write and read", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();

			// Write a sample instance directly
			await firmRepo.write(
				"operations/workflows/instances/my-feature.yaml",
				SAMPLE_INSTANCE_YAML,
			);

			const instance = await workflowRepo.readInstance("my-feature");
			expect(instance).not.toBeNull();
			expect(instance!.name).toBe("my-feature");
			expect(instance!.template).toBe("spec-implementation");
			expect(instance!.linkedSpec).toBe("specs/my-feature-2026-04-09.md");
			expect(instance!.status).toBe("in-progress");
			expect(instance!.currentPhase).toBe("Build");
			expect(instance!.phaseState.Design.status).toBe("completed");
			expect(instance!.phaseState.Design.completedAt).toBe(
				"2026-04-09T10:30:00.000Z",
			);
			expect(instance!.phaseState.Design.retrospectiveFindings).toEqual([
				"Considered Option A and B",
			]);
			expect(instance!.phaseState.Build.status).toBe("in-progress");
			expect(instance!.phaseState.Build.backlogItems).toHaveLength(2);
			expect(instance!.phaseState.Build.backlogItems[0]).toEqual({
				description: "Add edge case handling",
				priority: "high",
			});
			expect(instance!.phaseState.Build.backlogItems[1]).toEqual({
				description: "Write integration tests",
				priority: "medium",
				deferredTo: "Verify",
			});
			expect(instance!.phaseState.Verify.status).toBe("not-started");
		});
	});

	describe("writeInstance", () => {
		it("updates timestamp on write", async () => {
			const { workflowRepo } = await makeRepo();

			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			const instance = await workflowRepo.createInstance(
				template,
				"ts-test",
			);
			const originalUpdated = instance.updated;

			// Ensure different millisecond
			await new Promise((r) => setTimeout(r, 2));
			instance.status = "in-progress";
			await workflowRepo.writeInstance(instance);

			expect(instance.updated).not.toBe(originalUpdated);
		});

		it("round-trips phase state modifications", async () => {
			const { workflowRepo } = await makeRepo();

			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			const instance = await workflowRepo.createInstance(
				template,
				"roundtrip",
			);

			// Modify phase state
			instance.status = "in-progress";
			instance.phaseState.Design.status = "completed";
			instance.phaseState.Design.completedAt = "2026-04-09T10:30:00.000Z";
			instance.phaseState.Design.retrospectiveFindings.push("Found X");
			instance.phaseState.Build.status = "in-progress";
			instance.currentPhase = "Build";

			await workflowRepo.writeInstance(instance);

			const readBack = await workflowRepo.readInstance("roundtrip");
			expect(readBack!.status).toBe("in-progress");
			expect(readBack!.currentPhase).toBe("Build");
			expect(readBack!.phaseState.Design.status).toBe("completed");
			expect(readBack!.phaseState.Design.completedAt).toBe(
				"2026-04-09T10:30:00.000Z",
			);
			expect(readBack!.phaseState.Design.retrospectiveFindings).toEqual([
				"Found X",
			]);
			expect(readBack!.phaseState.Build.status).toBe("in-progress");
			expect(readBack!.phaseState.Verify.status).toBe("not-started");
		});
	});

	describe("listInstances", () => {
		it("returns empty when no instances exist", async () => {
			const { workflowRepo } = await makeRepo();
			expect(await workflowRepo.listInstances()).toEqual([]);
		});

		it("lists all instance filenames", async () => {
			const { workflowRepo } = await makeRepo();
			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			await workflowRepo.createInstance(template, "alpha");
			await workflowRepo.createInstance(template, "beta");

			const instances = await workflowRepo.listInstances();
			expect(instances).toEqual(["alpha.yaml", "beta.yaml"]);
		});
	});

	describe("findStaleInstances", () => {
		it("returns empty when instance was updated recently", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			await workflowRepo.createInstance(template, "fresh");

			const stale = await workflowRepo.findStaleInstances();
			expect(stale).toEqual([]);
		});

		it("detects not-started instance older than 3 days", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			await workflowRepo.createInstance(template, "old-idle");

			// Manually write stale timestamp
			const instance = await workflowRepo.readInstance("old-idle");
			instance!.status = "not-started";
			instance!.updated = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
			await firmRepo.write(
				"operations/workflows/instances/old-idle.yaml",
				serializeInstanceYaml(instance!),
			);

			const stale = await workflowRepo.findStaleInstances();
			expect(stale).toHaveLength(1);
			expect(stale[0].name).toBe("old-idle");
			expect(stale[0].reason).toBe("not-started-too-long");
			expect(stale[0].staleDays).toBeGreaterThanOrEqual(5);
		});

		it("detects in-progress instance with no update beyond threshold", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			await workflowRepo.createInstance(template, "stuck");

			// Manually write stale timestamp and set in-progress
			const instance = await workflowRepo.readInstance("stuck");
			instance!.status = "in-progress";
			instance!.updated = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
			await firmRepo.write(
				"operations/workflows/instances/stuck.yaml",
				serializeInstanceYaml(instance!),
			);

			const stale = await workflowRepo.findStaleInstances();
			expect(stale).toHaveLength(1);
			expect(stale[0].name).toBe("stuck");
			expect(stale[0].reason).toBe("no-recent-progress");
			expect(stale[0].staleDays).toBeGreaterThanOrEqual(10);
		});

		it("never reports completed instances as stale", async () => {
			const { firmRepo, workflowRepo } = await makeRepo();
			const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
			await workflowRepo.createInstance(template, "done");

			const instance = await workflowRepo.readInstance("done");
			instance!.status = "completed";
			instance!.updated = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
			await firmRepo.write(
				"operations/workflows/instances/done.yaml",
				serializeInstanceYaml(instance!),
			);

			const stale = await workflowRepo.findStaleInstances();
			expect(stale).toEqual([]);
		});
	});
});

describe("instanceFileName", () => {
	it("converts to lowercase with hyphens", () => {
		expect(instanceFileName("My Feature")).toBe("my-feature.yaml");
	});

	it("preserves existing hyphens and digits", () => {
		expect(instanceFileName("test-123-abc")).toBe("test-123-abc.yaml");
	});

	it("replaces special characters", () => {
		expect(instanceFileName("feat/branch@test")).toBe("feat-branch-test.yaml");
	});
});

describe("parseTemplateYaml", () => {
	it("parses inline gate array", () => {
		const yaml =
			'name: "test"\ndescription: "d"\ntype: "t"\nphases:\n  - name: "P1"\n    gate: ["a", "b"]\n    retrospective: ["c"]\n';
		const template = parseTemplateYaml(yaml, "inline");
		expect(template.phases[0].gate).toEqual(["a", "b"]);
		expect(template.phases[0].retrospective).toEqual(["c"]);
	});

	it("parses YAML list gate array", () => {
		const yaml =
			'name: "test"\ndescription: "d"\ntype: "t"\nphases:\n  - name: "P1"\n    gate:\n      - "a"\n      - "b"\n    retrospective:\n      - "c"\n';
		const template = parseTemplateYaml(yaml, "list");
		expect(template.phases[0].gate).toEqual(["a", "b"]);
		expect(template.phases[0].retrospective).toEqual(["c"]);
	});
});

describe("parseInstanceYaml / serializeInstanceYaml", () => {
	it("round-trips a complex instance", () => {
		const original = parseInstanceYaml(SAMPLE_INSTANCE_YAML);
		const serialized = serializeInstanceYaml(original);
		const parsed = parseInstanceYaml(serialized);

		expect(parsed.name).toBe(original.name);
		expect(parsed.template).toBe(original.template);
		expect(parsed.linkedSpec).toBe(original.linkedSpec);
		expect(parsed.status).toBe(original.status);
		expect(parsed.currentPhase).toBe(original.currentPhase);
		expect(parsed.created).toBe(original.created);
		expect(Object.keys(parsed.phaseState)).toEqual(
			Object.keys(original.phaseState),
		);
		expect(parsed.phaseState.Design.status).toBe("completed");
		expect(parsed.phaseState.Design.completedAt).toBe(
			"2026-04-09T10:30:00.000Z",
		);
		expect(parsed.phaseState.Build.backlogItems).toHaveLength(2);
	});
});

describe("decisions serialization", () => {
	it("round-trips decisions with alternatives", () => {
		const original = parseInstanceYaml(SAMPLE_INSTANCE_YAML);
		original.phaseState.Design.decisions = [
			{
				description: "Use PostgreSQL",
				outcome: "Chosen for ACID compliance",
				alternatives: ["MongoDB", "SQLite"],
			},
			{ description: "REST over GraphQL", outcome: "Simpler contract" },
		];

		const serialized = serializeInstanceYaml(original);
		const parsed = parseInstanceYaml(serialized);

		expect(parsed.phaseState.Design.decisions).toHaveLength(2);
		expect(parsed.phaseState.Design.decisions[0]).toEqual({
			description: "Use PostgreSQL",
			outcome: "Chosen for ACID compliance",
			alternatives: ["MongoDB", "SQLite"],
		});
		expect(parsed.phaseState.Design.decisions[1]).toEqual({
			description: "REST over GraphQL",
			outcome: "Simpler contract",
		});
		// Verify alternatives is undefined (not empty array) when omitted
		expect(parsed.phaseState.Design.decisions[1].alternatives).toBeUndefined();
	});

	it("handles empty decisions array", () => {
		const original = parseInstanceYaml(SAMPLE_INSTANCE_YAML);
		// All phases have empty decisions by default from createInstance
		const serialized = serializeInstanceYaml(original);
		const parsed = parseInstanceYaml(serialized);

		for (const state of Object.values(parsed.phaseState)) {
			expect(state.decisions).toEqual([]);
		}
	});

	it("round-trips decisions created via repository", async () => {
		const { workflowRepo } = await makeRepo();
		const template = parseTemplateYaml(SAMPLE_TEMPLATE_YAML, "test");
		const instance = await workflowRepo.createInstance(template, "dec-test");

		instance.phaseState.Design.decisions.push({
			description: "Use Bun runtime",
			outcome: "Fast test execution",
			alternatives: ["Node.js", "Deno"],
		});
		await workflowRepo.writeInstance(instance);

		const readBack = await workflowRepo.readInstance("dec-test");
		expect(readBack!.phaseState.Design.decisions).toHaveLength(1);
		expect(readBack!.phaseState.Design.decisions[0]).toEqual({
			description: "Use Bun runtime",
			outcome: "Fast test execution",
			alternatives: ["Node.js", "Deno"],
		});
	});

	it("parses instance YAML without decisions field as empty array", () => {
		// Simulate an old instance YAML that has no decisions field
		const oldYaml = `template: "spec-implementation"
name: "legacy"
status: "in-progress"
currentPhase: "Design"
created: "2026-04-09T10:00:00.000Z"
updated: "2026-04-09T11:00:00.000Z"
phaseState:
  Design:
    status: "in-progress"
    retrospectiveFindings: []
    backlogItems: []
`;
		const parsed = parseInstanceYaml(oldYaml);
		expect(parsed.phaseState.Design.decisions).toEqual([]);
	});
});

describe("artifact serialization (G4)", () => {
	it("round-trips instance with artifacts through serialize and parse", () => {
		const original = parseInstanceYaml(SAMPLE_INSTANCE_YAML);
		// Add artifacts to a phase
		original.phaseState.Design.artifacts = ["concepts/decisions/adr-001.md", "guides/workflows/design-guide.md"];
		original.phaseState.Build.artifacts = ["concepts/patterns/factory-pattern.md"];

		const serialized = serializeInstanceYaml(original);
		const parsed = parseInstanceYaml(serialized);

		expect(parsed.phaseState.Design.artifacts).toEqual(["concepts/decisions/adr-001.md", "guides/workflows/design-guide.md"]);
		expect(parsed.phaseState.Build.artifacts).toEqual(["concepts/patterns/factory-pattern.md"]);
		expect(parsed.phaseState.Verify.artifacts).toEqual([]);
	});

	it("serializes empty artifacts correctly", () => {
		const original = parseInstanceYaml(SAMPLE_INSTANCE_YAML);
		const serialized = serializeInstanceYaml(original);
		const parsed = parseInstanceYaml(serialized);

		// All phases should have empty artifacts
		for (const state of Object.values(parsed.phaseState)) {
			expect(state.artifacts).toEqual([]);
		}
	});

	it("parses instance without artifacts field as empty array", async () => {
		const { firmRepo, workflowRepo } = await makeRepo();
		// Write an instance YAML that has no artifacts field (legacy format)
		const legacyYaml = `template: "spec-implementation"
name: "legacy-art"
status: "in-progress"
currentPhase: "Design"
created: "2026-04-09T10:00:00.000Z"
updated: "2026-04-09T10:00:00.000Z"
phaseState:
  Design:
    status: "in-progress"
    retrospectiveFindings: []
    backlogItems: []
`;
		await firmRepo.write("operations/workflows/instances/legacy-art.yaml", legacyYaml);

		const instance = await workflowRepo.readInstance("legacy-art");
		expect(instance).not.toBeNull();
		expect(instance!.phaseState.Design.artifacts).toEqual([]);
	});
});