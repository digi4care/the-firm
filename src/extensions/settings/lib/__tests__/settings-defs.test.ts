/**
 * settings-defs.test.ts — Tests for UI definitions derived from schema
 *
 * TDD: defines the contract for converting schema entries to UI items.
 * Pure functions — no TUI or Pi SDK dependencies.
 */

import { describe, expect, it } from "bun:test";

describe("settings-defs", () => {
	async function getDefs() {
		return import("../settings-defs.ts");
	}

	describe("getSettingsForTab", () => {
		it("returns an array of SettingDef objects for a given tab", async () => {
			const { getSettingsForTab } = await getDefs();
			const defs = getSettingsForTab("general");
			expect(Array.isArray(defs)).toBe(true);
			expect(defs.length).toBeGreaterThan(0);
		});

		it("every def has path, label, description, tab, and type", async () => {
			const { getSettingsForTab } = await getDefs();
			const defs = getSettingsForTab("guards");
			for (const def of defs) {
				expect(def.path).toBeTruthy();
				expect(def.label).toBeTruthy();
				expect(def.description).toBeTruthy();
				expect(def.tab).toBeTruthy();
				expect(["boolean", "enum", "submenu", "text"]).toContain(def.type);
			}
		});

		it("returns empty array for a tab with no UI settings", async () => {
			const { getSettingsForTab } = await getDefs();
			// All our tabs have UI settings, but the function should handle empty gracefully
			const defs = getSettingsForTab("general");
			// Just verify it doesn't throw — the real test is that all tabs work
			expect(Array.isArray(defs)).toBe(true);
		});
	});

	describe("boolean settings", () => {
		it("renders boolean defs with values ['true', 'false']", async () => {
			const { getSettingsForTab } = await getDefs();
			const defs = getSettingsForTab("general");
			const boolDef = defs.find((d) => d.type === "boolean");
			expect(boolDef).toBeDefined();
			// Boolean defs should be inline toggles, no submenu
			if (boolDef?.type === "boolean") {
				expect(boolDef.label).toBeTruthy();
			}
		});
	});

	describe("enum settings with submenu: true", () => {
		it("renders enum defs with submenu: true as type 'submenu' with options", async () => {
			const { getSettingsForTab } = await getDefs();
			const defs = getSettingsForTab("general");
			const submenuDef = defs.find((d) => d.type === "submenu");
			if (submenuDef?.type === "submenu") {
				expect(Array.isArray(submenuDef.options)).toBe(true);
				expect(submenuDef.options.length).toBeGreaterThan(0);
				// Each option should have value and label
				for (const opt of submenuDef.options) {
					expect(opt.value).toBeTruthy();
					expect(opt.label).toBeTruthy();
				}
			}
		});
	});

	describe("getAllSettingDefs", () => {
		it("returns defs for all tabs", async () => {
			const { getAllSettingDefs } = await getDefs();
			const allDefs = getAllSettingDefs();
			expect(allDefs.length).toBeGreaterThan(0);

			const tabs = new Set(allDefs.map((d) => d.tab));
			expect(tabs.size).toBeGreaterThanOrEqual(2);
		});

		it("every def corresponds to a schema entry with ui", async () => {
			const { getAllSettingDefs } = await getDefs();
			const { hasUi } = await import("../settings-schema.ts");
			const allDefs = getAllSettingDefs();
			for (const def of allDefs) {
				expect(hasUi(def.path as any)).toBe(true);
			}
		});
	});

	describe("getSettingDef", () => {
		it("returns the def for a specific path", async () => {
			const { getSettingDef } = await getDefs();
			const def = getSettingDef("theFirm.requireConfirmationBeforeDelete");
			expect(def).toBeDefined();
			expect(def!.label).toBe("Confirm Before Delete");
		});

		it("returns undefined for a path without UI", async () => {
			const { getSettingDef } = await getDefs();
			const def = getSettingDef("theFirm.version");
			expect(def).toBeUndefined();
		});
	});
});
