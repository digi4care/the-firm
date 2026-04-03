/**
 * compact-widget.test.ts — Tests for CompactWidget render logic
 */

import { describe, expect, it } from "bun:test";
import type { DashboardState } from "../../../lib/debug/types.ts";
import { CompactWidget } from "../compact-widget.ts";

// ── Helpers ─────────────────────────────────────────────────────────────────

function createState(overrides?: Partial<DashboardState>): DashboardState {
	return {
		events: [],
		activeTools: new Map(),
		activeHook: null,
		agent: {
			phase: "idle",
			model: undefined,
			turnIndex: 0,
			totalTurns: 0,
			startedAt: undefined,
			thinkingLevel: undefined,
			currentPrompt: undefined,
		},
		sessionStartedAt: Date.now(),
		totalEventCount: 0,
		categoryCounts: {
			session: 0,
			agent: 0,
			turn: 0,
			tool: 0,
			message: 0,
			hook: 0,
			model: 0,
			input: 0,
		},
		...overrides,
	};
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("CompactWidget", () => {
	describe("render — no crash", () => {
		it("renders in idle state without error", () => {
			const widget = new CompactWidget(() => createState());
			const lines = widget.render(120);
			expect(lines.length).toBe(1);
		});

		it("renders with active running tool", () => {
			const widget = new CompactWidget(() =>
				createState({
					agent: { ...createState().agent, phase: "running" },
					activeTools: new Map([
						[
							"call-1",
							{
								id: "call-1",
								name: "bash",
								status: "running" as const,
								startedAt: Date.now(),
								argsPreview: '{"command":"ls"}',
							},
						],
					]),
				}),
			);
			const lines = widget.render(120);
			expect(lines.length).toBe(1);
		});

		it("renders with model and turns", () => {
			const widget = new CompactWidget(() =>
				createState({
					agent: {
						...createState().agent,
						phase: "turn",
						model: "anthropic/claude-sonnet-4-20250514",
						turnIndex: 2,
						totalTurns: 5,
						startedAt: Date.now() - 5000,
					},
				}),
			);
			const lines = widget.render(120);
			expect(lines.length).toBe(1);
			// Strip ANSI to check content
			const plain = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(plain).toContain("claude-sonnet-4-20250514");
			expect(plain).toContain("3/5"); // turn 3 of 5
		});

		it("renders with active hook", () => {
			const widget = new CompactWidget(() =>
				createState({
					activeHook: {
						name: "context",
						startedAt: Date.now(),
						details: { messageCount: 10 },
					},
				}),
			);
			const lines = widget.render(120);
			expect(lines.length).toBe(1);
			const plain = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(plain).toContain("context");
		});

		it("renders with multiple active tools", () => {
			const widget = new CompactWidget(() =>
				createState({
					agent: { ...createState().agent, phase: "running" },
					activeTools: new Map([
						[
							"call-1",
							{ id: "call-1", name: "read", status: "running" as const, startedAt: Date.now() },
						],
						[
							"call-2",
							{ id: "call-2", name: "bash", status: "running" as const, startedAt: Date.now() },
						],
					]),
				}),
			);
			const lines = widget.render(120);
			expect(lines.length).toBe(1);
			// Compact widget shows running count + total, not individual names
			const plain = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(plain).toContain("tools");
			expect(plain).toContain("2"); // total count
		});

		it("renders with event count", () => {
			const widget = new CompactWidget(() => createState({ totalEventCount: 99 }));
			const lines = widget.render(120);
			const plain = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(plain).toContain("99");
		});
	});

	describe("invalidate", () => {
		it("causes re-render on next call", () => {
			let count = 42;
			const widget = new CompactWidget(() => createState({ totalEventCount: count }));

			const lines1 = widget.render(120);
			const plain1 = lines1[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(plain1).toContain("42");

			count = 100;
			// Still cached
			const lines2 = widget.render(120);
			const plain2 = lines2[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(plain2).toContain("42"); // cached, not updated yet

			widget.invalidate();
			const lines3 = widget.render(120);
			const plain3 = lines3[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(plain3).toContain("100"); // now updated
		});
	});

	describe("truncate to width", () => {
		it("does not exceed width with ANSI codes", () => {
			const widget = new CompactWidget(() =>
				createState({
					agent: {
						...createState().agent,
						phase: "turn",
						model: "anthropic/claude-sonnet-4-20250514",
						turnIndex: 2,
						totalTurns: 5,
						startedAt: Date.now(),
					},
					activeHook: { name: "context", startedAt: Date.now() },
					activeTools: new Map([
						["c1", { id: "c1", name: "read", status: "running" as const, startedAt: Date.now() }],
						["c2", { id: "c2", name: "bash", status: "running" as const, startedAt: Date.now() }],
						["c3", { id: "c3", name: "edit", status: "running" as const, startedAt: Date.now() }],
					]),
					totalEventCount: 999,
				}),
			);

			const narrowWidth = 40;
			const lines = widget.render(narrowWidth);
			expect(lines.length).toBe(1);

			// Visible width (without ANSI) should be <= narrowWidth
			const visible = lines[0].replace(/\x1b\[[0-9;]*m/g, "");
			expect(visible.length).toBeLessThanOrEqual(narrowWidth);
		});
	});
});
