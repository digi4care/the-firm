/**
 * event-collector.test.ts — Tests for EventCollector
 *
 * TDD: these tests define expected behavior BEFORE fixes.
 * All tests must pass for the code to be commit-ready.
 */

import { describe, expect, it, mock } from "bun:test";
import { EventCollector } from "../event-collector.ts";

// biome-ignore lint/suspicious/noExplicitAny: test mocks require any
type AnyFunction = (...args: any[]) => any;

// ── Mock ExtensionAPI ───────────────────────────────────────────────────────

function createMockPi() {
	const handlers = new Map<string, AnyFunction[]>();

	return {
		on: mock((event: string, handler: AnyFunction) => {
			if (!handlers.has(event)) handlers.set(event, []);
			handlers.get(event)!.push(handler);
		}),
		emit: (event: string, data?: unknown) => {
			const fns = handlers.get(event) ?? [];
			for (const fn of fns) fn(data, createMockCtx());
		},
		getThinkingLevel: mock(() => "medium" as const),
		handlers,
	};
}

function createMockCtx() {
	return {
		ui: {},
		hasUI: false,
		cwd: "/tmp/test",
	} as any;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function collectorWithEvents(eventCount: number): {
	pi: ReturnType<typeof createMockPi>;
	collector: EventCollector;
} {
	const pi = createMockPi();
	const collector = new EventCollector(pi as any);
	collector.start();

	// Fire some events via the mock
	for (let i = 0; i < eventCount; i++) {
		pi.emit("tool_execution_start", {
			type: "tool_execution_start",
			toolCallId: `call-${i}`,
			toolName: `tool-${i}`,
			args: { path: `/tmp/file-${i}` },
		});
		pi.emit("tool_execution_end", {
			type: "tool_execution_end",
			toolCallId: `call-${i}`,
			toolName: `tool-${i}`,
			result: "ok",
			isError: false,
		});
	}

	return { pi, collector };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("EventCollector", () => {
	describe("initial state", () => {
		it("starts with empty events", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			expect(collector.state.events).toEqual([]);
		});

		it("starts in idle phase", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			expect(collector.state.agent.phase).toBe("idle");
		});

		it("starts with zero total events", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			expect(collector.state.totalEventCount).toBe(0);
		});

		it("starts with no active tools", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			expect(collector.state.activeTools.size).toBe(0);
		});

		it("starts with no active hook", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			expect(collector.state.activeHook).toBeNull();
		});
	});

	describe("start()", () => {
		it("records a session_start event", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			const sessionEvents = collector.state.events.filter((e) => e.eventType === "session_start");
			expect(sessionEvents.length).toBe(1);
			expect(sessionEvents[0].label).toBe("Session started");
		});

		it("registers handlers for all event categories", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			const expectedEvents = [
				"session_start",
				"session_shutdown",
				"session_switch",
				"session_before_compact",
				"session_compact",
				"before_agent_start",
				"agent_start",
				"agent_end",
				"turn_start",
				"turn_end",
				"tool_execution_start",
				"tool_call",
				"tool_execution_end",
				"message_start",
				"message_end",
				"context",
				"before_provider_request",
				"model_select",
				"input",
			];

			for (const eventName of expectedEvents) {
				expect(pi.handlers.has(eventName)).toBe(true);
			}
		});
	});

	describe("tool events", () => {
		it("tracks active tools and marks them done after tool_execution_end", () => {
			const { collector } = collectorWithEvents(1);

			// Tool is still in the Map but marked as done (not removed)
			expect(collector.state.activeTools.size).toBe(1);
			const tool = collector.state.activeTools.get("call-0");
			expect(tool?.status).toBe("done");
			expect(collector.state.totalEventCount).toBeGreaterThanOrEqual(2); // start + end
		});

		it("sets tool status to running on start", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("tool_execution_start", {
				type: "tool_execution_start",
				toolCallId: "call-1",
				toolName: "read",
				args: { path: "/tmp/test.txt" },
			});

			const tool = collector.state.activeTools.get("call-1");
			expect(tool).toBeDefined();
			expect(tool!.name).toBe("read");
			expect(tool!.status).toBe("running");
		});

		it("sets tool status to done on successful end", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("tool_execution_start", {
				type: "tool_execution_start",
				toolCallId: "call-1",
				toolName: "read",
				args: {},
			});
			pi.emit("tool_execution_end", {
				type: "tool_execution_end",
				toolCallId: "call-1",
				toolName: "read",
				result: "ok",
				isError: false,
			});

			const tool = collector.state.activeTools.get("call-1");
			expect(tool!.status).toBe("done");
			expect(tool!.endedAt).toBeDefined();
		});

		it("sets tool status to error on failed end", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("tool_execution_start", {
				type: "tool_execution_start",
				toolCallId: "call-err",
				toolName: "bash",
				args: { command: "bad" },
			});
			pi.emit("tool_execution_end", {
				type: "tool_execution_end",
				toolCallId: "call-err",
				toolName: "bash",
				result: "error",
				isError: true,
			});

			const tool = collector.state.activeTools.get("call-err");
			expect(tool!.status).toBe("error");
		});

		it("records tool name in event label", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("tool_execution_start", {
				type: "tool_execution_start",
				toolCallId: "call-1",
				toolName: "edit",
				args: {},
			});

			const events = collector.state.events.filter(
				(e) => e.category === "tool" && e.eventType === "tool_execution_start",
			);
			expect(events.length).toBe(1);
			expect(events[0].label).toContain("edit");
		});
	});

	describe("agent events", () => {
		it("transitions phase: idle → starting → running → idle", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			expect(collector.state.agent.phase).toBe("idle");

			pi.emit("before_agent_start", {
				type: "before_agent_start",
				prompt: "test prompt",
			});
			expect(collector.state.agent.phase).toBe("starting");

			pi.emit("agent_start", { type: "agent_start" });
			expect(collector.state.agent.phase).toBe("running");

			pi.emit("agent_end", { type: "agent_end", messages: [] });
			expect(collector.state.agent.phase).toBe("idle");
		});

		it("stores the current prompt", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("before_agent_start", {
				type: "before_agent_start",
				prompt: "fix the bug",
			});

			expect(collector.state.agent.currentPrompt).toBe("fix the bug");
		});
	});

	describe("turn events", () => {
		it("tracks turn index and total turns", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });
			expect(collector.state.agent.turnIndex).toBe(0);
			expect(collector.state.agent.totalTurns).toBe(1);

			pi.emit("turn_start", { type: "turn_start", turnIndex: 1, timestamp: Date.now() });
			expect(collector.state.agent.turnIndex).toBe(1);
			expect(collector.state.agent.totalTurns).toBe(2);
		});
	});

	describe("ring buffer", () => {
		it("does not exceed MAX_EVENTS (500)", () => {
			const { collector } = collectorWithEvents(600);
			// Each tool call = 2 events (start + end), plus session_start
			// But we only keep 500 max
			expect(collector.state.events.length).toBeLessThanOrEqual(500);
		});

		it("preserves totalEventCount beyond ring buffer", () => {
			const { collector } = collectorWithEvents(300);
			// 300 tools × 2 events + 1 session_start = 601
			expect(collector.state.totalEventCount).toBeGreaterThanOrEqual(600);
		});
	});

	describe("hook events", () => {
		it("tracks active context hook", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("context", { type: "context", messages: [{ role: "user" }, { role: "assistant" }] });

			expect(collector.state.activeHook).not.toBeNull();
			expect(collector.state.activeHook!.name).toBe("context");
		});

		it("clears active hook on turn_start", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("context", { type: "context", messages: [] });
			expect(collector.state.activeHook).not.toBeNull();

			pi.emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });
			expect(collector.state.activeHook).toBeNull();
		});
	});

	describe("model events", () => {
		it("updates model string on model_select", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("model_select", {
				type: "model_select",
				model: { provider: "anthropic", id: "claude-sonnet-4-20250514" },
				previousModel: undefined,
				source: "set",
			});

			expect(collector.state.agent.model).toBe("anthropic/claude-sonnet-4-20250514");
		});
	});

	describe("category counts", () => {
		it("increments correct category counters", () => {
			const pi = createMockPi();
			const collector = new EventCollector(pi as any);
			collector.start();

			pi.emit("tool_execution_start", {
				type: "tool_execution_start",
				toolCallId: "c1",
				toolName: "read",
				args: {},
			});
			pi.emit("tool_execution_end", {
				type: "tool_execution_end",
				toolCallId: "c1",
				toolName: "read",
				result: "ok",
				isError: false,
			});

			expect(collector.state.categoryCounts.tool).toBe(2);
			expect(collector.state.categoryCounts.session).toBe(1); // session_start
		});
	});
});
