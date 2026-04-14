import { describe, expect, it } from "vitest";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("Tools settings", () => {
	describe("settings manager getters", () => {
		it("should return default values for wired tool toggles", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.getGrepEnabled()).toBe(true);
			expect(manager.getFindEnabled()).toBe(true);
		});

		it("should not expose getters for removed tool settings", () => {
			const manager = SettingsManager.inMemory();

			expect("getFetchEnabled" in manager).toBe(false);
			expect("getBrowserEnabled" in manager).toBe(false);
			expect("getBrowserHeadless" in manager).toBe(false);
		});

		it("should allow disabling wired tool toggles", () => {
			const manager = SettingsManager.inMemory({
				grep: { enabled: false },
				find: { enabled: false },
			});

			expect(manager.getGrepEnabled()).toBe(false);
			expect(manager.getFindEnabled()).toBe(false);
		});
	});
});
