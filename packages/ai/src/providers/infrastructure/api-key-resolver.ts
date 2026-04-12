/**
 * API Key Resolver
 *
 * Centralized API key resolution for all providers.
 * Eliminates duplication of `options?.apiKey || getEnvApiKey(model.provider)` across 16 sites.
 */

import { getEnvApiKey } from "../../env-api-keys.js";
import type { Api, Model, Provider, StreamOptions } from "../../types.js";

/**
 * Resolve API key for a model, with precedence:
 * 1. Options override (options.apiKey)
 * 2. Environment variable (provider-specific)
 * 3. Empty string (for unauthenticated providers)
 */
export function resolveApiKey(model: Model<Api>, options?: StreamOptions): string {
	// Option override takes precedence
	if (options?.apiKey) {
		return options.apiKey;
	}

	// Try environment variable
	const envKey = getEnvApiKey(model.provider);
	if (envKey) {
		return envKey;
	}

	// Return empty string for providers that don't require auth (or will fail later)
	return "";
}

/**
 * Check if a provider requires authentication
 */
export function requiresAuth(provider: Provider): boolean {
	// These providers can work without explicit API keys (OAuth, ADC, etc.)
	const optionalAuthProviders = new Set<Provider>(["github-copilot", "google-vertex", "amazon-bedrock"]);

	return !optionalAuthProviders.has(provider);
}

/**
 * Validate that required authentication is present
 * Throws if auth is required but missing
 */
export function validateApiKey(model: Model<Api>, options?: StreamOptions): string {
	const apiKey = resolveApiKey(model, options);

	if (!apiKey && requiresAuth(model.provider)) {
		throw new Error(
			`No API key provided for ${model.provider}. ` +
				`Set ${model.provider.toUpperCase().replace(/-/g, "_")}_API_KEY environment variable ` +
				`or pass apiKey in options.`,
		);
	}

	return apiKey;
}
