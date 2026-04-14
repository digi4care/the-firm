import { beforeAll, describe, expect, it } from "vitest";
import { bootstrapSettings } from "../src/core/settings-bootstrap.js";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("Context settings", () => {
	beforeAll(() => {
		bootstrapSettings();
	});

	describe("core compaction defaults", () => {
		it("should return default values for core compaction", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get("compaction.enabled")).toBe(true);
			expect(manager.get("compaction.strategy")).toBe("context-full");
			expect(manager.get("compaction.thresholdPercent")).toBe(90);
			expect(manager.get("compaction.thresholdTokens")).toBe(-1);
			expect(manager.get("compaction.reserveTokens")).toBe(16384);
			expect(manager.get("compaction.keepRecentTokens")).toBe(20000);
		});

		it("should return default values for handoff", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get("compaction.handoffAutoContinue")).toBe(true);
			expect(manager.get("compaction.handoffSaveToDisk")).toBe(false);
		});
	});

	describe("branch summaries defaults", () => {
		it("should return default values for branch summaries", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get("branchSummary.enabled")).toBe(false);
		});
	});

	describe("context pruning (DCP) defaults", () => {
		it("should return default values for context pruning", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get("contextPruning.enabled")).toBe(false);
			expect(manager.get("contextPruning.keepRecentCount")).toBe(4);
		});
	});

	describe("overrides", () => {
		it("should allow switching compaction strategy to handoff", () => {
			const manager = SettingsManager.inMemory({
				compaction: { strategy: "handoff" },
			});
			expect(manager.get("compaction.strategy")).toBe("handoff");
		});

		it("should allow enabling context pruning", () => {
			const manager = SettingsManager.inMemory({
				contextPruning: { enabled: true, rules: ["deduplication"] },
			});
			expect(manager.get("contextPruning.enabled")).toBe(true);
			expect(manager.get("contextPruning.rules")).toEqual(["deduplication"]);
		});

		it("should allow configuring branch summaries", () => {
			const manager = SettingsManager.inMemory({
				branchSummary: { skipPrompt: true },
			});
			expect(manager.get("branchSummary.skipPrompt")).toBe(true);
		});
	});
});
