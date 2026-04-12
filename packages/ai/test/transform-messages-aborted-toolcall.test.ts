import { describe, expect, it } from "vitest";
import { transformMessages } from "../src/providers/transform-messages.js";
import type { AssistantMessage, Message, Model, ToolCall, ToolResultMessage } from "../src/types.js";

// Normalize function matching what anthropic.ts uses
function anthropicNormalizeToolCallId(
	id: string,
	_model: Model<"anthropic-messages">,
	_source: AssistantMessage,
): string {
	return id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
}

/**
 * Simulate a kimi-coding model that routes through Anthropic Messages API.
 * The model has api="openai-completions" in model definition but the kimi provider
 * creates a synthetic anthropic-messages model at runtime.
 */
function makeKimiModel(): Model<"anthropic-messages"> {
	return {
		id: "kimi-k2-thinking",
		name: "Kimi K2 Thinking",
		api: "anthropic-messages",
		provider: "kimi-coding",
		baseUrl: "https://api.kimi.com/coding",
		reasoning: true,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 262144,
		maxTokens: 32768,
	};
}

function baseUsage() {
	return {
		input: 100,
		output: 50,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 150,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

describe("transformMessages — aborted/errored tool calls", () => {
	const model = makeKimiModel();

	it("KEEPS aborted assistant message with tool_use blocks (prevents 'tool_call_id is not found')", () => {
		// Scenario: Kimi generates a tool call, then the turn errors/aborts.
		// The next turn must still see the tool_use blocks.
		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: "toolu_abc123", name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error",
				timestamp: 2000,
			} as AssistantMessage,
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// The aborted assistant message must be KEPT (not skipped)
		const assistants = result.filter((m) => m.role === "assistant");
		expect(assistants).toHaveLength(1);
		expect((assistants[0] as AssistantMessage).stopReason).toBe("error");

		// The tool_use block must survive
		const toolCalls = (assistants[0] as AssistantMessage).content.filter((b) => b.type === "toolCall");
		expect(toolCalls).toHaveLength(1);
		expect((toolCalls[0] as ToolCall).id).toBe("toolu_abc123");
	});

	it("injects synthetic tool result for aborted tool calls before next user message", () => {
		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: "toolu_abc123", name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error",
				timestamp: 2000,
			} as AssistantMessage,
			{ role: "user", content: "try again", timestamp: 3000 },
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// Should have: user, assistant(error), toolResult(synthetic), user
		const resultRoles = result.map((m) => m.role);
		expect(resultRoles).toEqual(["user", "assistant", "toolResult", "user"]);

		// Synthetic tool result should reference the original tool call ID
		const toolResult = result.find((m) => m.role === "toolResult") as ToolResultMessage;
		expect(toolResult.toolCallId).toBe("toolu_abc123");
		expect(toolResult.isError).toBe(true);
	});

	it("accepts real tool results for aborted tool calls", () => {
		// Scenario: Turn aborted, but tool result still arrives before next user message
		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: "toolu_abc123", name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error",
				timestamp: 2000,
			} as AssistantMessage,
			{
				role: "toolResult",
				toolCallId: "toolu_abc123",
				toolName: "bash",
				content: [{ type: "text", text: "file1.txt\nfile2.txt" }],
				isError: false,
				timestamp: 2500,
			} as ToolResultMessage,
			{ role: "user", content: "thanks", timestamp: 3000 },
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// Should have: user, assistant(error), toolResult(real), user
		const toolResults = result.filter((m) => m.role === "toolResult");
		expect(toolResults).toHaveLength(1);

		const toolResult = toolResults[0] as ToolResultMessage;
		expect(toolResult.toolCallId).toBe("toolu_abc123");
		expect(toolResult.isError).toBe(false);
		// Real content preserved
		expect((toolResult.content[0] as { type: "text"; text: string }).text).toBe("file1.txt\nfile2.txt");
	});

	it("does NOT inject duplicate synthetic results when real result exists", () => {
		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: "toolu_abc123", name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error",
				timestamp: 2000,
			} as AssistantMessage,
			{
				role: "toolResult",
				toolCallId: "toolu_abc123",
				toolName: "bash",
				content: [{ type: "text", text: "result" }],
				isError: false,
				timestamp: 2500,
			} as ToolResultMessage,
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// Only ONE tool result — the real one, no synthetic duplicate
		const toolResults = result.filter((m) => m.role === "toolResult");
		expect(toolResults).toHaveLength(1);
	});

	it("strips partial thinking signatures from aborted turns", () => {
		const messages: Message[] = [
			{ role: "user", content: "think and calculate", timestamp: 1000 },
			{
				role: "assistant",
				content: [
					{
						type: "thinking",
						thinking: "Let me calculate...",
						thinkingSignature: "partial_sig_that_is_incomplete",
					},
					{ type: "toolCall", id: "toolu_xyz", name: "calc", arguments: { expr: "2+2" } } as ToolCall,
				],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "aborted",
				timestamp: 2000,
			} as AssistantMessage,
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		const assistant = result.find((m) => m.role === "assistant") as AssistantMessage;
		const thinkingBlock = assistant.content.find((b) => b.type === "thinking") as {
			type: "thinking";
			thinking: string;
			thinkingSignature?: string;
		};

		// Thinking signature must be stripped from aborted turn
		expect(thinkingBlock).toBeDefined();
		expect(thinkingBlock.thinking).toBe("Let me calculate...");
		expect(thinkingBlock.thinkingSignature).toBeUndefined();
	});

	it("handles multiple tool calls in an aborted turn", () => {
		const messages: Message[] = [
			{ role: "user", content: "do two things", timestamp: 1000 },
			{
				role: "assistant",
				content: [
					{ type: "toolCall", id: "toolu_aaa", name: "bash", arguments: { command: "ls" } } as ToolCall,
					{ type: "toolCall", id: "toolu_bbb", name: "read", arguments: { path: "test.txt" } } as ToolCall,
				],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error",
				timestamp: 2000,
			} as AssistantMessage,
			// Only one tool result arrives (for toolu_aaa)
			{
				role: "toolResult",
				toolCallId: "toolu_aaa",
				toolName: "bash",
				content: [{ type: "text", text: "file1.txt" }],
				isError: false,
				timestamp: 2500,
			} as ToolResultMessage,
			{ role: "user", content: "continue", timestamp: 3000 },
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// Assistant message kept with both tool calls
		const assistants = result.filter((m) => m.role === "assistant");
		expect(assistants).toHaveLength(1);
		const toolCalls = (assistants[0] as AssistantMessage).content.filter((b) => b.type === "toolCall");
		expect(toolCalls).toHaveLength(2);

		// Real result for toolu_aaa + synthetic result for toolu_bbb
		const toolResults = result.filter((m) => m.role === "toolResult") as ToolResultMessage[];
		expect(toolResults).toHaveLength(2);

		const realResult = toolResults.find((r) => r.toolCallId === "toolu_aaa");
		const syntheticResult = toolResults.find((r) => r.toolCallId === "toolu_bbb");
		expect(realResult?.isError).toBe(false);
		expect(syntheticResult?.isError).toBe(true);
	});

	it("handles aborted turn at end of conversation (trailing flush)", () => {
		// Aborted turn is the LAST message — no subsequent user message
		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: "toolu_end", name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error",
				timestamp: 2000,
			} as AssistantMessage,
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// Final flush should inject synthetic result even without trailing user message
		const toolResults = result.filter((m) => m.role === "toolResult");
		expect(toolResults).toHaveLength(1);
		expect((toolResults[0] as ToolResultMessage).toolCallId).toBe("toolu_end");
	});

	it("does NOT break normal (non-aborted) tool call flow", () => {
		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: "toolu_normal", name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "toolUse",
				timestamp: 2000,
			} as AssistantMessage,
			{
				role: "toolResult",
				toolCallId: "toolu_normal",
				toolName: "bash",
				content: [{ type: "text", text: "file1.txt\nfile2.txt" }],
				isError: false,
				timestamp: 2500,
			} as ToolResultMessage,
			{ role: "user", content: "thanks", timestamp: 3000 },
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		const resultRoles = result.map((m) => m.role);
		expect(resultRoles).toEqual(["user", "assistant", "toolResult", "user"]);

		// No synthetic results injected
		const toolResults = result.filter((m) => m.role === "toolResult") as ToolResultMessage[];
		expect(toolResults).toHaveLength(1);
		expect(toolResults[0].isError).toBe(false);
	});

	it("handles orphaned tool call from normal turn (user interrupts before result)", () => {
		// This was the existing behavior — make sure it still works
		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: "toolu_orphan", name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "toolUse",
				timestamp: 2000,
			} as AssistantMessage,
			// No toolResult! User interrupts with new message
			{ role: "user", content: "never mind", timestamp: 3000 },
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		const toolResults = result.filter((m) => m.role === "toolResult") as ToolResultMessage[];
		expect(toolResults).toHaveLength(1);
		expect(toolResults[0].toolCallId).toBe("toolu_orphan");
		expect(toolResults[0].isError).toBe(true);
	});

	/**
	 * The EXACT scenario from the bug report:
	 * 1. Kimi makes tool calls, turn errors mid-stream
	 * 2. Next turn: API gets tool_result without matching tool_use → 400
	 */
	it("reproduces and fixes the exact Kimi 'tool_call_id is not found' scenario", () => {
		// Simulate a realistic multi-turn conversation with an error
		const messages: Message[] = [
			// Turn 1: Normal interaction
			{ role: "user", content: "help me with the project", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "text", text: "Sure! What do you need?" }],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "stop",
				timestamp: 2000,
			} as AssistantMessage,

			// Turn 2: User asks for files, Kimi starts tool calls but ERRORS
			{ role: "user", content: "show me the config", timestamp: 3000 },
			{
				role: "assistant",
				content: [
					{
						type: "thinking",
						thinking: "I need to read the config file...",
						thinkingSignature: "partial_sig_abc",
					},
					{
						type: "toolCall",
						id: "toolu_kimi_001",
						name: "read",
						arguments: { path: "config.yaml" },
					} as ToolCall,
				],
				api: "anthropic-messages" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error", // ← TURN ERRORED MID-STREAM
				timestamp: 4000,
			} as AssistantMessage,

			// Turn 3: User retries — THIS is where the 400 error would happen
			{ role: "user", content: "try again please", timestamp: 5000 },
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// ASSERT: The flow that would be sent to Kimi's Anthropic API
		// Must have: user, assistant(normal), user, assistant(error+tool_use), toolResult(synthetic), user
		const resultRoles = result.map((m) => m.role);
		expect(resultRoles).toEqual(["user", "assistant", "user", "assistant", "toolResult", "user"]);

		// The errored assistant message MUST be present with its tool_use block
		const erroredAssistant = result[3] as AssistantMessage;
		expect(erroredAssistant.stopReason).toBe("error");
		const toolCalls = erroredAssistant.content.filter((b) => b.type === "toolCall");
		expect(toolCalls).toHaveLength(1);
		expect((toolCalls[0] as ToolCall).id).toBe("toolu_kimi_001");

		// Thinking signature must be stripped (partial = invalid)
		const thinking = erroredAssistant.content.find((b) => b.type === "thinking") as {
			type: "thinking";
			thinkingSignature?: string;
		};
		expect(thinking.thinkingSignature).toBeUndefined();

		// Synthetic tool result must reference the same ID
		const toolResult = result[4] as ToolResultMessage;
		expect(toolResult.toolCallId).toBe("toolu_kimi_001");
		expect(toolResult.isError).toBe(true);

		// The pairing is now valid:
		// assistant message has: tool_use(id="toolu_kimi_001")
		// tool_result has: tool_use_id="toolu_kimi_001"
		// → Kimi API will ACCEPT this (no more "tool_call_id is not found")
	});

	it("handles OpenAI-format tool call IDs with pipes (call_xxx|fc_yyy) through Anthropic normalization", () => {
		// Kimi k2p5 uses api="openai-completions" so tool call IDs come in OpenAI format.
		// When routed through Anthropic API, the IDs must be normalized.
		const toolCallId = "call_n6F6i6sNuVwaLwC9KiE645uu|fc_04d9225ad9a2464d0169db5bf353888191826b0591933a39e6";

		const messages: Message[] = [
			{ role: "user", content: "list files", timestamp: 1000 },
			{
				role: "assistant",
				content: [{ type: "toolCall", id: toolCallId, name: "bash", arguments: { command: "ls" } } as ToolCall],
				api: "openai-completions" as const,
				provider: "kimi-coding",
				model: "kimi-k2-thinking",
				usage: baseUsage(),
				stopReason: "error",
				timestamp: 2000,
			} as AssistantMessage,
			// Real tool result arrives with the original ID
			{
				role: "toolResult",
				toolCallId: toolCallId,
				toolName: "bash",
				content: [{ type: "text", text: "result" }],
				isError: false,
				timestamp: 2500,
			} as ToolResultMessage,
			{ role: "user", content: "continue", timestamp: 3000 },
		];

		const result = transformMessages(messages, model, anthropicNormalizeToolCallId);

		// The tool call ID in the assistant message should be normalized
		const assistant = result.find((m) => m.role === "assistant") as AssistantMessage;
		const tc = assistant.content.find((b) => b.type === "toolCall") as ToolCall;

		// Pipe character and >64 char length should be normalized
		expect(tc.id).not.toContain("|");
		expect(tc.id.length).toBeLessThanOrEqual(64);

		// The tool result should reference the SAME normalized ID
		const toolResult = result.find((m) => m.role === "toolResult") as ToolResultMessage;
		expect(toolResult.toolCallId).toBe(tc.id);
	});
});
