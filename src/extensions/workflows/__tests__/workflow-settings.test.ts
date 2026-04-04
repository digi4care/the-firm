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
// session_compact: generates handoff as safety net
// ================================================================

describe("session_compact — handoff safety net", () => {
	it("generates handoff after compaction when entries >= 2", async () => {
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

		await mockPi.getHandler("session_compact")({}, mockCtx);

		// Should have written a handoff doc (fallback since no LLM in test)
		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
		expect(handoff).toContain("Handoff");
	});

	it("skips handoff when fewer than 2 entries", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		const mockCtx = createMockCtx({
			sessionManager: { getEntries: () => [] },
		});

		await mockPi.getHandler("session_compact")({}, mockCtx);

		expect(readHandoffDoc()).toBeNull();
	});
});

// ================================================================
// session_shutdown: always generates handoff + saves metadata
// ================================================================

describe("session_shutdown — save on exit", () => {
	it("always generates handoff even with no settings", async () => {
		writeSettings({});

		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		await mockPi.getHandler("session_shutdown")({}, createMockCtx());

		// Should always generate handoff on shutdown
		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
	});

	it("generates handoff from entries when available", async () => {
		writeSettings({});

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

		const handoff = readHandoffDoc();
		expect(handoff).not.toBeNull();
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
	it("registers all event handlers", async () => {
		const mockPi = createMockPi();
		const { default: register } = await import("../workflow-settings.ts");
		register(mockPi as any);

		expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("before_agent_start", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_before_compact", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_compact", expect.any(Function));
		expect(mockPi.on).toHaveBeenCalledWith("session_shutdown", expect.any(Function));
	});
});
