import { describe, expect, it } from "vitest";
import { getModel, supportsXhigh } from "../src/models.js";
import { supportsXhigh as supportsXhighCompat } from "../src/thinking-compat.js";

describe("models.ts supportsXhigh integration", () => {
	it("delegates to thinking-compat for all sampled models", () => {
		const testCases = [
			{ provider: "anthropic", modelId: "claude-opus-4-6", expected: true },
			{ provider: "anthropic", modelId: "claude-sonnet-4-5", expected: false },
			{ provider: "openai-codex", modelId: "gpt-5.4", expected: true },
			{ provider: "zai", modelId: "glm-4.5", expected: false },
			{ provider: "opencode", modelId: "glm-5.1", expected: false },
			{ provider: "openrouter", modelId: "anthropic/claude-opus-4.6", expected: true },
			{ provider: "google", modelId: "gemini-2.5-pro", expected: false },
		] as const;

		for (const { provider, modelId, expected } of testCases) {
			const model = getModel(provider as any, modelId as any);
			expect(model, `model not found: ${provider}/${modelId}`).toBeDefined();
			expect(supportsXhigh(model!)).toBe(expected);
			expect(supportsXhigh(model!)).toBe(supportsXhighCompat(provider, modelId));
		}
	});

	it("uses provider-aware logic rather than hardcoded id whitelist", () => {
		// The old whitelist only checked model.id patterns.
		// thinking-compat considers the provider profile.
		// For example, a model with "gpt-5.2" in the id at a provider
		// that only supports enable_thinking should not get xhigh.
		const model = getModel("zai", "glm-4.5");
		expect(model).toBeDefined();
		// zai profile has maxLevel: high, so no xhigh even if id contained a pattern
		expect(supportsXhigh(model!)).toBe(false);
		expect(supportsXhigh(model!)).toBe(supportsXhighCompat("zai", "glm-4.5"));
	});
});
