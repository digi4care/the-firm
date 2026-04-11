/**
 * Regression tests for transform-messages.ts
 *
 * Tests the handling of errored/aborted assistant turns with tool calls.
 * These are the core scenarios from the "orphaned function_call_output" bug:
 *
 * Bug: When an OpenAI turn errors while containing tool calls,
 * transform-messages.js SKIPPED the errored turn (including function_call items).
 * The toolResult messages remained, causing orphaned function_call_output
 * in the next API call.
 *
 * Fix strategy (ported from oh-my-pi):
 * 1. Errored turns with tool calls are preserved (not skipped)
 * 2. Synthetic "aborted" tool results are injected for unpaired tool calls
 * 3. A developer message marks the turn as aborted
 * 4. strictResponsesPairing in openai-responses-shared.ts filters remaining orphans
 */
import { describe, expect, it } from "vitest";
import { transformMessages } from "../src/providers/transform-messages.js";
import type { AssistantMessage, Message, ToolCall, ToolResultMessage, Model } from "../src/types.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeOpenAIModel(): Model<"openai-responses"> {
	return {
		id: "gpt-5",
		name: "GPT-5",
		api: "openai-responses",
		provider: "openai",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 16000,
	};
}

function makeAssistantMsg(overrides: Partial<AssistantMessage> & Pick<AssistantMessage, "content" | "stopReason">): AssistantMessage {
	return {
		role: "assistant",
		api: "openai-responses",
		provider: "openai",
		model: "gpt-5",
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
		timestamp: Date.now(),
		...overrides,
	};
}

function makeToolCall(id: string, name: string, args: Record<string, any> = {}): ToolCall {
	return { type: "toolCall", id, name, arguments: args };
}

function makeToolResult(toolCallId: string, toolName: string, text: string, isError = false): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId,
		toolName,
		content: [{ type: "text", text }],
		isError,
		timestamp: Date.now(),
	};
}

