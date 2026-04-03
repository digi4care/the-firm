/**
 * tf-delete-guard.test.ts — Tests for the delete guard extension
 *
 * Verifies that destructive bash commands are intercepted
 * when requireConfirmationBeforeDelete is enabled.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// --- Mock helpers ---

function createMockPi() {
	const handlers: Record<string, Function> = {};
	return {
		on: vi.fn((event: string, handler: Function) => {
			handlers[event] = handler;
		}),
		getHandler: (event: string) => handlers[event],
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

function createToolCallEvent(command: string) {
	return {
		toolName: "bash",
		toolCallId: "test-call-1",
		input: { command },
	};
}

// --- Settings temp dir helper ---

const TMP_DIR = join(tmpdir(), "tf-delete-guard-test");

function writeSettings(content: Record<string, unknown>) {
	mkdirSync(join(TMP_DIR, "src"), { recursive: true });
	writeFileSync(join(TMP_DIR, "src", "settings.json"), JSON.stringify(content), "utf-8");
}

function cleanupSettings() {
	rmSync(TMP_DIR, { recursive: true, force: true });
}

// We need to stub process.cwd to point to our temp dir
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

	it("registers a tool_call handler", async () => {
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);
		expect(mockPi.on).toHaveBeenCalledWith("tool_call", expect.any(Function));
	});

	it("passes through non-bash tools", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(
			{ toolName: "read", input: { path: "/some/file" } },
			createMockCtx(true),
		);
		expect(result).toBeUndefined();
	});

	it("passes through non-delete bash commands", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(createToolCallEvent("ls -la"), createMockCtx(true));
		expect(result).toBeUndefined();
	});

	it("passes through when guard is disabled", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: false } });
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(createToolCallEvent("rm -rf /tmp/something"), createMockCtx(true));
		expect(result).toBeUndefined();
	});

	it("passes through when settings have no theFirm key", async () => {
		writeSettings({});
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(createToolCallEvent("rm file.txt"), createMockCtx(true));
		expect(result).toBeUndefined();
	});

	it("passes through when no settings.json exists", async () => {
		// No settings file
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(createToolCallEvent("rm file.txt"), createMockCtx(true));
		expect(result).toBeUndefined();
	});

	it("blocks delete command when user declines", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const ctx = createMockCtx(true, false);
		const result = await handler(createToolCallEvent("rm file.txt"), ctx);

		expect(result).toEqual({ block: true, reason: "Blocked by user (delete guard)" });
	});

	it("allows delete command when user confirms", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const ctx = createMockCtx(true, true);
		const result = await handler(createToolCallEvent("rm file.txt"), ctx);

		expect(result).toBeUndefined();
	});

	it("blocks delete command in non-interactive mode", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(createToolCallEvent("rm file.txt"), createMockCtx(false));

		expect(result).toEqual({
			block: true,
			reason: "Delete command blocked (no UI for confirmation)",
		});
	});

	it("catches various delete patterns", async () => {
		writeSettings({ theFirm: { requireConfirmationBeforeDelete: true } });
		const { default: register } = await import("../tf-delete-guard.ts");
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
			const result = await handler(createToolCallEvent(cmd), ctx);
			expect(result).toEqual(
				{ block: true, reason: "Blocked by user (delete guard)" },
				`Expected "${cmd}" to be blocked`,
			);
		}
	});

	it("handles malformed settings.json gracefully", async () => {
		mkdirSync(join(TMP_DIR, "src"), { recursive: true });
		writeFileSync(join(TMP_DIR, "src", "settings.json"), "NOT VALID JSON{{{", "utf-8");

		const { default: register } = await import("../tf-delete-guard.ts");
		register(mockPi as any);

		const handler = mockPi.getHandler("tool_call");
		const result = await handler(createToolCallEvent("rm file.txt"), createMockCtx(true));
		// Should not block — fail open
		expect(result).toBeUndefined();
	});
});
