import { describe, expect, it } from "vitest";
import { supportsXhigh } from "../src/models.js";
import { clampReasoning } from "../src/providers/simple-options.js";
import type { Model } from "../src/types.js";

describe("openai-completions reasoning effort integration with thinking-compat", () => {
	function resolveReasoningEffort(model: Model<"openai-completions">, requested: "minimal" | "low" | "medium" | "high" | "xhigh" | undefined) {
		// Mirrors the logic in streamSimpleOpenAICompletions
		return supportsXhigh(model) ? requested : clampReasoning(requested);
	}

	it("allows xhigh for openai-codex gpt-5.4", () => {
		const model = { provider: "openai-codex", id: "gpt-5.4" } as Model<"openai-completions">;
		expect(resolveReasoningEffort(model, "xhigh")).toBe("xhigh");
	});

	it("allows xhigh for anthropic opus-4-6", () => {
		const model = { provider: "anthropic", id: "claude-opus-4-6" } as Model<"anthropic-messages">;
		expect(resolveReasoningEffort(model as any, "xhigh")).toBe("xhigh");
	});

	it("clamps xhigh to high for zai models", () => {
		const model = { provider: "zai", id: "glm-4.5" } as Model<"openai-completions">;
		expect(resolveReasoningEffort(model, "xhigh")).toBe("high");
	});

	it("clamps xhigh to high for opencode models", () => {
		const model = { provider: "opencode", id: "glm-5.1" } as Model<"openai-completions">;
		expect(resolveReasoningEffort(model, "xhigh")).toBe("high");
	});

	it("passes through non-xhigh levels for all models", () => {
		const models = [
			{ provider: "openai-codex", id: "gpt-5.4" },
			{ provider: "zai", id: "glm-4.5" },
			{ provider: "opencode", id: "glm-5.1" },
			{ provider: "anthropic", id: "claude-sonnet-4-5" },
		] as Model<"openai-completions">[];

		for (const model of models) {
			for (const level of ["minimal", "low", "medium", "high"] as const) {
				expect(resolveReasoningEffort(model, level)).toBe(level);
			}
		}
	});
});
