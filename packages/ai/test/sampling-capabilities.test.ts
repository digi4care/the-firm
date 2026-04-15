import { describe, expect, it } from "vitest";
import { buildBaseOptions } from "../src/providers/simple-options.js";
import { getSamplingCapabilities, type SamplingCapabilities } from "../src/sampling-capabilities.js";
import type { Api, Model, SimpleStreamOptions } from "../src/types.js";

function makeModel<TApi extends Api>(api: TApi, overrides?: Partial<Model<TApi>>): Model<TApi> {
	return {
		id: "test-model",
		name: "Test Model",
		api,
		provider: "test-provider",
		baseUrl: "https://api.test.com",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 8192,
		...overrides,
	} as Model<TApi>;
}

// ===========================================================================
// 1. getSamplingCapabilities — per-API defaults
// ===========================================================================

describe("getSamplingCapabilities", () => {
	it("should return temperature + topP for openai-completions", () => {
		const caps = getSamplingCapabilities("openai-completions");
		expect(caps.temperature).toBe(true);
		expect(caps.topP).toBe(true);
		expect(caps.topK).toBe(false);
		expect(caps.minP).toBe(false);
		expect(caps.presencePenalty).toBe(true);
		expect(caps.repetitionPenalty).toBe(false);
	});

	it("should return temperature + topP for openai-responses", () => {
		const caps = getSamplingCapabilities("openai-responses");
		expect(caps.temperature).toBe(true);
		expect(caps.topP).toBe(true);
		expect(caps.topK).toBe(false);
		expect(caps.minP).toBe(false);
		expect(caps.presencePenalty).toBe(true);
		expect(caps.repetitionPenalty).toBe(false);
	});

	it("should return temperature + topP + topK for anthropic-messages", () => {
		const caps = getSamplingCapabilities("anthropic-messages");
		expect(caps.temperature).toBe(true);
		expect(caps.topP).toBe(true);
		expect(caps.topK).toBe(true);
		expect(caps.minP).toBe(false);
		expect(caps.presencePenalty).toBe(false);
		expect(caps.repetitionPenalty).toBe(false);
	});

	it("should return temperature + topP + topK for google-generative-ai", () => {
		const caps = getSamplingCapabilities("google-generative-ai");
		expect(caps.temperature).toBe(true);
		expect(caps.topP).toBe(true);
		expect(caps.topK).toBe(true);
		expect(caps.minP).toBe(false);
		expect(caps.presencePenalty).toBe(false);
		expect(caps.repetitionPenalty).toBe(false);
	});

	it("should return temperature + topP for bedrock-converse-stream", () => {
		const caps = getSamplingCapabilities("bedrock-converse-stream");
		expect(caps.temperature).toBe(true);
		expect(caps.topP).toBe(true);
		expect(caps.topK).toBe(false);
		expect(caps.minP).toBe(false);
		expect(caps.presencePenalty).toBe(false);
		expect(caps.repetitionPenalty).toBe(false);
	});

	it("should return temperature + topP for openai-codex-responses", () => {
		const caps = getSamplingCapabilities("openai-codex-responses");
		expect(caps.temperature).toBe(true);
		expect(caps.topP).toBe(true);
	});

	it("should return temperature + topP for mistral-conversations", () => {
		const caps = getSamplingCapabilities("mistral-conversations");
		expect(caps.temperature).toBe(true);
		expect(caps.topP).toBe(true);
	});

	it("should return empty caps for unknown API", () => {
		const caps = getSamplingCapabilities("unknown-api");
		expect(caps.temperature).toBe(false);
		expect(caps.topP).toBe(false);
		expect(caps.topK).toBe(false);
		expect(caps.minP).toBe(false);
	});
});

// ===========================================================================
// 2. buildBaseOptions filters by capability
// ===========================================================================

