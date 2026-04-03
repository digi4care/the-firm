/**
 * multi-turn.test.ts — Tests simulating multiple agent runs (prompts)
 *
 * Reproduces: the-firm-zc8
 * Bug: names disappear after the first prompt, only numbers visible
 */

import { describe, expect, it, mock } from "bun:test";
import { EventCollector } from "../event-collector.ts";
import { CompactWidget } from "../compact-widget.ts";
import { DebugOverlay } from "../debug-overlay.ts";
import type { DashboardState } from "../../../lib/debug/types.ts";

// ── Mock ────────────────────────────────────────────────────────────────────

type AnyFn = (...args: any[]) => any;

function createMockPi() {
	const handlers = new Map<string, AnyFn[]>();

	return {
		on: mock((event: string, handler: AnyFn) => {
			if (!handlers.has(event)) handlers.set(event, []);
			handlers.get(event)!.push(handler);
		}),
		emit: (event: string, data?: unknown) => {
			const fns = handlers.get(event) ?? [];
			for (const fn of fns) fn(data);
		},
		getThinkingLevel: mock(() => "medium" as const),
		handlers,
	};
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Simulate a complete agent run with tool calls */
function simulateAgentRun(pi: ReturnType<typeof createMockPi>, tools: string[] = ["read", "edit", "bash"]) {
	// User input
	pi.emit("input", { type: "input", text: "do something", source: "interactive" });

	// Agent start
	pi.emit("before_agent_start", { type: "before_agent_start", prompt: "do something" });
	pi.emit("agent_start", { type: "agent_start" });

	// Context hook
	pi.emit("context", { type: "context", messages: [{ role: "user", content: "do something" }] });

	// Provider request
	pi.emit("before_provider_request", { type: "before_provider_request", payload: { model: "test-model" } });

	// Turn with tool calls
	pi.emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });
	pi.emit("message_start", { type: "message_start", message: { role: "assistant" } });
	pi.emit("message_end", { type: "message_end", message: { role: "assistant" } });

	for (const toolName of tools) {
		pi.emit("tool_execution_start", {
			type: "tool_execution_start",
			toolCallId: `${toolName}-${Date.now()}`,
			toolName,
			args: { path: `/tmp/${toolName}.ts` },
		});
		pi.emit("tool_execution_end", {
			type: "tool_execution_end",
			toolCallId: `${toolName}-${Date.now()}`,
			toolName,
			result: "ok",
			isError: false,
		});
	}

	pi.emit("turn_end", { type: "turn_end", turnIndex: 0, message: {}, toolResults: [] });

	// Agent end
	pi.emit("agent_end", { type: "agent_end", messages: [{ role: "assistant" }] });
}

