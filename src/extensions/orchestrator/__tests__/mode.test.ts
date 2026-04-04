/**
 * Tests for mode detection — getFirmState, setFirmState, mode logic
 *
 * TDD: these tests define the contract. Implementation follows.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const tmpDir = join(import.meta.dir, "__tmp_mode_test__");

beforeEach(() => {
	if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
	mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
	if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

function writeFirmConfig(config: Record<string, unknown>) {
	const firmDir = join(tmpDir, ".pi", "firm");
	mkdirSync(firmDir, { recursive: true });
	writeFileSync(join(firmDir, "config.json"), JSON.stringify(config, null, "\t"), "utf-8");
}

function readFirmConfig(): Record<string, unknown> {
	const p = join(tmpDir, ".pi", "firm", "config.json");
	if (!existsSync(p)) return {};
	return JSON.parse(require("node:fs").readFileSync(p, "utf-8"));
}

// ── getFirmState ─────────────────────────────────

describe("getFirmState", () => {
	test("returns ad-hoc mode when no config exists", async () => {
		const { getFirmState } = await import("../mode.js");
		const result = getFirmState(tmpDir);
		expect(result.mode).toBe("ad-hoc");
		expect(result.hasFirm).toBe(false);
	});

	test("returns ad-hoc mode when config has no firmState", async () => {
		writeFirmConfig({ firm: { version: 1 } });
		const { getFirmState } = await import("../mode.js");
		const result = getFirmState(tmpDir);
		expect(result.mode).toBe("ad-hoc");
		expect(result.hasFirm).toBe(true);
	});

	test("returns ad-hoc mode when firmState is paused", async () => {
		writeFirmConfig({ firm: { version: 1 }, firmState: "paused" });
		const { getFirmState } = await import("../mode.js");
		const result = getFirmState(tmpDir);
		expect(result.mode).toBe("ad-hoc");
		expect(result.hasFirm).toBe(true);
	});

	test("returns firm mode when firmState is active", async () => {
		writeFirmConfig({ firm: { version: 1 }, firmState: "active" });
		const { getFirmState } = await import("../mode.js");
		const result = getFirmState(tmpDir);
		expect(result.mode).toBe("firm");
		expect(result.hasFirm).toBe(true);
	});

	test("returns ad-hoc mode when config is corrupt JSON", async () => {
		const firmDir = join(tmpDir, ".pi", "firm");
		mkdirSync(firmDir, { recursive: true });
		writeFileSync(join(firmDir, "config.json"), "BROKEN{{{", "utf-8");
		const { getFirmState } = await import("../mode.js");
		const result = getFirmState(tmpDir);
		expect(result.mode).toBe("ad-hoc");
		expect(result.hasFirm).toBe(false);
	});
});

// ── setFirmState ─────────────────────────────────

describe("setFirmState", () => {
	test("creates config with firmState", async () => {
		const { setFirmState } = await import("../mode.js");
		setFirmState(tmpDir, "paused");
		const config = readFirmConfig();
		expect(config.firmState).toBe("paused");
	});

	test("creates .pi/firm/ directory if missing", async () => {
		const { setFirmState } = await import("../mode.js");
		expect(existsSync(join(tmpDir, ".pi", "firm"))).toBe(false);
		setFirmState(tmpDir, "active");
		expect(existsSync(join(tmpDir, ".pi", "firm", "config.json"))).toBe(true);
	});

	test("preserves existing fields when updating", async () => {
		writeFirmConfig({
			firm: { version: 1 },
			client: { display_name: "Chris" },
			firmState: "active",
		});
		const { setFirmState } = await import("../mode.js");
		setFirmState(tmpDir, "paused");
		const config = readFirmConfig();
		expect(config.firmState).toBe("paused");
		expect((config as any).client.display_name).toBe("Chris");
	});

	test("overwrites corrupt config with just firmState", async () => {
		const firmDir = join(tmpDir, ".pi", "firm");
		mkdirSync(firmDir, { recursive: true });
		writeFileSync(join(firmDir, "config.json"), "BROKEN", "utf-8");
		const { setFirmState } = await import("../mode.js");
		setFirmState(tmpDir, "active");
		const config = readFirmConfig();
		expect(config.firmState).toBe("active");
	});
});

// ── Mode transitions ────────────────────────────

describe("Mode transitions", () => {
	test("no config → pause → resume cycle", async () => {
		const { getFirmState, setFirmState } = await import("../mode.js");

		let state = getFirmState(tmpDir);
		expect(state.mode).toBe("ad-hoc");

		setFirmState(tmpDir, "paused");
		state = getFirmState(tmpDir);
		expect(state.mode).toBe("ad-hoc"); // paused = still ad-hoc

		setFirmState(tmpDir, "active");
		state = getFirmState(tmpDir);
		expect(state.mode).toBe("firm");
	});

	test("toggling back and forth preserves config", async () => {
		writeFirmConfig({ firm: { version: 1 }, client: { display_name: "Test" } });
		const { getFirmState, setFirmState } = await import("../mode.js");

		setFirmState(tmpDir, "active");
		expect(getFirmState(tmpDir).mode).toBe("firm");
		setFirmState(tmpDir, "paused");
		expect(getFirmState(tmpDir).mode).toBe("ad-hoc");
		setFirmState(tmpDir, "active");
		expect(getFirmState(tmpDir).mode).toBe("firm");

		const config = readFirmConfig();
		expect((config as any).client.display_name).toBe("Test");
	});
});
