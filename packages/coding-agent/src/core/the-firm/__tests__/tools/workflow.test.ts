import { afterEach, describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkflowTool } from "../../tools/workflow.ts";
import type { WorkflowInput } from "../../types/workflow.ts";
import { FirmRepository } from "../../writing/firm-repository.ts";
import { serializeInstanceYaml, WorkflowRepository } from "../../writing/workflow-repository.ts";

// -- Test helpers -----------------------------------------------------------

let helperCounter = 0;

async function makeSetup() {
	const root = join(tmpdir(), `wf-tool-test-${Date.now()}-${++helperCounter}`);
	await mkdir(root, { recursive: true });

	const firmRepo = new FirmRepository(root);
	const workflowRepo = new WorkflowRepository(firmRepo);
	const tool = new WorkflowTool(workflowRepo);

	return { root, firmRepo, workflowRepo, tool };
}

const TEMPLATE_YAML = `name: "spec-implementation"
description: "Test template"
type: "implementation"
phases:
  - name: "Design"
    agent: "plan"
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

/** Deploy a template to the firm repo so the tool can find it. */
async function deployTemplate(firmRepo: FirmRepository): Promise<void> {
	await firmRepo.write("operations/workflows/templates/spec-implementation.yaml", TEMPLATE_YAML);
}

function makeInput(
	action: WorkflowInput["options"]["action"],
	options: Partial<WorkflowInput["options"]> = {},
): WorkflowInput {
	return {
		projectRoot: "/tmp/test",
		options: { action, ...options },
	};
}

// -- Tests ------------------------------------------------------------------

describe("WorkflowTool", () => {
	describe("list", () => {
		it("returns empty when no templates or instances exist", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("list"));
			expect(result.status).toBe("success");
			expect(result.metadata?.templates).toEqual([]);
			expect(result.metadata?.instances).toEqual([]);
		});

		it("lists templates and instances", async () => {
			const { tool, firmRepo, workflowRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			// Create an instance via the tool
			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "my-work",
				}),
			);

			const result = await tool.execute(makeInput("list"));
			expect(result.status).toBe("success");
			expect(result.metadata?.templates).toEqual(["spec-implementation.yaml"]);
			expect(result.metadata?.instances).toHaveLength(1);
			expect(result.metadata?.instances[0].name).toBe("my-work");
		});
	});

	describe("create", () => {
		it("creates instance from template and auto-advances to first phase", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			const result = await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "feature-x",
					spec: "specs/feature-x.md",
				}),
			);

			expect(result.status).toBe("success");
			const instance = result.metadata?.instance;
			expect(instance.name).toBe("feature-x");
			expect(instance.template).toBe("spec-implementation");
			expect(instance.linkedSpec).toBe("specs/feature-x.md");
			expect(instance.status).toBe("in-progress");
			expect(instance.currentPhase).toBe("Design");
			expect(instance.phaseState.Design.status).toBe("in-progress");
			expect(instance.phaseState.Build.status).toBe("not-started");
		});

		it("rejects create without template", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("create", { name: "x" }));
			expect(result.status).toBe("error");
			expect(result.message).toContain("template");
		});

		it("rejects create without name", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("create", { template: "spec-implementation" }));
			expect(result.status).toBe("error");
			expect(result.message).toContain("name");
		});

		it("rejects create with unknown template", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("create", { template: "nope", name: "x" }));
			expect(result.status).toBe("error");
			expect(result.message).toContain("not found");
		});

		it("rejects create with duplicate name", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "dup",
				}),
			);

			const result = await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "dup",
				}),
			);
			expect(result.status).toBe("error");
			expect(result.message).toContain("already exists");
		});

		it("finds template with .yaml extension suffix", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			const result = await tool.execute(
				makeInput("create", {
					template: "spec-implementation.yaml",
					name: "ext-test",
				}),
			);
			expect(result.status).toBe("success");
		});
	});

	describe("status", () => {
		it("shows current instance state", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "status-test",
				}),
			);

			const result = await tool.execute(makeInput("status", { name: "status-test" }));
			expect(result.status).toBe("success");
			expect(result.message).toContain("in-progress");
			expect(result.message).toContain("Design");
			expect(result.metadata?.instance.name).toBe("status-test");
		});

		it("rejects status without name", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("status"));
			expect(result.status).toBe("error");
			expect(result.message).toContain("name");
		});

		it("rejects status for unknown instance", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("status", { name: "ghost" }));
			expect(result.status).toBe("error");
			expect(result.message).toContain("not found");
		});
	});

	describe("advance", () => {
		it("advances to next phase with retrospective", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "adv-test",
				}),
			);

			const result = await tool.execute(
				makeInput("advance", {
					name: "adv-test",
					retrospective: ["Design was solid", "Found edge case X"],
				}),
			);

			expect(result.status).toBe("success");
			expect(result.message).toContain("Build");

			const instance = result.metadata?.instance;
			expect(instance.currentPhase).toBe("Build");
			expect(instance.phaseState.Design.status).toBe("completed");
			expect(instance.phaseState.Design.retrospectiveFindings).toEqual(["Design was solid", "Found edge case X"]);
			expect(instance.phaseState.Build.status).toBe("in-progress");
		});

		it("completes instance when advancing past last phase", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "complete-test",
				}),
			);

			// Advance through all phases
			await tool.execute(makeInput("advance", { name: "complete-test" }));
			await tool.execute(makeInput("advance", { name: "complete-test" }));
			const result = await tool.execute(makeInput("advance", { name: "complete-test" }));

			expect(result.status).toBe("success");
			expect(result.message).toContain("completed");
			expect(result.metadata?.instance.status).toBe("completed");
		});

		it("rejects advance without name", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("advance"));
			expect(result.status).toBe("error");
		});

		it("rejects advance on completed instance", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "done-test",
				}),
			);
			await tool.execute(makeInput("advance", { name: "done-test" }));
			await tool.execute(makeInput("advance", { name: "done-test" }));
			await tool.execute(makeInput("advance", { name: "done-test" }));

			const result = await tool.execute(makeInput("advance", { name: "done-test" }));
			expect(result.status).toBe("error");
			expect(result.message).toContain("completed");
		});
	});

	describe("update", () => {
		it("adds retrospective findings and backlog items", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "upd-test",
				}),
			);

			const result = await tool.execute(
				makeInput("update", {
					name: "upd-test",
					retrospective: ["Need better estimates"],
					backlog: [
						{
							description: "Fix edge case Y",
							priority: "high",
						},
					],
				}),
			);

			expect(result.status).toBe("success");
			const instance = result.metadata?.instance;
			expect(instance.phaseState.Design.retrospectiveFindings).toEqual(["Need better estimates"]);
			expect(instance.phaseState.Design.backlogItems).toHaveLength(1);
			expect(instance.phaseState.Design.backlogItems[0].description).toBe("Fix edge case Y");
		});

		it("rejects update on completed instance", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "closed-test",
				}),
			);
			await tool.execute(makeInput("close", { name: "closed-test" }));

			const result = await tool.execute(
				makeInput("update", {
					name: "closed-test",
					retrospective: ["too late"],
				}),
			);
			expect(result.status).toBe("error");
			expect(result.message).toContain("completed");
		});

		it("adds decisions to current phase", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "dec-test",
				}),
			);

			const result = await tool.execute(
				makeInput("update", {
					name: "dec-test",
					decisions: [
						{
							description: "Use PostgreSQL",
							outcome: "Chosen for ACID compliance",
							alternatives: ["MongoDB", "SQLite"],
						},
					],
				}),
			);

			expect(result.status).toBe("success");
			expect(result.message).toContain("+1 decisions");
			const instance = result.metadata?.instance;
			expect(instance.phaseState.Design.decisions).toHaveLength(1);
			expect(instance.phaseState.Design.decisions[0]).toEqual({
				description: "Use PostgreSQL",
				outcome: "Chosen for ACID compliance",
				alternatives: ["MongoDB", "SQLite"],
			});
		});

		it("update with empty decisions does not change phase", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "no-dec-test",
				}),
			);

			const result = await tool.execute(
				makeInput("update", {
					name: "no-dec-test",
				}),
			);

			expect(result.status).toBe("success");
			expect(result.message).toContain("+0 decisions");
			const instance = result.metadata?.instance;
			expect(instance.phaseState.Design.decisions).toEqual([]);
		});
	});

	describe("close", () => {
		it("completes the instance and current phase", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "close-test",
				}),
			);
			// Advance to Build
			await tool.execute(makeInput("advance", { name: "close-test" }));

			const result = await tool.execute(
				makeInput("close", {
					name: "close-test",
					retrospective: ["Partial delivery, see backlog"],
				}),
			);

			expect(result.status).toBe("success");
			const instance = result.metadata?.instance;
			expect(instance.status).toBe("completed");
			expect(instance.phaseState.Build.status).toBe("completed");
			expect(instance.phaseState.Build.retrospectiveFindings).toEqual(["Partial delivery, see backlog"]);
			expect(instance.phaseState.Verify.status).toBe("not-started");
		});

		it("rejects close on already completed instance", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "dbl-close",
				}),
			);
			await tool.execute(makeInput("close", { name: "dbl-close" }));

			const result = await tool.execute(makeInput("close", { name: "dbl-close" }));
			expect(result.status).toBe("error");
			expect(result.message).toContain("already");
		});

		it("rejects close without name", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("close"));
			expect(result.status).toBe("error");
		});
	});

	describe("unknown action", () => {
		it("returns error for unrecognized action", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("unknown" as WorkflowInput["options"]["action"]));
			expect(result.status).toBe("error");
			expect(result.message).toContain("Unknown action");
		});
	});

	describe("gate enforcement (G2+G5)", () => {
		it("advance returns gate warnings when retrospective doesn't address criteria", async () => {
			const { root, firmRepo, tool } = await makeSetup();
			await deployTemplate(firmRepo);

			// Create and advance without addressing gate criteria
			await tool.execute(makeInput("create", { template: "spec-implementation", name: "gate-test" }));
			const result = await tool.execute(makeInput("advance", { name: "gate-test" }));

			expect(result.status).toBe("success");
			expect(result.metadata?.gateCheck).toBeDefined();
			expect(result.metadata?.gateCheck.passed).toBe(false);
			expect(result.metadata?.gateCheck.warnings.length).toBeGreaterThan(0);
			expect(result.message).toContain("Advanced to phase");
			expect(result.message).toContain("Gate warnings");
		});

		it("advance passes gate when retrospective addresses criteria", async () => {
			const { root, firmRepo, tool } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(makeInput("create", { template: "spec-implementation", name: "gate-pass" }));
			// Advance with a finding that addresses the gate criterion "Design reviewed"
			const result = await tool.execute(
				makeInput("advance", {
					name: "gate-pass",
					retrospective: ["The design was reviewed and approved by the team"],
				}),
			);

			expect(result.status).toBe("success");
			expect(result.metadata?.gateCheck).toBeDefined();
			expect(result.metadata?.gateCheck.passed).toBe(true);
			expect(result.metadata?.gateCheck.warnings.length).toBe(0);
		});

		it("close warns about incomplete phases (G6)", async () => {
			const { root, firmRepo, tool } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(makeInput("create", { template: "spec-implementation", name: "close-warn" }));
			// Close without advancing — current phase is still in-progress
			const result = await tool.execute(makeInput("close", { name: "close-warn" }));

			expect(result.status).toBe("success");
			expect(result.metadata?.warnings).toBeDefined();
			expect(result.metadata?.warnings.length).toBeGreaterThan(0);
			expect(result.message).toContain("Warnings");
		});

		it("close warns about unresolved backlog items (G6)", async () => {
			const { root, firmRepo, tool } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(makeInput("create", { template: "spec-implementation", name: "backlog-warn" }));
			// Add a backlog item and then close
			await tool.execute(
				makeInput("update", {
					name: "backlog-warn",
					backlog: [{ description: "Write integration tests", priority: "high" }],
				}),
			);
			// Advance to complete the Design phase
			await tool.execute(makeInput("advance", { name: "backlog-warn", retrospective: ["Design reviewed"] }));
			// Close from Build phase with unresolved backlog
			const result = await tool.execute(makeInput("close", { name: "backlog-warn" }));

			expect(result.status).toBe("success");
			expect(result.metadata?.warnings).toBeDefined();
			// Should warn about unresolved backlog
			const hasBacklogWarning = (result.metadata?.warnings as string[]).some((w) => w.includes("backlog"));
			expect(hasBacklogWarning).toBe(true);
		});

		it("final advance returns gate check when all phases complete", async () => {
			const { root, firmRepo, tool } = await makeSetup();
			await deployTemplate(firmRepo);

			await tool.execute(makeInput("create", { template: "spec-implementation", name: "final-advance" }));
			// Advance through all 3 phases
			await tool.execute(makeInput("advance", { name: "final-advance", retrospective: ["Design reviewed"] }));
			await tool.execute(
				makeInput("advance", {
					name: "final-advance",
					retrospective: ["All tests pass, coverage is good"],
				}),
			);
			const result = await tool.execute(
				makeInput("advance", { name: "final-advance", retrospective: ["No regressions found"] }),
			);

			expect(result.status).toBe("success");
			expect(result.metadata?.gateCheck).toBeDefined();
			expect(result.metadata?.gateCheck.passed).toBe(true);
			expect(result.message).toContain("All phases complete");
		});
	});

	describe("gate matching — synonyms and stemming", () => {
		it("matches synonyms: review ↔ audit", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);
			await tool.execute(makeInput("create", { template: "spec-implementation", name: "syn-review" }));
			// Gate: "Design reviewed" — finding uses "audit" (synonym of review)
			const result = await tool.execute(
				makeInput("advance", {
					name: "syn-review",
					retrospective: ["Design audit completed successfully"],
				}),
			);
			expect(result.status).toBe("success");
			expect(result.metadata?.gateCheck.passed).toBe(true);
			expect(result.metadata?.gateCheck.warnings).toHaveLength(0);
		});

		it("matches via stemming: reviewing → review", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);
			await tool.execute(makeInput("create", { template: "spec-implementation", name: "stem-review" }));
			// Gate: "Design reviewed" — finding uses "reviewing" which stems to "review"
			const result = await tool.execute(
				makeInput("advance", {
					name: "stem-review",
					retrospective: ["Reviewing design thoroughly"],
				}),
			);
			expect(result.status).toBe("success");
			expect(result.metadata?.gateCheck.passed).toBe(true);
		});

		it("matches code ↔ implementation synonyms", async () => {
			const { tool, firmRepo } = await makeSetup();
			// Deploy a custom template with a gate that uses "code"
			const customTemplate = `name: "code-review-tmpl"
