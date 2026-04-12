import { describe, expect, it } from "vitest";
import { getModel } from "../src/models.js";
import { convertResponsesMessages } from "../src/providers/openai-responses-shared.js";
import type { Context } from "../src/types.js";

describe("OpenAI Responses orphaned tool results", () => {
	it("drops synthetic tool results when no function_call remains in history", () => {
		const model = getModel("openai", "gpt-5-mini");
		const context: Context = {
			systemPrompt: "You are helpful.",
			messages: [
				{
					role: "user",
					content: "Use the tool.",
					timestamp: 1,
				},
				{
					role: "toolResult",
					toolCallId: "call_orphan|fc_orphan",
					toolName: "bash",
					content: [{ type: "text", text: "No result provided" }],
					isError: true,
					timestamp: 2,
				},
				{
					role: "user",
					content: "Continue.",
					timestamp: 3,
				},
			],
			tools: [],
		};

		const input = convertResponsesMessages(model, context, new Set(["openai", "openai-codex", "opencode"]));

		expect(input.some((item) => item.type === "function_call_output")).toBe(false);
	});
});
