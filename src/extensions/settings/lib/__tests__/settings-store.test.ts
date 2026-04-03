/**
 * settings-store.test.ts — Tests for reading/writing The Firm settings
 *
 * TDD: persistence layer for settings. Reads/writes .pi/settings.json (runtime layer).
 * Tests use a temp directory to avoid touching real files.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP_DIR = join(tmpdir(), "tf-settings-store-test");
const SETTINGS_PATH = join(TMP_DIR, ".pi", "settings.json");

// Stub process.cwd for tests
const originalCwd = process.cwd;

beforeEach(() => {
	rmSync(TMP_DIR, { recursive: true, force: true });
	mkdirSync(join(TMP_DIR, ".pi"), { recursive: true });
	process.cwd = () => TMP_DIR;
});

afterEach(() => {
	process.cwd = originalCwd;
	rmSync(TMP_DIR, { recursive: true, force: true });
});

describe("settings-store", () => {
	async function getStore() {
		return import("../settings-store.ts");
	}

	describe("readSettings", () => {
		it("returns empty object when no settings file exists", async () => {
			const { readSettings } = await getStore();
			const settings = readSettings();
			expect(settings).toEqual({});
		});

		it("reads existing settings.json", async () => {
			writeFileSync(SETTINGS_PATH, JSON.stringify({ theFirm: { autoSessionName: true } }));
			const { readSettings } = await getStore();
			const settings = readSettings();
			expect(settings.theFirm.autoSessionName).toBe(true);
		});

		it("handles malformed JSON gracefully", async () => {
			writeFileSync(SETTINGS_PATH, "NOT JSON{{{");
			const { readSettings } = await getStore();
			const settings = readSettings();
			expect(settings).toEqual({});
		});
	});

	describe("getSetting", () => {
		it("returns the value for a known path", async () => {
			writeFileSync(SETTINGS_PATH, JSON.stringify({ theFirm: { autoSessionName: false } }));
			const { getSetting } = await getStore();
			expect(getSetting("theFirm.autoSessionName")).toBe(false);
		});

		it("returns undefined for missing path", async () => {
			writeFileSync(SETTINGS_PATH, JSON.stringify({ theFirm: {} }));
			const { getSetting } = await getStore();
			expect(getSetting("theFirm.autoSessionName")).toBeUndefined();
		});

		it("returns undefined when no file exists", async () => {
			const { getSetting } = await getStore();
			expect(getSetting("theFirm.autoSessionName")).toBeUndefined();
		});
	});

	describe("setSetting", () => {
		it("writes a new setting to file", async () => {
			const { setSetting, readSettings } = await getStore();
			setSetting("theFirm.autoSessionName", true);

			const settings = readSettings();
			expect(settings.theFirm.autoSessionName).toBe(true);
		});

		it("updates existing setting without losing others", async () => {
			writeFileSync(
				SETTINGS_PATH,
				JSON.stringify({ theFirm: { autoSessionName: false, aceReflection: true } }),
			);
			const { setSetting, readSettings } = await getStore();
			setSetting("theFirm.autoSessionName", true);

			const settings = readSettings();
			expect(settings.theFirm.autoSessionName).toBe(true);
			expect(settings.theFirm.aceReflection).toBe(true);
		});

		it("creates nested path structure", async () => {
			const { setSetting, readSettings } = await getStore();
			setSetting("theFirm.guards.blockProtectedPaths", true);

			const settings = readSettings();
			expect(settings.theFirm.guards.blockProtectedPaths).toBe(true);
		});
	});

	describe("getSettingsMap", () => {
		it("returns a flat Map of dotted paths to string values", async () => {
			writeFileSync(
				SETTINGS_PATH,
				JSON.stringify({
					theFirm: {
						autoSessionName: true,
						guards: { blockProtectedPaths: false },
					},
				}),
			);
			const { getSettingsMap } = await getStore();
			const map = getSettingsMap();

			expect(map.get("theFirm.autoSessionName")).toBe("true");
			expect(map.get("theFirm.guards.blockProtectedPaths")).toBe("false");
		});

		it("returns empty map when no file exists", async () => {
			const { getSettingsMap } = await getStore();
			const map = getSettingsMap();
			expect(map.size).toBe(0);
		});
	});
});
