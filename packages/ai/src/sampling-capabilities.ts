/**
 * Sampling Capabilities Map
 *
 * Declares which sampling parameters each API type supports.
 * Used by buildBaseOptions to strip unsupported params before they reach providers.
 *
 * Adding a new provider: add an entry to API_SAMPLING_CAPABILITIES.
 * Overriding per-model: set `samplingCapabilities` on the Model definition.
 */

import type { Api } from "./types.js";

/**
 * Describes which sampling parameters a provider/model supports.
 * Undefined fields inherit from the API-level default.
 */
export interface SamplingCapabilities {
	temperature?: boolean;
	topP?: boolean;
	topK?: boolean;
	minP?: boolean;
	presencePenalty?: boolean;
	repetitionPenalty?: boolean;
}

/**
 * Per-API-type default sampling capabilities.
 *
 * Based on actual provider implementation audit:
 * - All providers support temperature (with model-specific exceptions handled via per-model override)
 * - topP: supported by most, not by google-gemini-cli
 * - topK: only anthropic-messages, google-generative-ai, google-vertex
 * - minP: not supported by any current provider
 * - presencePenalty: only OpenAI-family APIs
 * - repetitionPenalty: not supported by any current provider
 */
const API_SAMPLING_CAPABILITIES: Record<string, SamplingCapabilities> = {
	// OpenAI family
	"openai-completions": {
		temperature: true,
		topP: true,
		topK: false,
		minP: false,
		presencePenalty: true,
		repetitionPenalty: false,
	},
	"openai-responses": {
		temperature: true,
		topP: true,
		topK: false,
		minP: false,
		presencePenalty: true,
		repetitionPenalty: false,
	},
	"openai-codex-responses": {
		temperature: true,
		topP: true,
		topK: false,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	},
	"azure-openai-responses": {
		temperature: true,
		topP: true,
		topK: false,
		minP: false,
		presencePenalty: true,
		repetitionPenalty: false,
	},

	// Anthropic
	"anthropic-messages": {
		temperature: true,
		topP: true,
		topK: true,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	},

	// Google family
	"google-generative-ai": {
		temperature: true,
		topP: true,
		topK: true,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	},
	"google-vertex": {
		temperature: true,
		topP: true,
		topK: true,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	},
	"google-gemini-cli": {
		temperature: true,
		topP: false,
		topK: false,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	},

	// AWS
	"bedrock-converse-stream": {
		temperature: true,
		topP: true,
		topK: false,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	},

	// Mistral
	"mistral-conversations": {
		temperature: true,
		topP: true,
		topK: false,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	},
};

/** Sentinel value used by settings-manager for "not set" */
const NOT_SET = -1;

/**
 * Get the effective sampling capabilities for a given API type.
 * Returns a fully resolved SamplingCapabilities with all booleans set.
 */
export function getSamplingCapabilities(api: Api): Required<SamplingCapabilities> {
	const defaults: Required<SamplingCapabilities> = {
		temperature: false,
		topP: false,
		topK: false,
		minP: false,
		presencePenalty: false,
		repetitionPenalty: false,
	};

	const apiCaps = API_SAMPLING_CAPABILITIES[api];
	if (!apiCaps) return defaults;

	return {
		temperature: apiCaps.temperature ?? defaults.temperature,
		topP: apiCaps.topP ?? defaults.topP,
		topK: apiCaps.topK ?? defaults.topK,
		minP: apiCaps.minP ?? defaults.minP,
		presencePenalty: apiCaps.presencePenalty ?? defaults.presencePenalty,
		repetitionPenalty: apiCaps.repetitionPenalty ?? defaults.repetitionPenalty,
	};
}

/**
 * Resolve effective capabilities by merging API defaults with per-model overrides.
 * Model-level overrides take precedence.
 */
export function resolveSamplingCapabilities(
	api: Api,
	modelOverride?: SamplingCapabilities,
): Required<SamplingCapabilities> {
	const apiCaps = getSamplingCapabilities(api);

	if (!modelOverride) return apiCaps;

	return {
		temperature: modelOverride.temperature ?? apiCaps.temperature,
		topP: modelOverride.topP ?? apiCaps.topP,
		topK: modelOverride.topK ?? apiCaps.topK,
		minP: modelOverride.minP ?? apiCaps.minP,
		presencePenalty: modelOverride.presencePenalty ?? apiCaps.presencePenalty,
		repetitionPenalty: modelOverride.repetitionPenalty ?? apiCaps.repetitionPenalty,
	};
}

/**
 * Filter a sampling value: strip if unsupported by capabilities or if it's the sentinel -1.
 */
function filterSamplingValue(value: number | undefined, supported: boolean): number | undefined {
	if (value === undefined) return undefined;
	if (value === NOT_SET) return undefined;
	if (!supported) return undefined;
	return value;
}
