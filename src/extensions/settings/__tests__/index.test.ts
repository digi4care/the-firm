/**
 * index.test.ts — Tests for the settings extension entry point
 *
 * Tests that the extension registers correctly with the Pi SDK
 * and that the /firm command is wired up properly.
 * Uses mock Pi and mock ctx like the delete guard tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TMP_DIR = join(tmpdir(), "tf-settings-extension-test");
const originalCwd = process.cwd;

beforeEach(() => {
	rmSync(TMP_DIR, { recursive: true, force: true });
	mkdirSync(join(TMP_DIR, ".pi"), { recursive: true });
	mkdirSync(join(TMP_DIR, "src", "extensions", "settings"), { recursive: true });
	process.cwd = () => TMP_DIR;
});

afterEach(() => {
	process.cwd = originalCwd;
	rmSync(TMP_DIR, { recursive: true, force: true });
});

function createMockPi() {
	const handlers: Record<string, Function> = {};
	const commands: Record<string, any> = {};
	return {
		on: vi.fn((event: string, handler: Function) => {
			handlers[event] = handler;
		}),
		registerCommand: vi.fn((name: string, options: any) => {
			commands[name] = options;
		}),
		getHandler: (event: string) => handlers[event],
		getCommand: (name: string) => commands[name],
	};
}

describe("settings extension entry point", () => {
	it("registers a /settings command", async () => {
		const mockPi = createMockPi();
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		expect(mockPi.registerCommand).toHaveBeenCalledWith(
			"firm",
			expect.objectContaining({
				description: expect.any(String),
				handler: expect.any(Function),
			}),
		);
	});

	it("registers a session_start handler", async () => {
		const mockPi = createMockPi();
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		expect(mockPi.on).toHaveBeenCalledWith("session_start", expect.any(Function));
	});

	it("/firm command handler uses ctx.ui.custom to show the selector", async () => {
		const mockPi = createMockPi();
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const cmd = mockPi.getCommand("firm");
		expect(cmd).toBeDefined();

		let customCalled = false;
		const mockCtx = {
			hasUI: true,
			ui: {
				custom: vi.fn(async (factory: Function) => {
					customCalled = true;
					// Simulate calling the factory to verify it doesn't throw
					const mockTui = { requestRender: vi.fn() };
					const mockTheme = {
						fg: (_c: string, t: string) => t,
						bold: (t: string) => t,
					};
					const mockKb = {};
					const mockDone = vi.fn();
					const component = factory(mockTui, mockTheme, mockKb, mockDone);
					expect(component).toBeDefined();
					expect(typeof component.render).toBe("function");
					expect(typeof component.handleInput).toBe("function");
					// Call done to clean up
					mockDone(undefined);
				}),
			},
		};

		await cmd.handler("", mockCtx);
		expect(customCalled).toBe(true);
	});
});

// ================================================================
// parseTypedValue — type conversion in onChange bridge
// ================================================================

describe("parseTypedValue — converts raw string values to schema-correct types", () => {
	it("converts number strings to numbers for number-typed settings", async () => {
		const { parseTypedValue } = await import("../index.ts");
		expect(parseTypedValue("theFirm.compaction.reserveTokens", "16384")).toBe(16384);
		expect(parseTypedValue("theFirm.compaction.thresholdPercent", "60")).toBe(60);
		expect(parseTypedValue("theFirm.compaction.thresholdTokens", "-1")).toBe(-1);
	});

	it("converts boolean strings to booleans for boolean-typed settings", async () => {
		const { parseTypedValue } = await import("../index.ts");
		expect(parseTypedValue("theFirm.session.autoCompact", "true")).toBe(true);
		expect(parseTypedValue("theFirm.session.autoCompact", "false")).toBe(false);
	});

	it("keeps string values as strings for string-typed settings", async () => {
		const { parseTypedValue } = await import("../index.ts");
		expect(parseTypedValue("theFirm.compaction.handoffStorage", "file")).toBe("file");
		expect(parseTypedValue("theFirm.compaction.handoffStorage", "inmemory")).toBe("inmemory");
	});

	it("keeps enum values as strings for enum-typed settings", async () => {
		const { parseTypedValue } = await import("../index.ts");
		expect(parseTypedValue("theFirm.workflows.compactionStrategy", "handoff")).toBe("handoff");
		expect(parseTypedValue("theFirm.symbolPreset", "ascii")).toBe("ascii");
	});

	it("returns NaN for non-numeric strings on number-typed settings", async () => {
		const { parseTypedValue } = await import("../index.ts");
		const result = parseTypedValue("theFirm.compaction.reserveTokens", "not-a-number");
		expect(Number.isNaN(result)).toBe(true);
	});
});
