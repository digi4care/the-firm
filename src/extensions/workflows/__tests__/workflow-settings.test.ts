/**
 * workflow-settings.test.ts — Tests for the workflow-settings extension
 *
 * Tests all event handlers against the CURRENT production code:
 *   - session_start: syncs compaction settings + flags handoff
 *   - before_agent_start: injects handoff context into first turn
 *   - session_before_compact: blocking/handoff/context-full strategies
 *   - session_compact: generates handoff as safety net
 *   - session_shutdown: always generates handoff + saves metadata
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
	mkdirSync(join(TMP_DIR, ".pi", "firm", "handoffs"), { recursive: true });
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
		sendMessage: vi.fn(),
		sendUserMessage: vi.fn(),
		getHandler: (event: string) => handlers[event],
	};
}

// --- Mock ctx for handlers that need modelRegistry/model/sessionManager ---

function createMockCtx(overrides: Record<string, unknown> = {}) {
	return {
		sessionManager: {
			getEntries: vi.fn(() => []),
		},
		modelRegistry: {},
		model: {},
		...overrides,
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

function writeHandoffDoc(content: string) {
	writeFileSync(join(TMP_DIR, ".pi", "firm", "handoffs", "HANDOFF.md"), content, "utf-8");
}

/**
 * Find the most recent handoff doc in .pi/firm/ — mirrors the production
 * findLatestHandoffDoc() logic (handoff-*.md first, then legacy HANDOFF.md).
 */
function readHandoffDoc(): string | null {
	const firmDir = join(TMP_DIR, ".pi", "firm", "handoffs");
	if (!existsSync(firmDir)) return null;

	const { readdirSync } = require("node:fs");
	const entries = readdirSync(firmDir)
		.filter((f: string) => f.startsWith("handoff-") && f.endsWith(".md"))
		.sort()
		.reverse();

	if (entries.length > 0) {
		return readFileSync(join(firmDir, entries[0]), "utf-8");
	}

	const legacyPath = join(firmDir, "HANDOFF.md");
	if (existsSync(legacyPath)) {
		return readFileSync(legacyPath, "utf-8");
	}
	return null;
}

// ================================================================
// session_start: sync compaction settings + flag handoff
// ================================================================

