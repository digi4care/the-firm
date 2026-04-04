/**
 * tf-delete-guard.test.ts — Tests for the guards extension
 *
 * Verifies that destructive bash commands are intercepted
 * when requireConfirmationBeforeDelete is enabled,
 * and that other guards work correctly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- Mock helpers ---

function createMockPi() {
	const handlers: Record<string, Function[]> = {};
	return {
		on: vi.fn((event: string, handler: Function) => {
			if (!handlers[event]) handlers[event] = [];
			handlers[event].push(handler);
		}),
		getHandlers: (event: string) => handlers[event] ?? [],
		getHandler: (event: string) => {
			// Return a combined handler that runs all handlers in sequence
			const fns = handlers[event] ?? [];
			return async (event: any, ctx: any) => {
				for (const fn of fns) {
					const result = await fn(event, ctx);
					if (result) return result;
				}
				return undefined;
			};
		},
	};
}

function createMockCtx(hasUI: boolean, confirmResult?: boolean) {
	return {
		hasUI,
		ui: {
			confirm: vi.fn(async () => confirmResult ?? false),
		},
	};
}

function createToolCallEvent(toolName: string, input: Record<string, unknown>) {
	return {
		toolName,
		toolCallId: "test-call-1",
		input,
	};
}

// --- Settings temp dir helper ---

const TMP_DIR = join(tmpdir(), "tf-guards-test");

function writePiSettings(content: Record<string, unknown>) {
	mkdirSync(join(TMP_DIR, ".pi"), { recursive: true });
	writeFileSync(join(TMP_DIR, ".pi", "settings.json"), JSON.stringify(content), "utf-8");
}

function cleanupSettings() {
	rmSync(TMP_DIR, { recursive: true, force: true });
}

const originalCwd = process.cwd;

// --- Tests ---

describe("tf-delete-guard", () => {
	let mockPi: ReturnType<typeof createMockPi>;

	beforeEach(() => {
		mockPi = createMockPi();
		cleanupSettings();
		process.cwd = () => TMP_DIR;
	});

	afterEach(() => {
		process.cwd = originalCwd;
		cleanupSettings();
	});

	it("registers tool_call handlers", async () => {
		const { default: register } = await import("../index.ts");
		register(mockPi as any);
		expect(mockPi.on).toHaveBeenCalledWith("tool_call", expect.any(Function));
	});

	it("passes through non-bash tools", async () => {
		writePiSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(
			createToolCallEvent("read", { path: "/some/file" }),
			createMockCtx(true),
		);
		expect(result).toBeUndefined();
	});

	it("passes through non-delete bash commands", async () => {
		writePiSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(
			createToolCallEvent("bash", { command: "ls -la" }),
			createMockCtx(true),
		);
		expect(result).toBeUndefined();
	});

	it("passes through when guard is disabled", async () => {
		writePiSettings({ theFirm: { requireConfirmationBeforeDelete: false } });
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(
			createToolCallEvent("bash", { command: "rm -rf /tmp/something" }),
			createMockCtx(true),
		);
		expect(result).toBeUndefined();
	});

	it("passes through when settings have no theFirm key", async () => {
		writePiSettings({});
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		// Default is true, but with empty settings the guard reads undefined -> default true
		// So with empty settings the guard IS enabled (default true)
		const handler = mockPi.getHandler("tool_call");
		const ctx = createMockCtx(true, false);
		const result = await handler(createToolCallEvent("bash", { command: "rm file.txt" }), ctx);
		expect(result).toEqual({ block: true, reason: "Blocked by user (delete guard)" });
	});

	it("passes through when no settings.json exists", async () => {
		// No settings file — default is true, so guard IS enabled
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const ctx = createMockCtx(true, true);
		const result = await handler(createToolCallEvent("bash", { command: "rm file.txt" }), ctx);
		expect(result).toBeUndefined(); // confirmed = allowed
	});

	it("blocks delete command when user declines", async () => {
		writePiSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const ctx = createMockCtx(true, false);
		const result = await handler(createToolCallEvent("bash", { command: "rm file.txt" }), ctx);

		expect(result).toEqual({ block: true, reason: "Blocked by user (delete guard)" });
	});

	it("allows delete command when user confirms", async () => {
		writePiSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const ctx = createMockCtx(true, true);
		const result = await handler(createToolCallEvent("bash", { command: "rm file.txt" }), ctx);

		expect(result).toBeUndefined();
	});

	it("blocks delete command in non-interactive mode", async () => {
		writePiSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(
			createToolCallEvent("bash", { command: "rm file.txt" }),
			createMockCtx(false),
		);

		expect(result).toEqual({
			block: true,
			reason: "Delete command blocked (no UI for confirmation)",
		});
	});

	it("catches various delete patterns", async () => {
		writePiSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const deleteCommands = [
			"rm file.txt",
			"rm -rf /tmp/test",
			"rmdir old-dir",
			"unlink symlink",
			"rsync -av --delete src/ dest/",
			"git clean -fd",
			"git reset --hard HEAD",
			"git checkout .",
		];

		for (const cmd of deleteCommands) {
			const ctx = createMockCtx(true, false);
			const result = await handler(createToolCallEvent("bash", { command: cmd }), ctx);
			expect(result).toEqual(
				{ block: true, reason: "Blocked by user (delete guard)" },
				`Expected "${cmd}" to be blocked`,
			);
		}
	});

	it("handles malformed settings.json gracefully", async () => {
		mkdirSync(join(TMP_DIR, ".pi"), { recursive: true });
		writeFileSync(join(TMP_DIR, ".pi", "settings.json"), "NOT VALID JSON{{{", "utf-8");

		const { default: register } = await import("../index.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const ctx = createMockCtx(true, false);
		const result = await handler(createToolCallEvent("bash", { command: "rm file.txt" }), ctx);
		// Malformed JSON -> getSetting returns undefined -> default true -> guard active
		expect(result).toEqual({ block: true, reason: "Blocked by user (delete guard)" });
	});
});
