import { describe, expect, it } from "vitest";
import { getModel } from "../src/models.js";
import { convertResponsesMessages } from "../src/providers/openai-responses-shared.js";
import type { Context, ToolResultMessage } from "../src/types.js";

describe("OpenAI Responses orphan tool result replay", () => {
	it("skips function_call_output items when no matching function_call exists in replay history", () => {
		const model = getModel("openai", "gpt-5-mini");
		const toolResult: ToolResultMessage = {
			role: "toolResult",
			toolCallId: "call_orphan_123|fc_orphan_123",
			toolName: "bash",
			content: [{ type: "text", text: "orphan output" }],
			isError: false,
			timestamp: Date.now() - 1000,
		};
		const context: Context = {
			systemPrompt: "You are concise.",
			messages: [{ role: "user", content: "hello", timestamp: Date.now() - 2000 }, toolResult],
		};

		const input = convertResponsesMessages(model, context, new Set(["openai", "openai-codex", "opencode"]));
		const orphanOutput = input.find((item) => item.type === "function_call_output");

		expect(orphanOutput).toBeUndefined();
	});
});
