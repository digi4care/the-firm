/**
 * debug-overlay.test.ts — Tests for DebugOverlay render logic
 *
 * TDD: the crash bug (ReferenceError in detailMode) must be caught here.
 * The test for detailMode rendering MUST fail before the fix and pass after.
 */

import { describe, expect, it } from "bun:test";
import type { DashboardState, EventCategory, TrackedEvent } from "../lib/types.ts";
import { DebugOverlay } from "../debug-overlay.ts";

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

function createEvent(overrides?: Partial<TrackedEvent>): TrackedEvent {
	return {
		id: 1,
		timestamp: Date.now(),
		category: "tool" as EventCategory,
		eventType: "tool_execution_start",
		label: "read started",
		details: { toolName: "read", path: "/tmp/test.txt" },
		...overrides,
	};
}

function renderOverlay(state: DashboardState, detail = false): string[] {
	const overlay = new DebugOverlay(
		() => state,
		() => {},
		detail,
	);
	// Should NOT throw — this is the core assertion
	return overlay.render(120, 40);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("DebugOverlay", () => {
	describe("render — no crash", () => {
		it("renders without error in normal mode (no events)", () => {
			const state = createState();
			const lines = renderOverlay(state, false);
			expect(lines.length).toBeGreaterThan(0);
		});

		it("renders without error in normal mode (with events)", () => {
			const state = createState({
				events: [
					createEvent({
						id: 1,
						category: "tool",
						eventType: "tool_execution_start",
						label: "read started",
					}),
					createEvent({
						id: 2,
						category: "agent",
						eventType: "agent_start",
						label: "Agent started",
					}),
				],
				totalEventCount: 2,
			});
			const lines = renderOverlay(state, false);
			expect(lines.length).toBeGreaterThan(0);
		});

		it("renders without error in detail mode (with events)", () => {
			const state = createState({
				events: [
					createEvent({
						id: 1,
						category: "tool",
						eventType: "tool_execution_start",
						label: "read started",
						details: { toolName: "read" },
					}),
					createEvent({
						id: 2,
						category: "tool",
						eventType: "tool_execution_end",
						label: "read done",
						details: { toolName: "read" },
					}),
				],
				totalEventCount: 2,
			});
			// This MUST NOT throw ReferenceError — the current bug
			const lines = renderOverlay(state, true);
			expect(lines.length).toBeGreaterThan(0);
		});

		it("renders without error in detail mode (no events)", () => {
			const state = createState();
			const lines = renderOverlay(state, true);
			expect(lines.length).toBeGreaterThan(0);
		});

		it("renders without error in detail mode (with active tools)", () => {
			const state = createState({
				events: [
					createEvent({
						id: 1,
						category: "tool",
						eventType: "tool_execution_start",
						label: "bash started",
					}),
				],
				totalEventCount: 1,
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
			});
			const lines = renderOverlay(state, true);
			expect(lines.length).toBeGreaterThan(0);
		});

		it("renders without error in detail mode (with active hook)", () => {
			const state = createState({
				events: [
					createEvent({ id: 1, category: "hook", eventType: "context", label: "Context hook" }),
				],
				totalEventCount: 1,
				activeHook: {
					name: "context",
					startedAt: Date.now(),
					details: { messageCount: 5 },
				},
			});
			const lines = renderOverlay(state, true);
			expect(lines.length).toBeGreaterThan(0);
		});
	});

	describe("render — content correctness", () => {
		it("shows total event count in header", () => {
			const state = createState({ totalEventCount: 42 });
			const lines = renderOverlay(state);
			const joined = lines.join("\n");
			expect(joined).toContain("42");
		});

		it("shows model name when set", () => {
			const state = createState({
				agent: {
					...createState().agent,
					model: "anthropic/claude-sonnet-4-20250514",
				},
			});
			const lines = renderOverlay(state);
			const joined = lines.join("\n");
			expect(joined).toContain("claude-sonnet-4-20250514");
		});

		it("shows active tool name", () => {
			const state = createState({
				events: [
					createEvent({
						id: 1,
						category: "tool",
						eventType: "tool_execution_start",
						label: "read started",
					}),
				],
				totalEventCount: 1,
				activeTools: new Map([
					[
						"call-1",
						{
							id: "call-1",
							name: "read",
							status: "running" as const,
							startedAt: Date.now(),
							argsPreview: '{"path":"/tmp/test"}',
						},
					],
				]),
			});
			const lines = renderOverlay(state);
			const joined = lines.join("\n");
			expect(joined).toContain("read");
		});

		it("shows event labels in timeline", () => {
			const state = createState({
				events: [
					createEvent({
						id: 1,
						category: "tool",
						eventType: "tool_execution_start",
						label: "bash started",
					}),
					createEvent({
						id: 2,
						category: "turn",
						eventType: "turn_start",
						label: "Turn 0 started",
					}),
				],
				totalEventCount: 2,
			});
			const lines = renderOverlay(state);
			const joined = lines.join("\n");
			expect(joined).toContain("bash started");
			expect(joined).toContain("Turn 0 started");
		});

		it("shows no events message when filtered to empty", () => {
			const state = createState({
				events: [
					createEvent({
						id: 1,
						category: "tool",
						eventType: "tool_execution_start",
						label: "tool",
					}),
				],
				totalEventCount: 1,
			});
			// Create overlay, press "4" to toggle off "tool" category
			const overlay = new DebugOverlay(
				() => state,
				() => {},
				false,
			);
			overlay.handleInput("4", () => {}); // toggle off "tool"
			const lines = overlay.render(120, 40);
			const joined = lines.join("\n");
			expect(joined).toContain("no events matching filter");
		});
	});

	describe("handleInput", () => {
		it("calls onClose when q pressed", () => {
			let closed = false;
			const overlay = new DebugOverlay(
				() => createState(),
				() => {
					closed = true;
				},
				false,
			);
			overlay.handleInput("q", () => {});
			expect(closed).toBe(true);
		});

		it("calls onClose when escape pressed", () => {
			let closed = false;
			const overlay = new DebugOverlay(
				() => createState(),
				() => {
					closed = true;
				},
				false,
			);
			overlay.handleInput("\x1b", () => {}); // escape
			expect(closed).toBe(true);
		});
	});
});