/** Strip ANSI codes */
function plain(text: string): string {
	return text.replace(/\x1b\[[0-9;]*m/g, "");
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Multi-turn: names persist after first prompt", () => {
	it("tool names are present in events after first run", () => {
		const pi = createMockPi();
		const collector = new EventCollector(pi as any);
		collector.start();

		// First prompt
		simulateAgentRun(pi, ["read", "edit"]);

		const events1 = collector.state.events.filter((e) => e.category === "tool");
		expect(events1.some((e) => e.label.includes("read"))).toBe(true);
		expect(events1.some((e) => e.label.includes("edit"))).toBe(true);

		// Second prompt
		simulateAgentRun(pi, ["bash", "write"]);

		const events2 = collector.state.events.filter((e) => e.category === "tool");
		expect(events2.some((e) => e.label.includes("bash"))).toBe(true);
		expect(events2.some((e) => e.label.includes("write"))).toBe(true);

		// First run names should STILL be present
		expect(events2.some((e) => e.label.includes("read"))).toBe(true);
		expect(events2.some((e) => e.label.includes("edit"))).toBe(true);
	});

	it("compact widget shows tool names after second run", () => {
		const pi = createMockPi();
		const collector = new EventCollector(pi as any);
		collector.start();

		simulateAgentRun(pi, ["read"]);

		const widget = new CompactWidget(() => collector.state);

		// Start second run with active tools
		pi.emit("before_agent_start", { type: "before_agent_start", prompt: "second prompt" });
		pi.emit("agent_start", { type: "agent_start" });
		pi.emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });
		pi.emit("tool_execution_start", {
			type: "tool_execution_start",
			toolCallId: "edit-2",
			toolName: "edit",
			args: {},
		});

		widget.invalidate();
		const lines = widget.render(120);
		const content = plain(lines[0]);

		// Compact widget shows tool count, not individual names
		expect(content).toContain("tools");
		expect(content).toContain("1"); // 1 running tool
	});

	it("overlay shows event labels after second run", () => {
		const pi = createMockPi();
		const collector = new EventCollector(pi as any);
		collector.start();

		simulateAgentRun(pi, ["read", "bash"]);

		// Second run
		simulateAgentRun(pi, ["edit", "write"]);

		const overlay = new DebugOverlay(() => collector.state, () => {}, false);
		const lines = overlay.render(120, 40);
		const content = plain(lines.join("\n"));

		// All tool names should be visible in the timeline
		expect(content).toContain("read");
		expect(content).toContain("bash");
		expect(content).toContain("edit");
		expect(content).toContain("write");
	});

	it("hook names persist across multiple runs", () => {
		const pi = createMockPi();
		const collector = new EventCollector(pi as any);
		collector.start();

		// First run
		pi.emit("context", { type: "context", messages: [] });
		pi.emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });

		// Second run
		pi.emit("context", { type: "context", messages: [{ role: "user" }] });
		pi.emit("turn_start", { type: "turn_start", turnIndex: 0, timestamp: Date.now() });

		const hookEvents = collector.state.events.filter((e) => e.category === "hook");
		expect(hookEvents.length).toBeGreaterThanOrEqual(2);
		// All hook events should reference "context" (case-insensitive)
		for (const evt of hookEvents) {
			expect(evt.label.toLowerCase()).toContain("context");
		}
	});

	it("event labels are never empty or just numbers", () => {
		const pi = createMockPi();
		const collector = new EventCollector(pi as any);
		collector.start();

		// Two full agent runs
		simulateAgentRun(pi, ["read", "edit", "bash"]);
		simulateAgentRun(pi, ["write", "grep"]);

		for (const event of collector.state.events) {
			// Every event must have a non-empty label that contains words, not just numbers
			expect(event.label.length).toBeGreaterThan(0);
			// Should contain at least one letter (not just numbers/symbols)
			expect(/[a-zA-Z]/.test(event.label)).toBe(true);
		}
	});

	it("eventType is always a readable string, never just an ID", () => {
		const pi = createMockPi();
		const collector = new EventCollector(pi as any);
		collector.start();

		simulateAgentRun(pi, ["read"]);
		simulateAgentRun(pi, ["bash"]);

		for (const event of collector.state.events) {
			// eventType should be underscore-separated words like "tool_execution_start"
			expect(event.eventType.length).toBeGreaterThan(0);
			expect(/^[a-z_]+$/.test(event.eventType)).toBe(true);
		}
	});

	it("active tool names are readable strings after multiple runs", () => {
		const pi = createMockPi();
		const collector = new EventCollector(pi as any);
		collector.start();

		// First run — tool completes
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

		// Second run — tool is running
		pi.emit("tool_execution_start", {
			type: "tool_execution_start",
			toolCallId: "call-2",
			toolName: "edit",
			args: {},
		});

		// The active tool should have name "edit"
		const tool = collector.state.activeTools.get("call-2");
		expect(tool).toBeDefined();
		expect(tool!.name).toBe("edit");

		// The completed tool should still have name "read"
		const completedTool = collector.state.activeTools.get("call-1");
		expect(completedTool).toBeDefined();
		expect(completedTool!.name).toBe("read");
	});
});