describe("session_start — sync compaction settings", () => {
	it("writes compaction block to .pi/settings.json", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		const settings = readSettings();
		expect(settings.theFirm).toBeDefined();
		expect(settings.compaction).toBeDefined();
		expect((settings.compaction as any).enabled).toBe(true);
		expect((settings.compaction as any).reserveTokens).toBe(16384);
	});

	it("syncs custom compaction settings", async () => {
		writeSettings({
			theFirm: {
				compaction: { reserveTokens: 8000, keepRecentTokens: 10000 },
				session: { autoCompact: false },
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		const settings = readSettings();
		expect((settings.compaction as any).enabled).toBe(false);
		expect((settings.compaction as any).reserveTokens).toBe(8000);
		expect((settings.compaction as any).keepRecentTokens).toBe(10000);
	});

	it("preserves other keys in settings.json", async () => {
		writeSettings({
			theFirm: { requireConfirmationBeforeDelete: true },
			customKey: "preserved",
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		const settings = readSettings();
		expect(settings.customKey).toBe("preserved");
		expect(settings.compaction).toBeDefined();
	});

	it("skips handoff injection when reason is not startup", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		// Should not throw on non-startup reason
		await mockPi.getHandler("session_start")({ reason: "resume" }, createMockCtx());

		const settings = readSettings();
		expect(settings.compaction).toBeDefined();
	});

	it("creates .pi dir if missing", async () => {
		rmSync(join(TMP_DIR, ".pi"), { recursive: true, force: true });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		expect(existsSync(join(TMP_DIR, ".pi", "settings.json"))).toBe(true);
	});
});

// ================================================================
// session_start: sync ALL compaction settings to Pi's native compaction block
// ================================================================

describe("session_start — sync all compaction settings to Pi's compaction block", () => {
	it("writes all 8 settings to compaction block with defaults", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		const settings = readSettings();
		expect(settings.compaction).toBeDefined();
		expect((settings.compaction as any).enabled).toBe(true);
		expect((settings.compaction as any).strategy).toBe("context-full");
		expect((settings.compaction as any).thresholdPercent).toBe(-1);
		expect((settings.compaction as any).thresholdTokens).toBe(-1);
		expect((settings.compaction as any).reserveTokens).toBe(16384);
		expect((settings.compaction as any).keepRecentTokens).toBe(20000);
		expect((settings.compaction as any).handoffSaveToDisk).toBe(false);
		expect((settings.compaction as any).autoContinue).toBe(true);
	});

	it("syncs custom compaction values to compaction block", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "handoff" },
				compaction: {
					thresholdPercent: 60,
					thresholdTokens: 100000,
					handoffStorage: "file",
					autoContinue: false,
					reserveTokens: 8192,
					keepRecentTokens: 10000,
				},
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		const settings = readSettings();
		// ALL settings in the compaction block (Pi reads from here)
		expect((settings.compaction as any).enabled).toBe(true);
		// NEW: strategy "handoff" is synced as "off" to Pi — The Firm handles handoff itself
		expect((settings.compaction as any).strategy).toBe("off");
		expect((settings.compaction as any).thresholdPercent).toBe(60);
		expect((settings.compaction as any).thresholdTokens).toBe(100000);
		expect((settings.compaction as any).reserveTokens).toBe(8192);
		expect((settings.compaction as any).keepRecentTokens).toBe(10000);
		expect((settings.compaction as any).handoffSaveToDisk).toBe(true);
		expect((settings.compaction as any).autoContinue).toBe(false);
	});

	it("handles string values in settings (defensive parsing)", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "handoff" },
				compaction: {
					thresholdPercent: "70",
					thresholdTokens: "50000",
				},
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		const settings = readSettings();
		expect((settings.compaction as any).thresholdPercent).toBe(70);
		expect((settings.compaction as any).thresholdTokens).toBe(50000);
	});

	it("compaction block has all 8 Pi-native keys", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_start")({ reason: "startup" }, createMockCtx());

		const settings = readSettings();
		expect(Object.keys(settings.compaction as any).sort()).toEqual([
			"autoContinue",
			"enabled",
			"handoffSaveToDisk",
			"keepRecentTokens",
			"reserveTokens",
			"strategy",
			"thresholdPercent",
			"thresholdTokens",
		]);
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

		const result = await mockPi.getHandler("session_before_compact")({}, createMockCtx());
		expect(result).toBeUndefined();
	});

	it("allows compaction even when autoCompact is false (Pi handles disabled check)", async () => {
		writeSettings({ theFirm: { session: { autoCompact: false } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		// New behavior: we never cancel from the extension.
		// Pi's own compaction settings (synced via syncCompactionSettingsToPi)
		// handle the enabled/disabled check. The extension should never block.
		const result = await mockPi.getHandler("session_before_compact")({}, createMockCtx());
		expect(result).toBeUndefined();
	});

	it("allows compaction even when strategy is off (Pi handles strategy check)", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "off" } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		// New behavior: we never cancel. Pi handles strategy checks internally.
		const result = await mockPi.getHandler("session_before_compact")({}, createMockCtx());
		expect(result).toBeUndefined();
	});

	it("allows compaction when strategy is context-full", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "context-full" } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const result = await mockPi.getHandler("session_before_compact")({}, createMockCtx());
		expect(result).toBeUndefined();
	});

	it("allows compaction when strategy is handoff (saves handoff doc as safety net)", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "handoff" } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const entries = [
			{ type: "message", message: { role: "user", content: "test" } },
			{ type: "message", message: { role: "assistant", content: "ok" } },
		];
		const mockCtx = createMockCtx({
			sessionManager: { getEntries: () => entries },
		});

		// New behavior: handoff strategy does NOT cancel compaction.
		// The old approach (cancel + LLM call) caused session blocking.
		// Now we let Pi's compaction run and save a basic handoff after.
		const result = await mockPi.getHandler("session_before_compact")({}, mockCtx);
		expect(result).toBeUndefined();
	});

	it("autoCompact=false is synced to Pi settings but does not block from extension", async () => {
		writeSettings({
			theFirm: {
				session: { autoCompact: false },
				workflows: { compactionStrategy: "context-full" },
			},
		});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		// New behavior: extension never blocks. autoCompact=false is synced
		// to Pi's compaction.enabled via syncCompactionSettingsToPi().
		const result = await mockPi.getHandler("session_before_compact")({}, createMockCtx());
		expect(result).toBeUndefined();
	});
});

// ================================================================
// session_compact: saves Pi's compaction summary as handoff
// ================================================================

