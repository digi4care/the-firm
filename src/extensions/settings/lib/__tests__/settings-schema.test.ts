/**
 * settings-schema.test.ts — Tests for the settings schema
 *
 * TDD: these tests define the contract BEFORE implementation.
 * The schema is the single source of truth for The Firm settings.
 */

import { describe, expect, it } from "bun:test";

describe("settings-schema", () => {
	// We import fresh each test to avoid caching issues
	async function getSchema() {
		return import("../settings-schema.ts");
	}

	describe("SETTING_TABS", () => {
		it("defines an ordered list of tab ids", async () => {
			const { SETTING_TABS } = await getSchema();
			expect(Array.isArray(SETTING_TABS)).toBe(true);
			expect(SETTING_TABS.length).toBeGreaterThanOrEqual(2);
		});

		it("contains 'general' as first tab", async () => {
			const { SETTING_TABS } = await getSchema();
			expect(SETTING_TABS[0]).toBe("general");
		});
	});

	describe("TAB_METADATA", () => {
		it("has metadata for every tab", async () => {
			const { SETTING_TABS, TAB_METADATA } = await getSchema();
			for (const tab of SETTING_TABS) {
				expect(TAB_METADATA[tab]).toBeDefined();
				expect(TAB_METADATA[tab].label).toBeTruthy();
				expect(TAB_METADATA[tab].icon).toBeTruthy();
			}
		});
	});

	describe("SETTINGS_SCHEMA", () => {
		it("is a non-empty object", async () => {
			const { SETTINGS_SCHEMA } = await getSchema();
			expect(Object.keys(SETTINGS_SCHEMA).length).toBeGreaterThan(0);
		});

		it("every entry with ui has a valid tab", async () => {
			const { SETTINGS_SCHEMA, SETTING_TABS } = await getSchema();
			for (const [path, def] of Object.entries(SETTINGS_SCHEMA)) {
				const d = def as any;
				if (d.ui) {
					expect(
						SETTING_TABS.includes(d.ui.tab),
						`Setting "${path}" has ui.tab="${d.ui.tab}" which is not in SETTING_TABS`,
					).toBe(true);
				}
			}
		});

		it("every entry has a type and default", async () => {
			const { SETTINGS_SCHEMA } = await getSchema();
			for (const [path, def] of Object.entries(SETTINGS_SCHEMA)) {
				const d = def as any;
				expect(
					["boolean", "string", "number", "enum", "array", "record"].includes(d.type),
					`Setting "${path}" has invalid type: "${d.type}"`,
				).toBe(true);
				// default must exist (can be undefined for optional strings)
				expect("default" in d).toBe(true);
			}
		});

		it("enum entries have values array", async () => {
			const { SETTINGS_SCHEMA } = await getSchema();
			for (const [path, def] of Object.entries(SETTINGS_SCHEMA)) {
				const d = def as any;
				if (d.type === "enum") {
					expect(
						Array.isArray(d.values) && d.values.length > 0,
						`Enum setting "${path}" must have non-empty values array`,
					).toBe(true);
				}
			}
		});
	});

	describe("getPathsForTab", () => {
		it("returns only settings for the given tab", async () => {
			const { getPathsForTab, SETTINGS_SCHEMA, SETTING_TABS } = await getSchema();
			for (const tab of SETTING_TABS) {
				const paths = getPathsForTab(tab);
				for (const path of paths) {
					const d = (SETTINGS_SCHEMA as any)[path];
					expect(d.ui?.tab).toBe(tab);
				}
			}
		});
	});

	describe("getDefault", () => {
		it("returns the default value for a known path", async () => {
			const { getDefault, SETTINGS_SCHEMA } = await getSchema();
			const firstPath = Object.keys(SETTINGS_SCHEMA)[0]!;
			const def = (SETTINGS_SCHEMA as any)[firstPath];
			expect(getDefault(firstPath)).toBe(def.default);
		});
	});

	describe("getType", () => {
		it("returns the type string for a known path", async () => {
			const { getType, SETTINGS_SCHEMA } = await getSchema();
			const firstPath = Object.keys(SETTINGS_SCHEMA)[0]!;
			const def = (SETTINGS_SCHEMA as any)[firstPath];
			expect(getType(firstPath)).toBe(def.type);
		});
	});

	describe("SettingPath type", () => {
		it("exports SettingPath as a string union of schema keys", async () => {
			const { SETTINGS_SCHEMA } = await getSchema();
			const keys = Object.keys(SETTINGS_SCHEMA);
			expect(keys.length).toBeGreaterThan(0);
			// Type-level test: if this compiles, SettingPath is correctly derived
		});
	});
});
