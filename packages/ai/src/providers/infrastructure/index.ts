/**
 * Provider Infrastructure
 *
 * Shared infrastructure for declarative provider definitions.
 * Replaces imperative register-builtins.ts with declarative ProviderDefinition objects.
 */

export {
	requiresAuth,
	resolveApiKey,
	validateApiKey,
} from "./api-key-resolver.js";

export {
	clearAllClientCaches,
	clearClientCache,
	getOrCreateClient,
	getOrCreateClientSync,
} from "./client-pool.js";

export {
	type ClientConfig,
	createParseState,
	type ParsedEvent,
	type ParseState,
	type ProviderDefinition,
	type UsageInfo,
} from "./provider-definition.js";

export {
	createSimpleStreamFunction,
	createStreamFunction,
} from "./stream-engine.js";
