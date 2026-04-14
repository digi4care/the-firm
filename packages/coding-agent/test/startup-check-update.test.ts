import { beforeAll, describe, expect, it } from "vitest";
import { bootstrapSettings } from "../src/core/settings-bootstrap.js";
import { SettingsManager } from "../src/core/settings-manager.js";

beforeAll(() => {
	bootstrapSettings();
});

describe("startup.checkUpdate setting", () => {
	it("should default to true", () => {
		const manager = SettingsManager.inMemory();
		expect(manager.getStartupCheckUpdate()).toBe(true);
	});

	it("should allow disabling", () => {
		const manager = SettingsManager.inMemory({
			startup: { checkUpdate: false },
		});
		expect(manager.getStartupCheckUpdate()).toBe(false);
	});
});

describe("notification settings", () => {
	it("should default completion.notify to true", () => {
		const manager = SettingsManager.inMemory();
		expect(manager.getCompletionNotify()).toBe(true);
	});

	it("should allow disabling completion.notify", () => {
		const manager = SettingsManager.inMemory({
			completion: { notify: false },
		});
		expect(manager.getCompletionNotify()).toBe(false);
	});

	it("should default ask.notify to true", () => {
		const manager = SettingsManager.inMemory();
		expect(manager.getAskNotify()).toBe(true);
	});

	it("should allow setting ask.timeout", () => {
		const manager = SettingsManager.inMemory({
			ask: { timeout: 60 },
		});
		expect(manager.getAskTimeout()).toBe(60);
	});
});

describe("STT settings", () => {
	it("should default stt.enabled to false", () => {
		const manager = SettingsManager.inMemory();
		expect(manager.getSttEnabled()).toBe(false);
	});

	it("should allow configuring STT", () => {
		const manager = SettingsManager.inMemory({
			stt: { enabled: true, language: "nl", modelName: "small" },
		});
		expect(manager.getSttEnabled()).toBe(true);
		expect(manager.getSttLanguage()).toBe("nl");
		expect(manager.getSttModelName()).toBe("small");
	});
});
