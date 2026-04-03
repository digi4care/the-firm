/**
 * workflow-settings.test.ts — Tests for the workflow-settings extension
 *
 * Tests all four event handlers:
 *   - session_start: syncs compaction settings to .pi/settings.json
 *   - session_before_compact: blocks when autoCompact off or strategy off
 *   - session_compact: saves handoff to .local/HANDOFF.md
 *   - session_shutdown: saves handoff + last-session.json
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- Temp dir ---

const TMP_DIR = join(tmpdir(), "tf-workflow-settings-test");
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

// --- Mock Pi ---

function createMockPi() {
	const handlers: Record<string, Function> = {};
	return {
		on: vi.fn((event: string, handler: Function) => {
			handlers[event] = handler;
		}),
		getHandler: (event: string) => handlers[event],
	};
}

// --- Settings helper ---

function writeSettings(settings: Record<string, unknown>) {
	writeFileSync(
		join(TMP_DIR, ".pi", "settings.json"),
		JSON.stringify(settings, null, "\t"),
		"utf-8",
	);
}

function readSettings(): Record<string, unknown> {
	const path = join(TMP_DIR, ".pi", "settings.json");
	if (!existsSync(path)) return {};
	return JSON.parse(readFileSync(path, "utf-8"));
}

// ================================================================
// session_start: syncCompactionSettingsToPi
// ================================================================

describe("session_start — sync compaction settings", () => {
	it("writes default compaction block to .pi/settings.json", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("session_start");
		await handler();

		const settings = readSettings();
		expect(settings.theFirm).toBeDefined(); // preserved
		expect(settings.compaction).toEqual({
			enabled: true,
			strategy: "context-full",
			thresholdPercent: -1,
			thresholdTokens: -1,
			reserveTokens: 16384,
			keepRecentTokens: 20000,
			autoContinue: true,
		});
	});

	it("syncs custom compaction settings", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "off" },
				compaction: {
					thresholdPercent: 80,
					thresholdTokens: 5000,
					reserveTokens: 8000,
					keepRecentTokens: 10000,
					autoContinue: false,
				},
				session: { autoCompact: false },
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")();

		const settings = readSettings();
		expect(settings.compaction).toMatchObject({
			enabled: false,
			strategy: "off",
			thresholdPercent: 80,
			thresholdTokens: 5000,
			reserveTokens: 8000,
			keepRecentTokens: 10000,
			autoContinue: false,
		});
	});

	it("preserves other keys in settings.json", async () => {
		writeSettings({
			theFirm: { requireConfirmationBeforeDelete: true },
			customKey: "preserved",
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")();

		const settings = readSettings();
		expect(settings.customKey).toBe("preserved");
		expect(settings.compaction).toBeDefined();
	});

	it("creates .pi dir if missing", async () => {
		rmSync(join(TMP_DIR, ".pi"), { recursive: true, force: true });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")();

		expect(existsSync(join(TMP_DIR, ".pi", "settings.json"))).toBe(true);
	});
});

// ================================================================
// session_before_compact: blocking logic
// ================================================================

describe("session_before_compact — blocking logic", () => {
	it("allows compaction by default (autoCompact on, strategy context-full)", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const result = await mockPi.getHandler("session_before_compact")({}, {});
		expect(result).toBeUndefined();
	});

	it("blocks compaction when autoCompact is false", async () => {
		writeSettings({ theFirm: { session: { autoCompact: false } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const result = await mockPi.getHandler("session_before_compact")({}, {});
		expect(result).toEqual({ cancel: true });
	});

	it("blocks compaction when strategy is off", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "off" } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const result = await mockPi.getHandler("session_before_compact")({}, {});
		expect(result).toEqual({ cancel: true });
	});

	it("allows compaction when strategy is context-full", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "context-full" } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const result = await mockPi.getHandler("session_before_compact")({}, {});
		expect(result).toBeUndefined();
	});

	it("allows compaction when strategy is handoff", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "handoff" } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const result = await mockPi.getHandler("session_before_compact")({}, {});
		expect(result).toBeUndefined();
	});

	it("autoCompact=false overrides strategy", async () => {
		// Even with a valid strategy, autoCompact off should block
		writeSettings({
			theFirm: {
				session: { autoCompact: false },
				workflows: { compactionStrategy: "context-full" },
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const result = await mockPi.getHandler("session_before_compact")({}, {});
		expect(result).toEqual({ cancel: true });
	});
});

// ================================================================
// session_compact: handoff saving
// ================================================================

describe("session_compact — handoff saving", () => {
	it("does nothing when handoffSaveToDisk is false", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = {
			sessionManager: {
				getEntries: () => [],
			},
		};

		await mockPi.getHandler("session_compact")({}, mockCtx);

		expect(existsSync(join(TMP_DIR, ".local", "HANDOFF.md"))).toBe(false);
	});

	it("saves handoff when handoffSaveToDisk is true and messages >= 2", async () => {
		writeSettings({ theFirm: { compaction: { handoffSaveToDisk: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = {
			sessionManager: {
				getEntries: () => [
					{ type: "message", message: { role: "user", content: "Hallo" } },
					{ type: "message", message: { role: "assistant", content: "Hoi!" } },
				],
			},
		};

		await mockPi.getHandler("session_compact")({}, mockCtx);

		const handoffPath = join(TMP_DIR, ".local", "HANDOFF.md");
		expect(existsSync(handoffPath)).toBe(true);

		const content = readFileSync(handoffPath, "utf-8");
		expect(content).toContain("# Handoff — Auto-Saved");
		expect(content).toContain("**User:** Hallo");
		expect(content).toContain("**Assistant:** Hoi!...");
	});

	it("skips handoff when fewer than 2 messages", async () => {
		writeSettings({ theFirm: { compaction: { handoffSaveToDisk: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = {
			sessionManager: {
				getEntries: () => [
					{ type: "message", message: { role: "user", content: "Alleen ik" } },
				],
			},
		};

		await mockPi.getHandler("session_compact")({}, mockCtx);

		expect(existsSync(join(TMP_DIR, ".local", "HANDOFF.md"))).toBe(false);
	});

	it("handles block content format (array of blocks)", async () => {
		writeSettings({ theFirm: { compaction: { handoffSaveToDisk: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = {
			sessionManager: {
				getEntries: () => [
					{
						type: "message",
						message: {
							role: "user",
							content: [{ type: "text", text: "Block content user" }],
						},
					},
					{
						type: "message",
						message: {
							role: "assistant",
							content: [{ type: "text", text: "Block content assistant" }],
						},
					},
				],
			},
		};

		await mockPi.getHandler("session_compact")({}, mockCtx);

		const content = readFileSync(join(TMP_DIR, ".local", "HANDOFF.md"), "utf-8");
		expect(content).toContain("Block content user");
		expect(content).toContain("Block content assistant");
	});

	it("truncates long messages to 200 chars", async () => {
		writeSettings({ theFirm: { compaction: { handoffSaveToDisk: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const longText = "x".repeat(300);
		const mockCtx = {
			sessionManager: {
				getEntries: () => [
					{ type: "message", message: { role: "user", content: longText } },
					{ type: "message", message: { role: "assistant", content: "ok" } },
				],
			},
		};

		await mockPi.getHandler("session_compact")({}, mockCtx);

		const content = readFileSync(join(TMP_DIR, ".local", "HANDOFF.md"), "utf-8");
		// The user line should be truncated: "**User:** " + 200 chars
		const userLine = content.split("\n").find((l: string) => l.startsWith("**User:**"))!;
		expect(userLine.length).toBeLessThan(longText.length + 10);
	});
});

// ================================================================
// session_shutdown: save state + handoff
// ================================================================

describe("session_shutdown — save on exit", () => {
	it("does nothing when both saveOnExit and handoffSaveToDisk are false", async () => {
		writeSettings({
			theFirm: {
				session: { saveOnExit: false },
				compaction: { handoffSaveToDisk: false },
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")();

		expect(existsSync(join(TMP_DIR, ".local", "HANDOFF.md"))).toBe(false);
		expect(existsSync(join(TMP_DIR, ".pi", "firm", "last-session.json"))).toBe(false);
	});

	it("saves last-session.json when saveOnExit is true", async () => {
		writeSettings({ theFirm: { session: { saveOnExit: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")();

		const lastSessionPath = join(TMP_DIR, ".pi", "firm", "last-session.json");
		expect(existsSync(lastSessionPath)).toBe(true);

		const data = JSON.parse(readFileSync(lastSessionPath, "utf-8"));
		expect(data.closedAt).toBeDefined();
		expect(data.cwd).toBe(TMP_DIR);
	});

	it("saves HANDOFF.md when handoffSaveToDisk is true", async () => {
		writeSettings({ theFirm: { compaction: { handoffSaveToDisk: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")();

		const handoffPath = join(TMP_DIR, ".local", "HANDOFF.md");
		expect(existsSync(handoffPath)).toBe(true);

		const content = readFileSync(handoffPath, "utf-8");
		expect(content).toContain("# Handoff — Session End");
	});

	it("saves both handoff and last-session when both enabled", async () => {
		writeSettings({
			theFirm: {
				session: { saveOnExit: true },
				compaction: { handoffSaveToDisk: true },
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")();

		expect(existsSync(join(TMP_DIR, ".local", "HANDOFF.md"))).toBe(true);
		expect(existsSync(join(TMP_DIR, ".pi", "firm", "last-session.json"))).toBe(true);
	});

	it("creates .pi/firm dir if missing", async () => {
		writeSettings({ theFirm: { session: { saveOnExit: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")();

		expect(existsSync(join(TMP_DIR, ".pi", "firm", "last-session.json"))).toBe(true);
	});
});

// ================================================================
// Extension registration
// ================================================================

describe("workflow-settings registration", () => {
	it("registers all four event handlers", async () => {
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_before_compact", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_compact", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_shutdown", expect.any(Function));
	});
});
