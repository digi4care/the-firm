import { describe, expect, it } from "vitest";
import { buildBaseOptions } from "../src/providers/simple-options.js";
import type { Api, Model, SimpleStreamOptions } from "../src/types.js";

function makeModel(maxTokens = 128000): Model<Api> {
	return {
		id: "test-model",
		name: "Test Model",
		api: "openai-completions",
		provider: "test-provider",
		baseUrl: "https://api.test.com",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens,
	} as Model<Api>;
}

describe("buildBaseOptions sampling forwarding", () => {
	it("should forward supported sampling params through buildBaseOptions", () => {
		const model = makeModel();
		const options: SimpleStreamOptions = {
			temperature: 0.7,
			topP: 0.9,
			topK: 50,
			minP: 0.05,
			presencePenalty: 0.6,
			repetitionPenalty: 1.2,
		};

		const result = buildBaseOptions(model, options);

		// openai-completions supports: temperature, topP, presencePenalty
		expect(result.temperature).toBe(0.7);
		expect(result.topP).toBe(0.9);
		expect(result.topK).toBeUndefined(); // not supported by openai-completions
		expect(result.minP).toBeUndefined(); // not supported
		expect(result.presencePenalty).toBe(0.6);
		expect(result.repetitionPenalty).toBeUndefined(); // not supported
	});

	it("should omit undefined sampling params", () => {
		const model = makeModel();
		const options: SimpleStreamOptions = {
			temperature: 0.5,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0.5);
		expect(result.topP).toBeUndefined();
		expect(result.topK).toBeUndefined();
		expect(result.minP).toBeUndefined();
		expect(result.presencePenalty).toBeUndefined();
		expect(result.repetitionPenalty).toBeUndefined();
	});

	it("should forward temperature: undefined as undefined", () => {
		const model = makeModel();
		const result = buildBaseOptions(model, {});

		expect(result.temperature).toBeUndefined();
		expect(result.topP).toBeUndefined();
	});
});
