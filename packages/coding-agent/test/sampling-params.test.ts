import { beforeAll, describe, expect, it } from "vitest";
import { bootstrapSettings } from "../src/core/settings-bootstrap.js";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("Sampling parameters", () => {
	beforeAll(() => {
		bootstrapSettings();
	});

	describe("defaults", () => {
		it("should return -1 (omit) for all sampling parameters by default", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get("sampling.temperature")).toBe(-1);
			expect(manager.get("sampling.topP")).toBe(-1);
			expect(manager.get("sampling.topK")).toBe(-1);
			expect(manager.get("sampling.minP")).toBe(-1);
			expect(manager.get("sampling.presencePenalty")).toBe(-1);
			expect(manager.get("sampling.repetitionPenalty")).toBe(-1);
		});
	});

	describe("overrides", () => {
		it("should allow setting temperature", () => {
			const manager = SettingsManager.inMemory({
				sampling: { temperature: 0.7 },
			});
			expect(manager.get("sampling.temperature")).toBe(0.7);
		});

		it("should allow setting topP and topK together", () => {
			const manager = SettingsManager.inMemory({
				sampling: { topP: 0.9, topK: 50 },
			});
			expect(manager.get("sampling.topP")).toBe(0.9);
			expect(manager.get("sampling.topK")).toBe(50);
		});

		it("should allow setting minP", () => {
			const manager = SettingsManager.inMemory({
				sampling: { minP: 0.05 },
			});
			expect(manager.get("sampling.minP")).toBe(0.05);
		});

		it("should allow setting penalties", () => {
			const manager = SettingsManager.inMemory({
				sampling: { presencePenalty: 0.6, repetitionPenalty: 1.2 },
			});
			expect(manager.get("sampling.presencePenalty")).toBe(0.6);
			expect(manager.get("sampling.repetitionPenalty")).toBe(1.2);
		});

		it("should allow setting all sampling parameters at once", () => {
			const manager = SettingsManager.inMemory({
				sampling: {
					temperature: 0.5,
					topP: 0.95,
					topK: 40,
					minP: 0.1,
					presencePenalty: 0.3,
					repetitionPenalty: 1.1,
				},
			});
			expect(manager.get("sampling.temperature")).toBe(0.5);
			expect(manager.get("sampling.topP")).toBe(0.95);
			expect(manager.get("sampling.topK")).toBe(40);
			expect(manager.get("sampling.minP")).toBe(0.1);
			expect(manager.get("sampling.presencePenalty")).toBe(0.3);
			expect(manager.get("sampling.repetitionPenalty")).toBe(1.1);
		});
	});
});

// StreamOptions forwarding tests are in packages/ai/test/ to access AI layer internals.
// Settings tests here verify the settings API only.
