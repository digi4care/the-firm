import { resolveSamplingCapabilities } from "../sampling-capabilities.js";
import type { Api, Model, SimpleStreamOptions, StreamOptions, ThinkingBudgets, ThinkingLevel } from "../types.js";

/** Sentinel value from settings-manager meaning "not set" */
const NOT_SET = -1;

function filterSampling(value: number | undefined, supported: boolean): number | undefined {
	if (value === undefined || value === NOT_SET || !supported) return undefined;
	return value;
}

export function buildBaseOptions(model: Model<Api>, options?: SimpleStreamOptions, apiKey?: string): StreamOptions {
	const caps = resolveSamplingCapabilities(
		model.api,
		model.samplingCapabilities,
	);

	return {
		temperature: filterSampling(options?.temperature, caps.temperature),
		topP: filterSampling(options?.topP, caps.topP),
		topK: filterSampling(options?.topK, caps.topK),
		minP: filterSampling(options?.minP, caps.minP),
		presencePenalty: filterSampling(options?.presencePenalty, caps.presencePenalty),
		repetitionPenalty: filterSampling(options?.repetitionPenalty, caps.repetitionPenalty),
		maxTokens: options?.maxTokens || Math.min(model.maxTokens, 32000),
		signal: options?.signal,
		apiKey: apiKey || options?.apiKey,
		cacheRetention: options?.cacheRetention,
		sessionId: options?.sessionId,
		headers: options?.headers,
		onPayload: options?.onPayload,
		maxRetryDelayMs: options?.maxRetryDelayMs,
		metadata: options?.metadata,
	};
}

export function clampReasoning(effort: ThinkingLevel | undefined): Exclude<ThinkingLevel, "xhigh"> | undefined {
	return effort === "xhigh" ? "high" : effort;
}

export function adjustMaxTokensForThinking(
	baseMaxTokens: number,
	modelMaxTokens: number,
	reasoningLevel: ThinkingLevel,
	customBudgets?: ThinkingBudgets,
): { maxTokens: number; thinkingBudget: number } {
	const defaultBudgets: ThinkingBudgets = {
		minimal: 1024,
		low: 2048,
		medium: 8192,
		high: 16384,
	};
	const budgets = { ...defaultBudgets, ...customBudgets };

	const minOutputTokens = 1024;
	const level = clampReasoning(reasoningLevel)!;
	let thinkingBudget = budgets[level]!;
	const maxTokens = Math.min(baseMaxTokens + thinkingBudget, modelMaxTokens);

	if (maxTokens <= thinkingBudget) {
		thinkingBudget = Math.max(0, maxTokens - minOutputTokens);
	}

	return { maxTokens, thinkingBudget };
}
