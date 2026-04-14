/**
 * Thinking Compatibility — data-driven thinking level support per provider/model.
 *
 * Replaces hardcoded `supportsXhigh()` with configurable profiles that map
 * what each provider's API actually supports.
 *
 * Three API formats exist:
 * 1. reasoning_effort: OpenAI-style (minimal/low/medium/high/xhigh string)
 * 2. thinking_level: Google-style (minimal/low/medium/high thinking levels)
 * 3. enable_thinking: Binary boolean (Z.AI, Qwen, etc.)
 * 4. anthropic: Token-budget based with extended thinking toggle
 */

import type { ThinkingLevel } from "./types.js";

// ─── Types ─────────────────────────────────────────────────────────────

export type ThinkingApiFormat = "reasoning_effort" | "thinking_level" | "enable_thinking" | "anthropic";

export interface ThinkingCompatProfile {
	/** Provider ID this profile applies to */
	readonly provider: string;
	/** API parameter format used by this provider */
	readonly format: ThinkingApiFormat;
	/** Maximum thinking level supported (default: "high") */
	readonly maxLevel: ThinkingLevel;
	/** Optional model-specific overrides (model ID substring → max level) */
	readonly modelOverrides?: ReadonlyArray<{
		readonly pattern: string;
		readonly maxLevel: ThinkingLevel;
	}>;
	/** How unsupported values are handled by the API */
	readonly unsupportedBehavior: "clamp" | "error" | "ignore";
	/** Optional mapping from internal levels to API-specific values */
	readonly effortMap?: Readonly<Partial<Record<ThinkingLevel, string>>>;
}

export interface ResolvedThinkingLevel {
	/** The original level requested */
	readonly original: ThinkingLevel;
	/** The level after clamping/validation */
	readonly resolved: ThinkingLevel;
	/** Whether the level was clamped */
	readonly clamped: boolean;
	/** For enable_thinking providers: the boolean API value */
	apiValue?: boolean;
}

// ─── Provider Profiles ─────────────────────────────────────────────────
// Based on actual API documentation and behavior analysis.

const PROFILES: ReadonlyArray<ThinkingCompatProfile> = [
	// OpenAI family — reasoning_effort parameter
	{
		provider: "openai",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
		modelOverrides: [
			{ pattern: "gpt-5.2", maxLevel: "xhigh" },
			{ pattern: "gpt-5.3", maxLevel: "xhigh" },
			{ pattern: "gpt-5.4", maxLevel: "xhigh" },
		],
	},
	{
		provider: "azure-openai-responses",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
		modelOverrides: [
			{ pattern: "gpt-5.2", maxLevel: "xhigh" },
			{ pattern: "gpt-5.3", maxLevel: "xhigh" },
			{ pattern: "gpt-5.4", maxLevel: "xhigh" },
		],
	},
	{
		provider: "openai-codex",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
		modelOverrides: [
			{ pattern: "gpt-5.2", maxLevel: "xhigh" },
			{ pattern: "gpt-5.3", maxLevel: "xhigh" },
			{ pattern: "gpt-5.4", maxLevel: "xhigh" },
		],
	},
	{
		provider: "github-copilot",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},

	// OpenRouter — passes through to underlying provider
	{
		provider: "openrouter",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
		modelOverrides: [
			{ pattern: "gpt-5.2", maxLevel: "xhigh" },
			{ pattern: "gpt-5.3", maxLevel: "xhigh" },
			{ pattern: "gpt-5.4", maxLevel: "xhigh" },
			{ pattern: "opus-4-6", maxLevel: "xhigh" },
			{ pattern: "opus-4.6", maxLevel: "xhigh" },
		],
	},

	// Vercel AI Gateway — passes through to underlying provider
	{
		provider: "vercel-ai-gateway",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
		modelOverrides: [
			{ pattern: "gpt-5.2", maxLevel: "xhigh" },
			{ pattern: "gpt-5.3", maxLevel: "xhigh" },
			{ pattern: "gpt-5.4", maxLevel: "xhigh" },
		],
	},

	// Anthropic — token-budget based extended thinking
	{
		provider: "anthropic",
		format: "anthropic",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
		modelOverrides: [
			{ pattern: "opus-4-6", maxLevel: "xhigh" },
			{ pattern: "opus-4.6", maxLevel: "xhigh" },
		],
	},

	// Amazon Bedrock — wraps Anthropic/other providers
	{
		provider: "amazon-bedrock",
		format: "anthropic",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
		modelOverrides: [
			{ pattern: "opus-4-6", maxLevel: "xhigh" },
			{ pattern: "opus-4.6", maxLevel: "xhigh" },
		],
	},

	// Google — thinking_level parameter
	{
		provider: "google",
		format: "thinking_level",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},
	{
		provider: "google-vertex",
		format: "thinking_level",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},
	{
		provider: "google-antigravity",
		format: "thinking_level",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},
	{
		provider: "google-gemini-cli",
		format: "thinking_level",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},

	// Z.AI — enable_thinking boolean
	{
		provider: "zai",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},

	// Groq — enable_thinking boolean
	{
		provider: "groq",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},

	// xAI — enable_thinking boolean (Grok)
	{
		provider: "xai",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},

	// Mistral — reasoning_effort
	{
		provider: "mistral",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},

	// HuggingFace — passes through
	{
		provider: "huggingface",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},

	// OpenCode variants
	{
		provider: "opencode",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},
	{
		provider: "opencode-go",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},
	{
		provider: "opencode-zen",
		format: "reasoning_effort",
		maxLevel: "high",
		unsupportedBehavior: "clamp",
	},

	// Kimi — enable_thinking boolean
	{
		provider: "kimi-coding",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},

	// Cerebras — enable_thinking boolean
	{
		provider: "cerebras",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},

	// MiniMax — enable_thinking boolean
	{
		provider: "minimax",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},
	{
		provider: "minimax-cn",
		format: "enable_thinking",
		maxLevel: "high",
		unsupportedBehavior: "ignore",
	},
];

