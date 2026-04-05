/**
 * Tests for BaseGuard
 */

import { describe, expect, it, vi } from "bun:test";
import type { HookContext, ToolEvent } from "@mariozechner/pi-coding-agent";
import { BaseGuard } from "../lib/base-guard.js";

class TestGuard extends BaseGuard {
	readonly name = "test-guard";
	readonly toolNames = ["bash", "read"];

	async check(event: ToolEvent): Promise<{ block: boolean; reason?: string } | undefined> {
		if (event.input.command === "block-me") {
			return this.block("Blocked for testing");
		}
		return this.allow();
	}
}

describe("BaseGuard", () => {
	describe("shouldActivate", () => {
		it("returns true for configured tool names", () => {
			const guard = new TestGuard({} as any);
			const event = { toolName: "bash", input: {} } as ToolEvent;
			expect(guard.shouldActivate(event)).toBe(true);
		});

		it("returns false for other tool names", () => {
			const guard = new TestGuard({} as any);
			const event = { toolName: "write", input: {} } as ToolEvent;
			expect(guard.shouldActivate(event)).toBe(false);
		});
	});

	describe("block", () => {
		it("returns block result", () => {
			const guard = new TestGuard({} as any);
			const result = guard.block("Test reason");
			expect(result).toEqual({ block: true, reason: "Test reason" });
		});
	});

	describe("allow", () => {
		it("returns undefined", () => {
			const guard = new TestGuard({} as any);
			const result = guard.allow();
			expect(result).toBeUndefined();
		});
	});

	describe("confirm", () => {
		it("calls ui.confirm", async () => {
			const mockConfirm = vi.fn().mockResolvedValue(true);
			const ctx = { hasUI: true, ui: { confirm: mockConfirm } } as unknown as HookContext;
			const guard = new TestGuard({} as any);

			const result = await guard.confirm(ctx, "Title", "Message");

			expect(result).toBe(true);
			expect(mockConfirm).toHaveBeenCalledWith("Title", "Message");
		});
	});
});