describe("buildBaseOptions capability filtering", () => {
	it("should strip unsupported sampling params for openai-completions", () => {
		const model = makeModel("openai-completions");
		const options: SimpleStreamOptions = {
			temperature: 0.7,
			topP: 0.9,
			topK: 50,             // NOT supported by OpenAI
			minP: 0.05,           // NOT supported
			presencePenalty: 0.6, // supported
			repetitionPenalty: 1.2, // NOT supported
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0.7);
		expect(result.topP).toBe(0.9);
		expect(result.topK).toBeUndefined();
		expect(result.minP).toBeUndefined();
		expect(result.presencePenalty).toBe(0.6);
		expect(result.repetitionPenalty).toBeUndefined();
	});

	it("should strip unsupported sampling params for anthropic-messages", () => {
		const model = makeModel("anthropic-messages");
		const options: SimpleStreamOptions = {
			temperature: 0.7,
			topP: 0.9,
			topK: 50,
			minP: 0.05,           // NOT supported
			presencePenalty: 0.6, // NOT supported
			repetitionPenalty: 1.2, // NOT supported
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0.7);
		expect(result.topP).toBe(0.9);
		expect(result.topK).toBe(50);
		expect(result.minP).toBeUndefined();
		expect(result.presencePenalty).toBeUndefined();
		expect(result.repetitionPenalty).toBeUndefined();
	});

	it("should strip all sampling params for google-gemini-cli", () => {
		const model = makeModel("google-gemini-cli");
		const options: SimpleStreamOptions = {
			temperature: 0.7,     // supported
			topP: 0.9,            // NOT supported by gemini-cli
			topK: 50,             // NOT supported
			presencePenalty: 0.6, // NOT supported
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0.7);
		expect(result.topP).toBeUndefined();
		expect(result.topK).toBeUndefined();
		expect(result.presencePenalty).toBeUndefined();
	});
});

// ===========================================================================
// 3. Sentinel value (-1) filtering
// ===========================================================================

describe("buildBaseOptions sentinel filtering", () => {
	it("should strip -1 sentinel values (not-set) from temperature", () => {
		const model = makeModel("openai-completions");
		const options: SimpleStreamOptions = {
			temperature: -1,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBeUndefined();
	});

	it("should strip -1 sentinel from all sampling params", () => {
		const model = makeModel("anthropic-messages");
		const options: SimpleStreamOptions = {
			temperature: -1,
			topP: -1,
			topK: -1,
			minP: -1,
			presencePenalty: -1,
			repetitionPenalty: -1,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBeUndefined();
		expect(result.topP).toBeUndefined();
		expect(result.topK).toBeUndefined();
		expect(result.minP).toBeUndefined();
		expect(result.presencePenalty).toBeUndefined();
		expect(result.repetitionPenalty).toBeUndefined();
	});

	it("should allow valid value 0 for temperature", () => {
		const model = makeModel("openai-completions");
		const options: SimpleStreamOptions = {
			temperature: 0,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0);
	});
});

// ===========================================================================
// 4. Per-model samplingCapabilities override
// ===========================================================================

describe("per-model samplingCapabilities override", () => {
	it("should respect model.samplingCapabilities override disabling temperature", () => {
		const model = makeModel("openai-responses", {
			samplingCapabilities: { temperature: false },
		});
		const options: SimpleStreamOptions = {
			temperature: 0.7,
			topP: 0.9,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBeUndefined();
		expect(result.topP).toBe(0.9); // still from API defaults
	});

	it("should use model.samplingCapabilities exclusively when set", () => {
		const model = makeModel("openai-completions", {
			samplingCapabilities: {
				temperature: true,
				topP: true,
				topK: true, // override: enable topK for this specific model
			},
		});
		const options: SimpleStreamOptions = {
			temperature: 0.5,
			topK: 40,
		};

		const result = buildBaseOptions(model, options);

		expect(result.temperature).toBe(0.5);
		expect(result.topK).toBe(40); // would be stripped by API default, but override allows it
	});
});