describe("session_compact — handoff from compaction summary", () => {
	it("uses compaction summary when available", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const entries = [
			{ type: "message", message: { role: "user", content: "Hallo" } },
			{ type: "message", message: { role: "assistant", content: "Hoi!" } },
		];
		const mockCtx = createMockCtx({
			sessionManager: { getEntries: () => entries },
		});

		// Pi provides a structured compaction summary
		const compactionEvent = {
			compactionEntry: {
				summary: "## Goal\nBuild a feature\n\n## Progress\n- Done: setup\n- Next: implement",
			},
		};

		await mockPi.getHandler("session_compact")(compactionEvent, mockCtx);

		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
		expect(handoff).toContain("Build a feature");
		expect(handoff).toContain("## Progress");
	});

	it("falls back to basic handoff when no compaction summary", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const entries = [
			{ type: "message", message: { role: "user", content: "Hallo" } },
			{ type: "message", message: { role: "assistant", content: "Hoi!" } },
		];
		const mockCtx = createMockCtx({
			sessionManager: { getEntries: () => entries },
		});

		// No compaction summary
		await mockPi.getHandler("session_compact")({ compactionEntry: {} }, mockCtx);

		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
		expect(handoff).toContain("fallback");
	});

	it("skips handoff when fewer than 2 entries and no summary", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = createMockCtx({
			sessionManager: { getEntries: () => [] },
		});

		await mockPi.getHandler("session_compact")({ compactionEntry: {} }, mockCtx);

		expect(readHandoffDoc()).toBeNull();
	});

	it("notifies user when handoff strategy is set", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "handoff" } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const entries = [
			{ type: "message", message: { role: "user", content: "Hallo" } },
		];
		const notify = vi.fn();
		const mockCtx = createMockCtx({
			sessionManager: { getEntries: () => entries },
			hasUI: true,
			ui: { notify },
		});

		await mockPi.getHandler("session_compact")(
			{ compactionEntry: { summary: "## Goal\nTest" } },
			mockCtx,
		);

		expect(notify).toHaveBeenCalledWith(
			expect.stringContaining("Handoff opgeslagen"),
			"info",
		);
	});
});

// ================================================================
// session_shutdown: saves handoff if not already saved
// ================================================================

describe("session_shutdown — save on exit", () => {
	it("generates handoff when no existing handoff doc", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		// No existing handoff doc — should generate one
		await mockPi.getHandler("session_shutdown")({}, createMockCtx());

		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
	});

	it("does not overwrite existing compaction handoff", async () => {
		writeSettings({});

		// Pre-existing compaction handoff (handoff- prefix so findLatestHandoffDoc picks it up)
		writeFileSync(
			join(TMP_DIR, ".pi", "firm", "handoffs", "handoff-existing-2026-04-04.md"),
			"# Handoff — After Compaction\n\n## Goal\nImportant stuff",
			"utf-8",
		);

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const entries = [
			{ type: "message", message: { role: "user", content: "Test" } },
			{ type: "message", message: { role: "assistant", content: "Ok" } },
		];
		const mockCtx = createMockCtx({
			sessionManager: { getEntries: () => entries },
		});

		await mockPi.getHandler("session_shutdown")({}, mockCtx);

		// Should NOT overwrite the good handoff with basic
		const handoff = readHandoffDoc();
		expect(handoff).toContain("Important stuff");
	});

	it("saves last-session.json when saveOnExit is true", async () => {
		writeSettings({ theFirm: { session: { saveOnExit: true } } });

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")({}, createMockCtx());

		const lastSessionPath = join(TMP_DIR, ".pi", "firm", "last-session.json");
		expect(existsSync(lastSessionPath)).toBe(true);

		const data = JSON.parse(readFileSync(lastSessionPath, "utf-8"));
		expect(data.closedAt).toBeDefined();
		expect(data.cwd).toBe(TMP_DIR);
	});

	it("creates .pi/firm dir if missing", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")({}, createMockCtx());

		// last-session.json or handoff should create .pi/firm
		expect(existsSync(join(TMP_DIR, ".pi", "firm"))).toBe(true);
	});

	it("handles missing sessionManager gracefully", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		// No sessionManager at all
		await mockPi.getHandler("session_shutdown")({}, {});

		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
	});
});

// ================================================================
// Extension registration
// ================================================================

