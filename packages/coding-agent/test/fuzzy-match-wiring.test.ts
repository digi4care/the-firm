import { beforeAll, describe, expect, it } from "vitest";
import { bootstrapSettings } from "../src/core/settings-bootstrap.js";
import { SettingsManager } from "../src/core/settings-manager.js";
import { fuzzyFindText } from "../src/core/tools/edit-diff.js";

beforeAll(() => {
	bootstrapSettings();
});

describe("fuzzyFindText with options", () => {
	it("finds exact match regardless of fuzzyMatch setting", () => {
		const result = fuzzyFindText("hello world", "hello", { fuzzyMatch: false });
		expect(result.found).toBe(true);
		expect(result.usedFuzzyMatch).toBe(false);
	});

	it("finds fuzzy match for Unicode quotes when fuzzyMatch is true (default)", () => {
		// curly quote → straight quote via normalizeForFuzzyMatch
		const content = "hello \u201Cworld\u201D";
		const result = fuzzyFindText(content, 'hello "world"');
		expect(result.found).toBe(true);
		expect(result.usedFuzzyMatch).toBe(true);
	});

	it("rejects fuzzy match when fuzzyMatch is false", () => {
		const content = "hello \u201Cworld\u201D";
		const result = fuzzyFindText(content, 'hello "world"', { fuzzyMatch: false });
		expect(result.found).toBe(false);
	});

	it("defaults fuzzyMatch to true when options not provided", () => {
		const content = "hello \u201Cworld\u201D";
		const result = fuzzyFindText(content, 'hello "world"');
		expect(result.found).toBe(true);
	});
});

describe("fuzzy match settings", () => {
	it("getEditFuzzyMatch defaults to true", () => {
		const manager = SettingsManager.inMemory();
		expect(manager.getEditFuzzyMatch()).toBe(true);
	});

	it("getEditFuzzyMatch can be disabled", () => {
		const manager = SettingsManager.inMemory({
			edit: { fuzzyMatch: false },
		});
		expect(manager.getEditFuzzyMatch()).toBe(false);
	});

	it("getEditFuzzyThreshold defaults to 0.95", () => {
		const manager = SettingsManager.inMemory();
		expect(manager.getEditFuzzyThreshold()).toBe(0.95);
	});
});