// Index for O(1) lookup
const PROFILE_INDEX = new Map<string, ThinkingCompatProfile>(PROFILES.map((p) => [p.provider, p]));

// ─── Level ordering ────────────────────────────────────────────────────

const LEVEL_ORDER: ReadonlyArray<ThinkingLevel> = ["minimal", "low", "medium", "high", "xhigh"];

function levelIndex(level: ThinkingLevel): number {
	return LEVEL_ORDER.indexOf(level);
}

function maxSupportedLevel(profile: ThinkingCompatProfile, modelId: string): ThinkingLevel {
	if (profile.modelOverrides) {
		for (const override of profile.modelOverrides) {
			if (modelId.includes(override.pattern)) {
				return override.maxLevel;
			}
		}
	}
	return profile.maxLevel;
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Get the thinking compatibility profile for a provider.
 * Returns null for unknown providers.
 */
export function getThinkingCompat(provider: string): ThinkingCompatProfile | null {
	return PROFILE_INDEX.get(provider) ?? null;
}

/**
 * Get the list of thinking levels actually supported by a provider/model combo.
 */
export function getSupportedThinkingLevels(provider: string, modelId: string): ThinkingLevel[] {
	const profile = PROFILE_INDEX.get(provider);
	if (!profile) {
		// Safe default: support through high only
		return ["minimal", "low", "medium", "high"];
	}

	const max = maxSupportedLevel(profile, modelId);
	const maxIdx = levelIndex(max);
	return LEVEL_ORDER.slice(0, maxIdx + 1) as ThinkingLevel[];
}

/**
 * Resolve a requested thinking level against what the provider/model supports.
 * Clamps if needed and returns metadata about the resolution.
 */
export function resolveThinkingLevel(
	provider: string,
	modelId: string,
	requested: ThinkingLevel,
): ResolvedThinkingLevel {
	const profile = PROFILE_INDEX.get(provider);

	if (!profile) {
		// Unknown provider: clamp xhigh as safe default
		const resolved: ThinkingLevel = requested === "xhigh" ? "high" : requested;
		return {
			original: requested,
			resolved,
			clamped: requested !== resolved,
		};
	}

	const max = maxSupportedLevel(profile, modelId);
	const maxIdx = levelIndex(max);
	const reqIdx = levelIndex(requested);

	const clamped = reqIdx > maxIdx;
	const resolved: ThinkingLevel = clamped ? max : requested;

	const result: ResolvedThinkingLevel = {
		original: requested,
		resolved,
		clamped,
	};

	// For enable_thinking format, provide the boolean API value
	if (profile.format === "enable_thinking") {
		// minimal = thinking off, low+ = thinking on
		(result as { apiValue?: boolean }).apiValue = levelIndex(resolved) >= levelIndex("low");
	}

	return result;
}

/**
 * Check if a provider/model supports xhigh thinking level.
 * Drop-in replacement for the old supportsXhigh() function.
 */
export function supportsXhigh(provider: string, modelId: string): boolean {
	const levels = getSupportedThinkingLevels(provider, modelId);
	return levels.includes("xhigh");
}