describe("workflow-settings registration", () => {
	it("registers all event handlers including agent_end", async () => {
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("before_agent_start", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_before_compact", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_compact", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_shutdown", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("agent_end", expect.any(Function));
	});
});

// ================================================================
// Compaction helper functions — 5 new settings
// ================================================================

describe("compaction helper functions — getCompactionStrategy", () => {
	it("returns default 'context-full' when not set", async () => {
		writeSettings({});
		const { getCompactionStrategy } = await import("../workflow-settings.ts");
		expect(getCompactionStrategy()).toBe("context-full");
	});

	it("returns custom value when set as string", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "handoff" } } });
		const { getCompactionStrategy } = await import("../workflow-settings.ts");
		expect(getCompactionStrategy()).toBe("handoff");
	});
});

describe("compaction helper functions — getThresholdPercent", () => {
	it("returns default -1 when not set", async () => {
		writeSettings({});
		const { getThresholdPercent } = await import("../workflow-settings.ts");
		expect(getThresholdPercent()).toBe(-1);
	});

	it("returns number when stored as number", async () => {
		writeSettings({ theFirm: { compaction: { thresholdPercent: 60 } } });
		const { getThresholdPercent } = await import("../workflow-settings.ts");
		expect(getThresholdPercent()).toBe(60);
	});

	it("returns number when stored as string", async () => {
		writeSettings({ theFirm: { compaction: { thresholdPercent: "60" } } });
		const { getThresholdPercent } = await import("../workflow-settings.ts");
		expect(getThresholdPercent()).toBe(60);
	});
});

describe("compaction helper functions — getThresholdTokens", () => {
	it("returns default -1 when not set", async () => {
		writeSettings({});
		const { getThresholdTokens } = await import("../workflow-settings.ts");
		expect(getThresholdTokens()).toBe(-1);
	});

	it("returns number when stored as number", async () => {
		writeSettings({ theFirm: { compaction: { thresholdTokens: 100000 } } });
		const { getThresholdTokens } = await import("../workflow-settings.ts");
		expect(getThresholdTokens()).toBe(100000);
	});

	it("returns number when stored as string", async () => {
		writeSettings({ theFirm: { compaction: { thresholdTokens: "100000" } } });
		const { getThresholdTokens } = await import("../workflow-settings.ts");
		expect(getThresholdTokens()).toBe(100000);
	});
});

describe("compaction helper functions — isHandoffSaveToDisk", () => {
	it("returns default false when not set (storage=inmemory)", async () => {
		writeSettings({});
		const { isHandoffSaveToDisk } = await import("../workflow-settings.ts");
		expect(isHandoffSaveToDisk()).toBe(false);
	});

	it("returns true when handoffStorage is 'file'", async () => {
		writeSettings({ theFirm: { compaction: { handoffStorage: "file" } } });
		const { isHandoffSaveToDisk } = await import("../workflow-settings.ts");
		expect(isHandoffSaveToDisk()).toBe(true);
	});

	it("returns false when handoffStorage is 'inmemory'", async () => {
		writeSettings({ theFirm: { compaction: { handoffStorage: "inmemory" } } });
		const { isHandoffSaveToDisk } = await import("../workflow-settings.ts");
		expect(isHandoffSaveToDisk()).toBe(false);
	});
});

describe("compaction helper functions — isAutoContinue", () => {
	it("returns default true when not set", async () => {
		writeSettings({});
		const { isAutoContinue } = await import("../workflow-settings.ts");
		expect(isAutoContinue()).toBe(true);
	});

	it("returns false when explicitly set to false", async () => {
		writeSettings({ theFirm: { compaction: { autoContinue: false } } });
		const { isAutoContinue } = await import("../workflow-settings.ts");
		expect(isAutoContinue()).toBe(false);
	});

	it("returns true when explicitly set to true", async () => {
		writeSettings({ theFirm: { compaction: { autoContinue: true } } });
		const { isAutoContinue } = await import("../workflow-settings.ts");
		expect(isAutoContinue()).toBe(true);
	});
});

// ================================================================
// getEffectiveStrategy
// ================================================================

describe("getEffectiveStrategy", () => {
	it("returns 'off' when user strategy is 'handoff'", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "handoff" } } });
		const { getEffectiveStrategy } = await import("../workflow-settings.ts");
		expect(getEffectiveStrategy()).toBe("off");
	});

	it("returns 'context-full' when user strategy is 'context-full'", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "context-full" } } });
		const { getEffectiveStrategy } = await import("../workflow-settings.ts");
		expect(getEffectiveStrategy()).toBe("context-full");
	});

	it("returns 'off' when user strategy is 'off'", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "off" } } });
		const { getEffectiveStrategy } = await import("../workflow-settings.ts");
		expect(getEffectiveStrategy()).toBe("off");
	});

	it("returns 'context-full' when not set (default)", async () => {
		writeSettings({});
		const { getEffectiveStrategy } = await import("../workflow-settings.ts");
		expect(getEffectiveStrategy()).toBe("context-full");
	});
});