description: "Test template for code synonym"
type: "implementation"
phases:
  - name: "Build"
    agent: "task"
    gate: ["Code review completed"]
    retrospective: ["Did we consider alternatives?"]
  - name: "Verify"
    agent: "task"
    gate: ["No regressions"]
    retrospective: ["What did we miss?"]
`;
			await firmRepo.write("operations/workflows/templates/code-review-tmpl.yaml", customTemplate);

			await tool.execute(makeInput("create", { template: "code-review-tmpl", name: "code-syn" }));
			// Finding uses "implementation" (synonym of code) and "audit" (synonym of review)
			const result = await tool.execute(
				makeInput("advance", {
					name: "code-syn",
					retrospective: ["Implementation audit completed — all checks pass"],
				}),
			);
			expect(result.status).toBe("success");
			expect(result.metadata?.gateCheck.passed).toBe(true);
		});

		it("matches spec ↔ test synonyms", async () => {
			const { tool, firmRepo } = await makeSetup();
			await deployTemplate(firmRepo);
			await tool.execute(makeInput("create", { template: "spec-implementation", name: "spec-syn" }));
			// Advance Design phase first (with a passing retrospective)
			await tool.execute(makeInput("advance", { name: "spec-syn", retrospective: ["Design reviewed"] }));
			// Now in Build phase, gate: "All tests pass"
			// Now in Build phase, gate: "All tests pass"
			// Finding uses "specification" (synonym of test) and "passed" (stem of pass)
			const result = await tool.execute(
				makeInput("advance", {
					name: "spec-syn",
					retrospective: ["Specification verification passed successfully"],
				}),
			);
			expect(result.status).toBe("success");
			expect(result.metadata?.gateCheck).toBeDefined();
			expect(result.metadata?.gateCheck.passed).toBe(true);
		});
	});

	describe("stale", () => {
		it("returns success with empty array when no stale instances", async () => {
			const { tool } = await makeSetup();
			const result = await tool.execute(makeInput("stale"));
			expect(result.status).toBe("success");
			expect(result.message).toContain("No stale instances");
			expect(result.metadata?.stale).toEqual([]);
		});

		it("returns stale instances with metadata", async () => {
			const { tool, firmRepo, workflowRepo } = await makeSetup();
			await deployTemplate(firmRepo);

			// Create an instance and make it stale by writing old timestamp
			await tool.execute(
				makeInput("create", {
					template: "spec-implementation",
					name: "stale-test",
				}),
			);

			// Force stale by overwriting updated to 10 days ago
			const instance = await workflowRepo.readInstance("stale-test");
			instance!.status = "in-progress";
			instance!.updated = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
			await firmRepo.write("operations/workflows/instances/stale-test.yaml", serializeInstanceYaml(instance!));

			const result = await tool.execute(makeInput("stale"));
			expect(result.status).toBe("success");
			expect(result.message).toContain("1 stale instance(s)");
			expect(result.metadata?.stale).toHaveLength(1);
			expect(result.metadata?.stale[0].name).toBe("stale-test");
			expect(result.metadata?.stale[0].reason).toBe("no-recent-progress");
		});

		it("respects custom threshold", async () => {
			const { tool } = await makeSetup();
			// No instances at all — even with threshold 0, should return empty
			const result = await tool.execute(makeInput("stale", { staleThresholdDays: 0 }));
			expect(result.status).toBe("success");
			expect(result.metadata?.stale).toEqual([]);
		});
	});
});

describe("advance with artifacts (G4)", () => {
	it("adds artifacts to completed phase on advance", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "artifact-test",
			}),
		);

		const result = await tool.execute(
			makeInput("advance", {
				name: "artifact-test",
				artifacts: ["concepts/decisions/adr-001.md", "guides/workflows/design-guide.md"],
			}),
		);

		expect(result.status).toBe("success");
		const instance = result.metadata?.instance;
		expect(instance.phaseState.Design.artifacts).toEqual([
			"concepts/decisions/adr-001.md",
			"guides/workflows/design-guide.md",
		]);
		expect(instance.phaseState.Build.artifacts).toEqual([]);
	});

	it("advance without artifacts adds no artifacts", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "no-artifact-test",
			}),
		);

		const result = await tool.execute(makeInput("advance", { name: "no-artifact-test" }));

		expect(result.status).toBe("success");
		const instance = result.metadata?.instance;
		expect(instance.phaseState.Design.artifacts).toEqual([]);
	});

	it("filters out empty string artifacts", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "empty-artifact-test",
			}),
		);

		const result = await tool.execute(
			makeInput("advance", {
				name: "empty-artifact-test",
				artifacts: ["concepts/patterns/factory.md", "", "  ", "guides/workflows/build.md"],
			}),
		);

		expect(result.status).toBe("success");
		const instance = result.metadata?.instance;
		// Empty strings are filtered out, but strings with spaces are NOT empty strings
		expect(instance.phaseState.Design.artifacts).toEqual([
			"concepts/patterns/factory.md",
			"  ",
			"guides/workflows/build.md",
		]);
	});
});

// -- G3: sync-backlog -------------------------------------------------------

describe("sync-backlog (G3)", () => {
	const originalSpawn = Bun.spawn;

	afterEach(() => {
		Bun.spawn = originalSpawn;
	});

	it("returns success with empty synced array when no unsynced items", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "sync-empty",
			}),
		);
		// Deferred + already-synced items should not be synced again
		await tool.execute(
			makeInput("update", {
				name: "sync-empty",
				backlog: [
					{ description: "Deferred task", priority: "low", deferredTo: "Build" },
					{ description: "Already synced", priority: "medium", syncedToBeads: "bd-999" },
				],
			}),
		);

		const result = await tool.execute(makeInput("sync-backlog", { name: "sync-empty" }));

		expect(result.status).toBe("success");
		expect(result.metadata?.synced).toEqual([]);
	});

	it("syncs unsynced items and sets syncedToBeads", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		let callCount = 0;
		Bun.spawn = (() => {
			callCount++;
			const id = `bd-${100 + callCount}`;
			return {
				exited: Promise.resolve(0),
				stdout: new ReadableStream({
					start(c: any) {
						c.enqueue(new TextEncoder().encode(id));
						c.close();
					},
				}),
				stderr: new ReadableStream({
					start(c: any) {
						c.close();
					},
				}),
			};
		}) as any;

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "sync-items",
			}),
		);
		await tool.execute(
			makeInput("update", {
				name: "sync-items",
				backlog: [
					{ description: "Task A", priority: "high" },
					{ description: "Task B", priority: "low" },
				],
			}),
		);

		const result = await tool.execute(makeInput("sync-backlog", { name: "sync-items" }));

		expect(result.status).toBe("success");
		expect(result.metadata?.synced).toHaveLength(2);
		expect(result.metadata?.synced[0].description).toBe("Task A");
		expect(result.metadata?.synced[0].beadsId).toBe("bd-101");
		expect(result.metadata?.synced[1].description).toBe("Task B");
		expect(result.metadata?.synced[1].beadsId).toBe("bd-102");
	});

	it("returns error when name is missing", async () => {
		const { tool } = await makeSetup();
		const result = await tool.execute(makeInput("sync-backlog"));
		expect(result.status).toBe("error");
		expect(result.message).toContain("name");
	});

	it("returns error when instance not found", async () => {
		const { tool } = await makeSetup();
		const result = await tool.execute(makeInput("sync-backlog", { name: "ghost" }));
		expect(result.status).toBe("error");
		expect(result.message).toContain("not found");
	});

	it("handles partial sync when spawn returns null for some items", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		let callCount = 0;
		Bun.spawn = (() => {
			callCount++;
			if (callCount === 1) {
				return {
					exited: Promise.resolve(0),
					stdout: new ReadableStream({
						start(c: any) {
							c.enqueue(new TextEncoder().encode("bd-200"));
							c.close();
						},
					}),
					stderr: new ReadableStream({
						start(c: any) {
							c.close();
						},
					}),
				};
			}
			// Second call: non-zero exit => spawnBdCreate returns null
			return {
				exited: Promise.resolve(1),
				stdout: new ReadableStream({
					start(c: any) {
						c.close();
					},
				}),
				stderr: new ReadableStream({
					start(c: any) {
						c.close();
					},
				}),
			};
		}) as any;

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "partial-sync",
			}),
		);
		await tool.execute(
			makeInput("update", {
				name: "partial-sync",
				backlog: [
					{ description: "Will succeed", priority: "high" },
					{ description: "Will fail", priority: "medium" },
				],
			}),
		);

		const result = await tool.execute(makeInput("sync-backlog", { name: "partial-sync" }));

		// Only one item synced; spawnBdCreate swallows failures so errors stays empty
		expect(result.metadata?.synced).toHaveLength(1);
		expect(result.metadata?.synced[0].beadsId).toBe("bd-200");
		expect(result.metadata?.synced[0].description).toBe("Will succeed");
		expect(result.metadata?.errors).toEqual([]);
	});

	it("collects unsynced items from all phases", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		let callCount = 0;
		Bun.spawn = (() => {
			callCount++;
			const id = `bd-${300 + callCount}`;
			return {
				exited: Promise.resolve(0),
				stdout: new ReadableStream({
					start(c: any) {
						c.enqueue(new TextEncoder().encode(id));
						c.close();
					},
				}),
				stderr: new ReadableStream({
					start(c: any) {
						c.close();
					},
				}),
			};
		}) as any;

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "multi-phase-sync",
			}),
		);
		// Add backlog in Design phase
		await tool.execute(
			makeInput("update", {
				name: "multi-phase-sync",
				backlog: [{ description: "Design task", priority: "high" }],
			}),
		);
		// Advance to Build, add more backlog
		await tool.execute(makeInput("advance", { name: "multi-phase-sync" }));
		await tool.execute(
			makeInput("update", {
				name: "multi-phase-sync",
				backlog: [{ description: "Build task", priority: "medium" }],
			}),
		);

		const result = await tool.execute(makeInput("sync-backlog", { name: "multi-phase-sync" }));

		expect(result.status).toBe("success");
		expect(result.metadata?.synced).toHaveLength(2);
		const descs = (result.metadata?.synced as Array<{ description: string }>).map((s) => s.description);
		expect(descs).toContain("Design task");
		expect(descs).toContain("Build task");
	});
});

// -- G7: handoff -------------------------------------------------------------

describe("handoff (G7)", () => {
	it("returns handoff result with phase data", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "handoff-test",
			}),
		);
		// Add decisions, retrospective, deferred backlog
		await tool.execute(
			makeInput("update", {
				name: "handoff-test",
				decisions: [{ description: "Use PostgreSQL", outcome: "ACID compliance" }],
				retrospective: ["Design reviewed and approved"],
				backlog: [{ description: "Research caching", priority: "low", deferredTo: "Build" }],
			}),
		);
		// Advance to Build with artifacts (Design completed)
		await tool.execute(
			makeInput("advance", {
				name: "handoff-test",
				artifacts: ["concepts/decisions/adr-001.md"],
			}),
		);

		const result = await tool.execute(makeInput("handoff", { name: "handoff-test" }));

		expect(result.status).toBe("success");
		const handoff = result.metadata?.handoff;
		expect(handoff.instanceName).toBe("handoff-test");
		expect(handoff.completedPhase).toBe("Design");
		expect(handoff.nextPhase).toBe("Build");
		expect(handoff.decisions).toHaveLength(1);
		expect(handoff.decisions[0].description).toBe("Use PostgreSQL");
		expect(handoff.artifacts).toEqual(["concepts/decisions/adr-001.md"]);
		expect(handoff.deferredItems).toHaveLength(1);
		expect(handoff.deferredItems[0].description).toBe("Research caching");
		expect(handoff.gateCriteria).toEqual(["All tests pass"]);
		expect(handoff.gateCheck).toBeDefined();
		expect(handoff.gateCheck.passed).toBe(true);
		expect(handoff.retrospective).toEqual(["Design reviewed and approved"]);
	});

	it("returns error when name is missing", async () => {
		const { tool } = await makeSetup();
		const result = await tool.execute(makeInput("handoff"));
		expect(result.status).toBe("error");
		expect(result.message).toContain("name");
	});

	it("returns error when instance not found", async () => {
		const { tool } = await makeSetup();
		const result = await tool.execute(makeInput("handoff", { name: "ghost" }));
		expect(result.status).toBe("error");
		expect(result.message).toContain("not found");
	});

	it("returns error when instance is not in-progress", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "completed-handoff",
			}),
		);
		// Advance through all phases to complete
		await tool.execute(makeInput("advance", { name: "completed-handoff" }));
		await tool.execute(makeInput("advance", { name: "completed-handoff" }));
		await tool.execute(makeInput("advance", { name: "completed-handoff" }));

		const result = await tool.execute(makeInput("handoff", { name: "completed-handoff" }));
		expect(result.status).toBe("error");
		expect(result.message).toContain("must be in-progress");
	});

	it("handoff on first phase shows (start) as completedPhase", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "first-phase-handoff",
			}),
		);

		const result = await tool.execute(makeInput("handoff", { name: "first-phase-handoff" }));

		expect(result.status).toBe("success");
		const handoff = result.metadata?.handoff;
		expect(handoff.completedPhase).toBe("(start)");
		expect(handoff.nextPhase).toBe("Design");
		expect(handoff.gateCheck).toBeUndefined();
		expect(handoff.decisions).toEqual([]);
	});
});

// -- G9: resume --------------------------------------------------------------

describe("resume (G9)", () => {
	it("returns resume result with phase state", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "resume-test",
			}),
		);
		// Add data in Design phase
		await tool.execute(
			makeInput("update", {
				name: "resume-test",
				decisions: [{ description: "Use React", outcome: "Component model fits" }],
				backlog: [
					{ description: "Setup CI", priority: "high" },
					{ description: "Research SSR", priority: "low", deferredTo: "Build" },
				],
			}),
		);
		// Advance to Build with artifacts
		await tool.execute(
			makeInput("advance", {
				name: "resume-test",
				artifacts: ["concepts/patterns/component.md"],
			}),
		);

		const result = await tool.execute(makeInput("resume", { name: "resume-test" }));

		expect(result.status).toBe("success");
		const resume = result.metadata?.resume;
		expect(resume.instanceName).toBe("resume-test");
		expect(resume.template).toBe("spec-implementation");
		expect(resume.currentPhase).toBe("Build");
		expect(resume.phaseStatus).toBe("in-progress");
		expect(resume.completedDecisions).toHaveLength(1);
		expect(resume.completedDecisions[0].description).toBe("Use React");
		expect(resume.activeBacklog).toHaveLength(0);
		expect(resume.deferredFromPriorPhases).toHaveLength(1);
		expect(resume.deferredFromPriorPhases[0].description).toBe("Research SSR");
		expect(resume.gateCriteria).toEqual(["All tests pass"]);
		expect(resume.allArtifacts).toEqual(["concepts/patterns/component.md"]);
		expect(resume.completedPhases).toEqual(["Design"]);
		expect(resume.remainingPhases).toEqual(["Build", "Verify"]);
	});

	it("returns error when name is missing", async () => {
		const { tool } = await makeSetup();
		const result = await tool.execute(makeInput("resume"));
		expect(result.status).toBe("error");
		expect(result.message).toContain("name");
	});

	it("returns error when instance not found", async () => {
		const { tool } = await makeSetup();
		const result = await tool.execute(makeInput("resume", { name: "ghost" }));
		expect(result.status).toBe("error");
		expect(result.message).toContain("not found");
	});

	it("returns error when instance is not in-progress", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "completed-resume",
			}),
		);
		await tool.execute(makeInput("close", { name: "completed-resume" }));

		const result = await tool.execute(makeInput("resume", { name: "completed-resume" }));
		expect(result.status).toBe("error");
		expect(result.message).toContain("must be in-progress");
	});

	it("resume on first phase with no completed phases has empty completedDecisions", async () => {
		const { tool, firmRepo } = await makeSetup();
		await deployTemplate(firmRepo);

		await tool.execute(
			makeInput("create", {
				template: "spec-implementation",
				name: "fresh-resume",
			}),
		);

		const result = await tool.execute(makeInput("resume", { name: "fresh-resume" }));

		expect(result.status).toBe("success");
		const resume = result.metadata?.resume;
		expect(resume.currentPhase).toBe("Design");
		expect(resume.completedDecisions).toEqual([]);
		expect(resume.completedPhases).toEqual([]);
		expect(resume.remainingPhases).toEqual(["Design", "Build", "Verify"]);
		expect(resume.gateCriteria).toEqual(["Design reviewed"]);
	});
});
