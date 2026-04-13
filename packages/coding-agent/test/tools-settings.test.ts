import { describe, expect, it } from "vitest";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("Tools settings", () => {
	describe("settings manager getters", () => {
		it("should return default values for tool toggles", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.getGrepEnabled()).toBe(true);
			expect(manager.getFindEnabled()).toBe(true);
			expect(manager.getFetchEnabled()).toBe(true);
			expect(manager.getBrowserEnabled()).toBe(true);
			expect(manager.getBrowserHeadless()).toBe(true);
		});

		it("should allow disabling tool toggles", () => {
			const manager = SettingsManager.inMemory({
				grep: { enabled: false },
				find: { enabled: false },
				fetch: { enabled: false },
				browser: { enabled: false, headless: false },
			});

			expect(manager.getGrepEnabled()).toBe(false);
			expect(manager.getFindEnabled()).toBe(false);
			expect(manager.getFetchEnabled()).toBe(false);
			expect(manager.getBrowserEnabled()).toBe(false);
			expect(manager.getBrowserHeadless()).toBe(false);
		});
	});
});