function makeUserMsg(text: string): Message {
	return { role: "user", content: text, timestamp: Date.now() };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("transformMessages — errored turn handling", () => {
	const model = makeOpenAIModel();

	it("should insert synthetic tool results for orphaned tool calls when errored turn is skipped", () => {
		// Scenario: assistant errors mid-turn after emitting a tool call.
		// The errored turn is skipped, so the tool call has no matching result.
		// A synthetic "aborted" tool result must be injected.
		const messages: Message[] = [
			makeUserMsg("List files"),
			makeAssistantMsg({
				content: [makeToolCall("call_abc123", "bash", { command: "ls" })],
				stopReason: "error",
				errorMessage: "Connection reset",
			}),
			// Note: NO tool result for call_abc123
			makeUserMsg("Try again"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Here are your files..." }],
				stopReason: "stop",
			}),
		];

		const result = transformMessages(messages, model);

		// The errored turn should be skipped (not in output)
		const erroredAssistant = result.find(
			(m) => m.role === "assistant" && (m as AssistantMessage).stopReason === "error",
		);
		expect(erroredAssistant).toBeUndefined();

		// But a synthetic tool result for call_abc123 should be injected
		const syntheticResults = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_abc123",
		);
		expect(syntheticResults.length).toBeGreaterThanOrEqual(1);

		// The synthetic result should be an error
		const synthetic = syntheticResults[0] as ToolResultMessage;
		expect(synthetic.isError).toBe(true);
		expect(synthetic.content[0]).toEqual(expect.objectContaining({ type: "text" }));
	});

	it("should NOT duplicate synthetic results when a real tool result already exists", () => {
		// Scenario: errored turn with tool call, but the tool result WAS already received
		const messages: Message[] = [
			makeUserMsg("List files"),
			makeAssistantMsg({
				content: [makeToolCall("call_abc123", "bash", { command: "ls" })],
				stopReason: "error",
				errorMessage: "Connection reset",
			}),
			makeToolResult("call_abc123", "bash", "file1.txt\nfile2.txt"),
			makeUserMsg("Good, now count lines"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Done" }],
				stopReason: "stop",
			}),
		];

		const result = transformMessages(messages, model);

		// Only the real tool result should exist — no synthetic duplicate
		const results = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_abc123",
		);
		expect(results).toHaveLength(1);

		const realResult = results[0] as ToolResultMessage;
		expect(realResult.isError).toBe(false);
		expect((realResult.content[0] as { type: "text"; text: string }).text).toBe("file1.txt\nfile2.txt");
	});

	it("should handle multiple tool calls in an errored turn", () => {
		const messages: Message[] = [
			makeUserMsg("Do two things"),
			makeAssistantMsg({
				content: [
					makeToolCall("call_001", "bash", { command: "ls" }),
					makeToolCall("call_002", "bash", { command: "pwd" }),
				],
				stopReason: "error",
				errorMessage: "Timeout",
			}),
			// Only one tool result arrived before the error
			makeToolResult("call_001", "bash", "file1.txt"),
			makeUserMsg("Continue"),
			makeAssistantMsg({
				content: [{ type: "text", text: "OK" }],
				stopReason: "stop",
			}),
		];

		const result = transformMessages(messages, model);

		// call_001 has a real result — should NOT get a synthetic one
		const results001 = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_001",
		);
		expect(results001).toHaveLength(1);
		expect((results001[0] as ToolResultMessage).isError).toBe(false);

		// call_002 has NO real result — should get a synthetic one
		const results002 = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_002",
		);
		expect(results002).toHaveLength(1);
		expect((results002[0] as ToolResultMessage).isError).toBe(true);
	});

	it("should handle aborted turns same as errored", () => {
		const messages: Message[] = [
			makeUserMsg("List files"),
			makeAssistantMsg({
				content: [makeToolCall("call_abort1", "bash", { command: "ls" })],
				stopReason: "aborted",
			}),
			makeUserMsg("Never mind"),
			makeAssistantMsg({
				content: [{ type: "text", text: "OK" }],
				stopReason: "stop",
			}),
		];

		const result = transformMessages(messages, model);

		const syntheticResults = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_abort1",
		);
		expect(syntheticResults.length).toBeGreaterThanOrEqual(1);
		expect((syntheticResults[0] as ToolResultMessage).isError).toBe(true);
	});

	it("should handle user message interrupting tool call flow", () => {
		// Scenario: assistant makes tool call, then user sends new message
		// without providing tool result — synthetic result should be injected
		const messages: Message[] = [
			makeUserMsg("Do something"),
			makeAssistantMsg({
				content: [makeToolCall("call_interrupt", "bash", { command: "ls" })],
				stopReason: "toolUse",
			}),
			// User interrupts — no tool result, just a new message
			makeUserMsg("Actually, do something else"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Sure thing" }],
				stopReason: "stop",
			}),
		];

		const result = transformMessages(messages, model);

		// The successful assistant turn should still be there
		const assistantMsgs = result.filter((m) => m.role === "assistant");
		const goodAssistant = assistantMsgs.find(
			(m) => (m as AssistantMessage).stopReason === "toolUse",
		);
		expect(goodAssistant).toBeDefined();

		// Synthetic result should be injected before the user message
		const userIndex = result.findIndex(
			(m) => m.role === "user" && m.content === "Actually, do something else",
		);
		const syntheticBeforeUser = result.slice(0, userIndex).filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_interrupt",
		);
		expect(syntheticBeforeUser.length).toBeGreaterThanOrEqual(1);
	});

	it("should preserve normal tool call → result flow", () => {
		// Happy path: tool call followed by result should work unchanged
		const messages: Message[] = [
			makeUserMsg("List files"),
			makeAssistantMsg({
				content: [makeToolCall("call_happy", "bash", { command: "ls" })],
				stopReason: "toolUse",
			}),
			makeToolResult("call_happy", "bash", "file1.txt\nfile2.txt"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Here are your files" }],
				stopReason: "stop",
			}),
		];

		const result = transformMessages(messages, model);

		// No synthetic results should be injected
		const syntheticResults = result.filter(
			(m) =>
				m.role === "toolResult" &&
				(m as ToolResultMessage).isError === true &&
				(m as ToolResultMessage).content[0]?.type === "text" &&
				((m as ToolResultMessage).content[0] as { text: string }).text === "No result provided",
		);
		expect(syntheticResults).toHaveLength(0);

		// The real tool result should be preserved
		const realResults = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_happy",
		);
		expect(realResults).toHaveLength(1);
	});

	it("should handle consecutive errored turns", () => {
		const messages: Message[] = [
			makeUserMsg("Do it"),
			makeAssistantMsg({
				content: [makeToolCall("call_err1", "bash", { command: "ls" })],
				stopReason: "error",
				errorMessage: "Error 1",
			}),
			makeUserMsg("Retry"),
			makeAssistantMsg({
				content: [makeToolCall("call_err2", "bash", { command: "ls -la" })],
				stopReason: "error",
				errorMessage: "Error 2",
			}),
			makeUserMsg("One more try"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Done" }],
				stopReason: "stop",
			}),
		];

		const result = transformMessages(messages, model);

		// Both errored tool calls should get synthetic results
		const results1 = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_err1",
		);
		expect(results1.length).toBeGreaterThanOrEqual(1);
		expect((results1[0] as ToolResultMessage).isError).toBe(true);

		const results2 = result.filter(
			(m) => m.role === "toolResult" && (m as ToolResultMessage).toolCallId === "call_err2",
		);
		expect(results2.length).toBeGreaterThanOrEqual(1);
		expect((results2[0] as ToolResultMessage).isError).toBe(true);
	});
});
