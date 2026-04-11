/**
 * Regression tests for openai-responses-shared.ts — strictResponsesPairing
 *
 * Tests that orphaned function_call_output items (without matching function_call)
 * are filtered before being sent to the OpenAI Responses API.
 *
 * This is the second layer of defense after transform-messages.ts.
 */
import { describe, expect, it } from "vitest";
import { convertResponsesMessages } from "../src/providers/openai-responses-shared.js";
import type { AssistantMessage, Context, Message, Model, ToolCall, ToolResultMessage } from "../src/types.js";

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
	return { type: "toolCall", id: `${id}|fc_${id}`, name, arguments: args };
}

function makeToolResult(toolCallId: string, toolName: string, text: string, isError = false): ToolResultMessage {
	return {
		role: "toolResult",
		toolCallId: `${toolCallId}|fc_${toolCallId}`,
		toolName,
		content: [{ type: "text", text }],
		isError,
		timestamp: Date.now(),
	};
}

function makeUserMsg(text: string): Message {
	return { role: "user", content: text, timestamp: Date.now() };
}

const allowedProviders = new Set(["openai", "openai-codex", "azure-openai-responses", "github-copilot"]);

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("convertResponsesMessages — orphaned function_call_output filtering", () => {
	const model = makeOpenAIModel();

	it("should filter orphaned tool results that have no matching function_call", () => {
		// Scenario: errored turn emitted tool call, transform-messages skipped it,
		// but the tool result is still in history. Without filtering, this becomes
		// an orphaned function_call_output that crashes the API.
		const messages: Message[] = [
			makeUserMsg("List files"),
			// This errored assistant turn will be SKIPPED by transform-messages
			// (its function_call won't be in the output)
			makeAssistantMsg({
				content: [makeToolCall("call_orphan1", "bash", { command: "ls" })],
				stopReason: "error",
				errorMessage: "Connection reset",
			}),
			// This tool result arrived AFTER the error — it's orphaned
			makeToolResult("call_orphan1", "bash", "file1.txt"),
			makeUserMsg("Continue"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Done" }],
				stopReason: "stop",
			}),
		];

		const context: Context = {
			systemPrompt: "You are a helpful assistant.",
			messages,
			tools: [],
		};

		const result = convertResponsesMessages(model, context, allowedProviders, { includeSystemPrompt: true });

		// Check: no function_call_output without a matching function_call
		const functionCalls = result.filter(
			(item: any) => item.type === "function_call",
		);
		const functionCallOutputs = result.filter(
			(item: any) => item.type === "function_call_output",
		);

		const callIds = new Set(functionCalls.map((fc: any) => fc.call_id));

		for (const output of functionCallOutputs) {
			expect(callIds.has((output as any).call_id)).toBe(true);
		}
	});

	it("should preserve paired function_call + function_call_output", () => {
		// Happy path: tool call followed by result should work
		const messages: Message[] = [
			makeUserMsg("List files"),
			makeAssistantMsg({
				content: [makeToolCall("call_paired", "bash", { command: "ls" })],
				stopReason: "toolUse",
			}),
			makeToolResult("call_paired", "bash", "file1.txt"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Here are the files" }],
				stopReason: "stop",
			}),
		];

		const context: Context = {
			systemPrompt: undefined,
			messages,
			tools: [],
		};

		const result = convertResponsesMessages(model, context, allowedProviders, { includeSystemPrompt: false });

		const functionCalls = result.filter((item: any) => item.type === "function_call");
		const functionCallOutputs = result.filter((item: any) => item.type === "function_call_output");

		expect(functionCalls.length).toBe(1);
		expect(functionCallOutputs.length).toBe(1);
		expect((functionCalls[0] as any).call_id).toBe("call_paired");
		expect((functionCallOutputs[0] as any).call_id).toBe("call_paired");
	});

	it("should handle multiple orphaned results mixed with paired ones", () => {
		const messages: Message[] = [
			makeUserMsg("Do multiple things"),
			// First tool call — paired (result exists)
			makeAssistantMsg({
				content: [makeToolCall("call_good", "bash", { command: "echo good" })],
				stopReason: "toolUse",
			}),
			makeToolResult("call_good", "bash", "good"),
			// Second tool call — orphaned (errored turn, result exists but call skipped)
			makeAssistantMsg({
				content: [makeToolCall("call_bad", "bash", { command: "echo bad" })],
				stopReason: "error",
				errorMessage: "Timeout",
			}),
			makeToolResult("call_bad", "bash", "bad"),
			makeUserMsg("Continue"),
			makeAssistantMsg({
				content: [{ type: "text", text: "Done" }],
				stopReason: "stop",
			}),
		];

		const context: Context = {
			systemPrompt: undefined,
			messages,
			tools: [],
		};

		const result = convertResponsesMessages(model, context, allowedProviders, { includeSystemPrompt: false });

		const functionCalls = result.filter((item: any) => item.type === "function_call");
		const functionCallOutputs = result.filter((item: any) => item.type === "function_call_output");

		const callIds = new Set(functionCalls.map((fc: any) => fc.call_id));

		// All outputs must have matching calls
		for (const output of functionCallOutputs) {
			expect(callIds.has((output as any).call_id)).toBe(true);
		}

		// The good call should still have its output
		expect(callIds.has("call_good")).toBe(true);
	});
});