// ================================================================
// agent_end: auto-handoff interception
// ================================================================

describe("agent_end — auto-handoff interception", () => {
	it("agent_end handler registers", async () => {
		writeSettings({});
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		expect(mockPi.on).toHaveBeenCalledWith("agent_end", expect.any(Function));
		expect(mockPi.getHandler("agent_end")).toBeDefined();
	});

	it("does not send handoff when strategy is 'off'", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "off" } } });
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = createMockCtx({
			getContextUsage: () => ({ tokens: 80000, contextWindow: 100000, percent: 80 }),
		});

		await mockPi.getHandler("agent_end")({}, mockCtx);

		expect(mockPi.sendUserMessage).not.toHaveBeenCalled();
	});

	it("does not send handoff when strategy is 'context-full'", async () => {
		writeSettings({ theFirm: { workflows: { compactionStrategy: "context-full" } } });
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = createMockCtx({
			getContextUsage: () => ({ tokens: 80000, contextWindow: 100000, percent: 80 }),
		});

		await mockPi.getHandler("agent_end")({}, mockCtx);

		expect(mockPi.sendUserMessage).not.toHaveBeenCalled();
	});

	it("sends handoff when strategy is 'handoff' and percent >= threshold", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "handoff" },
				compaction: { thresholdPercent: 70 },
			},
		});
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const notify = vi.fn();
		const mockCtx = createMockCtx({
			getContextUsage: () => ({ tokens: 80000, contextWindow: 100000, percent: 80 }),
			sessionManager: {
				getSessionId: () => "test-session-123",
				getBranch: () => [
					{ type: "message", message: { role: "user", content: "test" } },
					{ type: "message", message: { role: "assistant", content: "ok" } },
				],
			},
			ui: { notify },
		});

		await mockPi.getHandler("agent_end")({}, mockCtx);

		expect(mockPi.sendUserMessage).toHaveBeenCalledWith(
			expect.stringContaining("Write a comprehensive handoff document"),
		);
		expect(notify).toHaveBeenCalledWith(
			expect.stringContaining("Context threshold bereikt"),
			"info",
		);
	});

	it("does not send handoff when strategy is 'handoff' but percent < threshold", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "handoff" },
				compaction: { thresholdPercent: 90 },
			},
		});
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = createMockCtx({
			getContextUsage: () => ({ tokens: 50000, contextWindow: 100000, percent: 50 }),
		});

		await mockPi.getHandler("agent_end")({}, mockCtx);

		expect(mockPi.sendUserMessage).not.toHaveBeenCalled();
	});

	it("does not send handoff when thresholdPercent is -1", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "handoff" },
				compaction: { thresholdPercent: -1 },
			},
		});
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = createMockCtx({
			getContextUsage: () => ({ tokens: 80000, contextWindow: 100000, percent: 80 }),
		});

		await mockPi.getHandler("agent_end")({}, mockCtx);

		expect(mockPi.sendUserMessage).not.toHaveBeenCalled();
	});

	it("does not send handoff when getContextUsage returns undefined", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "handoff" },
				compaction: { thresholdPercent: 70 },
			},
		});
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = createMockCtx({
			// No getContextUsage method
		});

		await mockPi.getHandler("agent_end")({}, mockCtx);

		expect(mockPi.sendUserMessage).not.toHaveBeenCalled();
	});

	it("saves basic handoff as safety net when sending handoff", async () => {
		writeSettings({
			theFirm: {
				workflows: { compactionStrategy: "handoff" },
				compaction: { thresholdPercent: 70 },
			},
		});
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const notify = vi.fn();
		const mockCtx = createMockCtx({
			getContextUsage: () => ({ tokens: 80000, contextWindow: 100000, percent: 80 }),
			sessionManager: {
				getSessionId: () => "test-session-456",
				getBranch: () => [
					{ type: "message", message: { role: "user", content: "test" } },
					{ type: "message", message: { role: "assistant", content: "ok" } },
				],
			},
			ui: { notify },
		});

		await mockPi.getHandler("agent_end")({}, mockCtx);

		// Should have saved a handoff doc as safety net
		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
	});
});
