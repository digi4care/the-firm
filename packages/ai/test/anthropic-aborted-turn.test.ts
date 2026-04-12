/**
 * Regression tests for Anthropic aborted-turn handling.
 *
 * These tests verify the hotfixes for:
 * 1. Errored/aborted assistant messages are skipped in transformMessages
 * 2. Tool calls from aborted turns don't orphan tool results
 * 3. Thinking signatures from aborted streams don't crash the provider
 *
 * Refs: the-firm-sxo, commits 2d27a2c7, cc0f0fd9, 76312ea7
 */

import { describe, expect, it } from "vitest";
import { transformMessages } from "../src/providers/transform-messages.js";
import type { AssistantMessage, Message, Model } from "../src/types.js";

function makeAnthropicModel(): Model<"anthropic-messages"> {
	return {
		id: "claude-sonnet-4",
		name: "Claude Sonnet 4",
		api: "anthropic-messages",
		provider: "anthropic",
		baseUrl: "https://api.anthropic.com",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 16000,
	};
}

describe("Anthropic aborted-turn handling", () => {
	it("skips errored assistant messages entirely", () => {
		const model = makeAnthropicModel();
		const messages: Message[] = [
			{ role: "user", content: "hello", timestamp: Date.now() },
			{
				role: "assistant",
				content: [{ type: "text", text: "partial response..." }],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4",
				usage: {
					input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "error",
				errorMessage: "stream interrupted",
				timestamp: Date.now(),
			} as AssistantMessage,
			{ role: "user", content: "try again", timestamp: Date.now() },
		];

		const result = transformMessages(messages, model);

		// Should have: user, user (skipped the errored assistant)
		expect(result).toHaveLength(2);
		expect(result[0].role).toBe("user");
		expect(result[1].role).toBe("user");
	});

	it("skips aborted assistant messages entirely", () => {
		const model = makeAnthropicModel();
		const messages: Message[] = [
			{ role: "user", content: "hello", timestamp: Date.now() },
			{
				role: "assistant",
				content: [{ type: "text", text: "thinking..." }],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4",
				usage: {
					input: 10, output: 3, cacheRead: 0, cacheWrite: 0, totalTokens: 13,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "aborted",
				timestamp: Date.now(),
			} as AssistantMessage,
			{ role: "user", content: "continue", timestamp: Date.now() },
		];

		const result = transformMessages(messages, model);

		expect(result).toHaveLength(2);
		expect(result[0].role).toBe("user");
		expect(result[1].role).toBe("user");
	});

	it("skips aborted turn with tool calls — no orphaned tool results", () => {
		const model = makeAnthropicModel();
		const messages: Message[] = [
			{ role: "user", content: "run tool", timestamp: Date.now() },
			{
				role: "assistant",
				content: [
					{
						type: "toolCall",
						id: "toolu_call_abc123",
						name: "read_file",
						arguments: { path: "/tmp/test.txt" },
					},
				],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4",
				usage: {
					input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "error",
				errorMessage: "connection lost",
				timestamp: Date.now(),
			} as AssistantMessage,
			// Next turn — the tool call from the aborted turn should NOT appear
			{ role: "user", content: "try again", timestamp: Date.now() },
		];

		const result = transformMessages(messages, model);

		// Should skip the errored assistant + its tool calls
		expect(result).toHaveLength(2);
		expect(result[0].role).toBe("user");
		expect(result[1].role).toBe("user");
		// No toolCall blocks should be in the result
		const assistantMessages = result.filter((m) => m.role === "assistant");
		expect(assistantMessages).toHaveLength(0);
	});

	it("handles aborted turn with thinking but no signature", () => {
		const model = makeAnthropicModel();
		const messages: Message[] = [
			{ role: "user", content: "think about this", timestamp: Date.now() },
			{
				role: "assistant",
				content: [
					{
						type: "thinking",
						thinking: "Let me reason about...",
						thinkingSignature: "", // empty — aborted before signature arrived
					},
				],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4",
				usage: {
					input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "error",
				errorMessage: "timeout",
				timestamp: Date.now(),
			} as AssistantMessage,
			{ role: "user", content: "retry", timestamp: Date.now() },
		];

		const result = transformMessages(messages, model);

		// The errored assistant with empty thinking signature should be skipped
		expect(result).toHaveLength(2);
		expect(result[0].role).toBe("user");
		expect(result[1].role).toBe("user");
	});

	it("preserves successful turn between two aborted turns", () => {
		const model = makeAnthropicModel();
		const messages: Message[] = [
			{ role: "user", content: "hello", timestamp: Date.now() },
			{
				role: "assistant",
				content: [{ type: "text", text: "partial..." }],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4",
				usage: {
					input: 10, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 15,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "error",
				errorMessage: "timeout",
				timestamp: Date.now(),
			} as AssistantMessage,
			{ role: "user", content: "try again", timestamp: Date.now() },
			{
				role: "assistant",
				content: [{ type: "text", text: "Hello! How can I help?" }],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4",
				usage: {
					input: 20, output: 10, cacheRead: 0, cacheWrite: 0, totalTokens: 30,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "stop",
				timestamp: Date.now(),
			} as AssistantMessage,
			{ role: "user", content: "one more try", timestamp: Date.now() },
			{
				role: "assistant",
				content: [{ type: "text", text: "another partial..." }],
				api: "anthropic-messages",
				provider: "anthropic",
				model: "claude-sonnet-4",
				usage: {
					input: 30, output: 5, cacheRead: 0, cacheWrite: 0, totalTokens: 35,
					cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
				},
				stopReason: "aborted",
				timestamp: Date.now(),
			} as AssistantMessage,
			{ role: "user", content: "final attempt", timestamp: Date.now() },
		];

		const result = transformMessages(messages, model);

		// Should have: user, user, assistant(success), user, user
		expect(result).toHaveLength(5);
		expect(result[0].role).toBe("user");
		expect(result[1].role).toBe("user");
		expect(result[2].role).toBe("assistant");
		expect((result[2] as AssistantMessage).stopReason).toBe("stop");
		expect(result[3].role).toBe("user");
		expect(result[4].role).toBe("user");
	});
});
