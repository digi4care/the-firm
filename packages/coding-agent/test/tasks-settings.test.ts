import { beforeAll, describe, expect, it } from "vitest";
import { bootstrapSettings } from "../src/core/settings-bootstrap.js";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("Tasks settings", () => {
	beforeAll(() => {
		bootstrapSettings();
	});
	describe("defaults", () => {
		it("should return default value for skill commands", () => {
			const manager = SettingsManager.inMemory();
			expect(manager.get("enableSkillCommands")).toBe(true);
		});

		it("should not register task delegation settings for non-existent subagent system", () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get("task.isolation.mode")).toBeUndefined();
			expect(manager.get("task.isolation.merge")).toBeUndefined();
			expect(manager.get("task.isolation.commits")).toBeUndefined();
			expect(manager.get("task.eager")).toBeUndefined();
			expect(manager.get("task.maxConcurrency")).toBeUndefined();
			expect(manager.get("task.maxRecursionDepth")).toBeUndefined();
			expect(manager.get("task.disabledAgents")).toBeUndefined();
			expect(manager.get("task.agentModelOverrides")).toBeUndefined();
			expect(manager.get("tasks.todoClearDelay")).toBeUndefined();
		});
	});

	describe("overrides", () => {
		it("should allow disabling skill commands", () => {
			const manager = SettingsManager.inMemory({
				enableSkillCommands: false,
			});
			expect(manager.get("enableSkillCommands")).toBe(false);
		});
	});
});
