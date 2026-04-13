import { describe, expect, it } from "vitest";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("Thinking budgets", () => {
	describe("dotted keys format", () => {
		it("should return defaults for all thinking budget levels", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.getThinkingBudgetMinimal()).toBe(1024);
			expect(manager.getThinkingBudgetLow()).toBe(2048);
			expect(manager.getThinkingBudgetMedium()).toBe(8192);
			expect(manager.getThinkingBudgetHigh()).toBe(16384);
			expect(manager.getThinkingBudgetXHigh()).toBe(32768);
		});

		it("should allow setting individual levels", () => {
			const manager = SettingsManager.inMemory();

			manager.setThinkingBudgetMinimal(512);
			manager.setThinkingBudgetHigh(20000);

			expect(manager.getThinkingBudgetMinimal()).toBe(512);
			expect(manager.getThinkingBudgetLow()).toBe(2048); // unchanged
			expect(manager.getThinkingBudgetHigh()).toBe(20000);
		});

		it("should return all budgets as object via getThinkingBudgets", () => {
			const manager = SettingsManager.inMemory();

			const budgets = manager.getThinkingBudgets();

			expect(budgets).toEqual({
				minimal: 1024,
				low: 2048,
				medium: 8192,
				high: 16384,
				xhigh: 32768,
			});
		});
	});

	describe("migration from old record format", () => {
		it("should migrate old record format to dotted keys on load", () => {
			// Simulate old settings file with record format
			const oldSettings = {
				thinkingBudgets: {
					high: 5000,
					minimal: 2000,
				},
			};

			const manager = SettingsManager.inMemory(oldSettings);

			// After migration, should have dotted keys
			expect(manager.getThinkingBudgetHigh()).toBe(5000);
			expect(manager.getThinkingBudgetMinimal()).toBe(2000);
			// Others should have defaults
			expect(manager.getThinkingBudgetLow()).toBe(2048);
			expect(manager.getThinkingBudgetMedium()).toBe(8192);
		});

		it("should handle empty record as all defaults", () => {
			const oldSettings = {
				thinkingBudgets: {},
			};

			const manager = SettingsManager.inMemory(oldSettings);

			expect(manager.getThinkingBudgetMinimal()).toBe(1024);
			expect(manager.getThinkingBudgetHigh()).toBe(16384);
		});
	});

	describe("settings registry integration", () => {
		it("should expose dotted keys via SettingsManager getters", () => {
			const manager = SettingsManager.inMemory();

			// Verify individual keys work through dedicated getters
			// (which use generic get() with hardcoded defaults)
			expect(manager.getThinkingBudgetMinimal()).toBe(1024);
			expect(manager.getThinkingBudgetHigh()).toBe(16384);

			// After setting a value, it should be retrievable via generic get()
			manager.setThinkingBudgetMinimal(2048);
			expect(manager.get("thinkingBudgets.minimal")).toBe(2048);
		});
	});
});
