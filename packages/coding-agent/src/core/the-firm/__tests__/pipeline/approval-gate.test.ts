import { describe, expect, it } from "bun:test";
import { ApprovalGate, type ApprovalMode } from "../../pipeline/approval-gate";
import { PipelineContext } from "../../pipeline/pipeline-context";
import type { Proposal } from "../../types";

function makeProposal(overrides?: Partial<Proposal>): Proposal {
	return {
		id: "test-1",
		action: "create",
		targetPath: ".firm/test.md",
		content: "# Test",
		metadata: {
			contentType: "decision",
			category: "governance",
			template: "decision-template",
			validationPassed: true,
		},
		...overrides,
	};
}

describe("ApprovalGate", () => {
	const gate = new ApprovalGate();

	it("auto mode approves all proposals", async () => {
		const proposals = [makeProposal({ id: "a" }), makeProposal({ id: "b" })];
		const approved = await gate.approve(proposals, "auto");
		expect(approved).toEqual(proposals);
	});

	it("dry-run mode approves none", async () => {
		const proposals = [makeProposal({ id: "a" }), makeProposal({ id: "b" })];
		const approved = await gate.approve(proposals, "dry-run");
		expect(approved).toEqual([]);
	});

	it("selective mode approves all (current behavior)", async () => {
		const proposals = [makeProposal({ id: "a" }), makeProposal({ id: "b" })];
		const approved = await gate.approve(proposals, "selective");
		expect(approved).toEqual(proposals);
	});

	it("defaults to dry-run mode", async () => {
		const proposals = [makeProposal()];
		const approved = await gate.approve(proposals);
		expect(approved).toEqual([]);
	});

	it("returns empty for empty proposals array in any mode", async () => {
		const modes: ApprovalMode[] = ["auto", "selective", "dry-run"];
		for (const mode of modes) {
			const approved = await gate.approve([], mode);
			expect(approved).toEqual([]);
		}
	});
});

describe("PipelineContext", () => {
	it("stores and retrieves values", () => {
		const ctx = new PipelineContext("/tmp/test-project");
		expect(ctx.projectRoot).toBe("/tmp/test-project");
		expect(ctx.profile).toBeNull();
		expect(ctx.rawAnalysis).toEqual([]);
		expect(ctx.proposals).toEqual([]);
		expect(ctx.validationResult).toBeNull();
		expect(ctx.approvedProposals).toEqual([]);
		expect(ctx.writeResult).toBeNull();

		const proposal = makeProposal();
		ctx.proposals = [proposal];
		expect(ctx.proposals).toHaveLength(1);
		expect(ctx.proposals[0].id).toBe("test-1");

		ctx.rawAnalysis = [{ type: "language", name: "TypeScript" }];
		expect(ctx.rawAnalysis).toHaveLength(1);
	});
});
