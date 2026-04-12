/**
 * Declarative Provider Registry
 *
 * Replaces register-builtins.ts (~433 lines of imperative lazy-loading boilerplate)
 * with ~50 lines of declarative provider definitions.
 *
 * Each provider is defined as:
 * - modulePath: dynamic import path
 * - exportNames: which exports to use for stream/streamSimple
 * - api: the API type this provider handles
 */

import { registerApiProvider } from "../../api-registry.js";
import type { Api, StreamOptions } from "../../types.js";
import { AssistantMessageEventStream } from "../../utils/event-stream.js";

interface ProviderRegistration {
	api: Api;
	modulePath: string;
	streamExport: string;
	simpleStreamExport: string;
	// Optional: for Node-only providers (like Bedrock)
	nodeOnly?: boolean;
}

/**
 * Registry of all built-in providers
 *
 * Adding a new provider = adding one entry to this array.
 * No more copy-pasting 40 lines of lazy-loading boilerplate.
 */
const BUILTIN_PROVIDERS: ProviderRegistration[] = [
	{
		api: "anthropic-messages",
		modulePath: "../anthropic.js",
		streamExport: "streamAnthropic",
		simpleStreamExport: "streamSimpleAnthropic",
	},
	{
		api: "openai-completions",
		modulePath: "../openai-completions.js",
		streamExport: "streamOpenAICompletions",
		simpleStreamExport: "streamSimpleOpenAICompletions",
	},
	{
		api: "mistral-conversations",
		modulePath: "../mistral.js",
		streamExport: "streamMistral",
		simpleStreamExport: "streamSimpleMistral",
	},
	{
		api: "openai-responses",
		modulePath: "../openai-responses.js",
		streamExport: "streamOpenAIResponses",
		simpleStreamExport: "streamSimpleOpenAIResponses",
	},
	{
		api: "azure-openai-responses",
		modulePath: "../azure-openai-responses.js",
		streamExport: "streamAzureOpenAIResponses",
		simpleStreamExport: "streamSimpleAzureOpenAIResponses",
	},
	{
		api: "openai-codex-responses",
		modulePath: "../openai-codex-responses.js",
		streamExport: "streamOpenAICodexResponses",
		simpleStreamExport: "streamSimpleOpenAICodexResponses",
	},
	{
		api: "google-generative-ai",
		modulePath: "../google.js",
		streamExport: "streamGoogle",
		simpleStreamExport: "streamSimpleGoogle",
	},
	{
		api: "google-gemini-cli",
		modulePath: "../google-gemini-cli.js",
		streamExport: "streamGoogleGeminiCli",
		simpleStreamExport: "streamSimpleGoogleGeminiCli",
	},
	{
		api: "google-vertex",
		modulePath: "../google-vertex.js",
		streamExport: "streamGoogleVertex",
		simpleStreamExport: "streamSimpleGoogleVertex",
	},
	{
		api: "bedrock-converse-stream",
		modulePath: "../amazon-bedrock.js",
		streamExport: "streamBedrock",
		simpleStreamExport: "streamSimpleBedrock",
		nodeOnly: true,
	},
];

// Module cache to avoid re-importing
const moduleCache = new Map<string, Record<string, unknown>>();

async function loadProviderModule(modulePath: string, nodeOnly?: boolean): Promise<Record<string, unknown>> {
	const cached = moduleCache.get(modulePath);
	if (cached) return cached;

	const importFn = nodeOnly ? (specifier: string) => import(specifier) : (specifier: string) => import(specifier);

	const module = await importFn(modulePath);
	moduleCache.set(modulePath, module as Record<string, unknown>);
	return module as Record<string, unknown>;
}

/**
 * Create a lazy-loading stream function
 */
function createLazyStream(
	registration: ProviderRegistration,
): (model: unknown, context: unknown, options?: StreamOptions) => AssistantMessageEventStream {
	const { modulePath, streamExport, nodeOnly } = registration;
	let modulePromise: Promise<Record<string, unknown>> | undefined;

	return (model, context, options) => {
		const stream = new AssistantMessageEventStream();

		// Start async loading
		modulePromise ??= loadProviderModule(modulePath, nodeOnly);

		modulePromise
			.then((mod) => {
				const streamFn = mod[streamExport] as (
					model: unknown,
					context: unknown,
					options?: StreamOptions,
				) => AssistantMessageEventStream;

				if (!streamFn) {
					throw new Error(`Export '${streamExport}' not found in ${modulePath}`);
				}

				// Delegate to actual stream function
				const innerStream = streamFn(model, context, options);

				// Forward all events from inner to outer
				(async () => {
					for await (const event of innerStream) {
						stream.push(event);
					}
					stream.end();
				})();
			})
			.catch((error) => {
				// Emit error through stream protocol
				const errorMessage = error instanceof Error ? error.message : String(error);
				stream.push({
					type: "error",
					reason: "error",
					error: {
						role: "assistant",
						content: [],
						api: registration.api,
						provider: "unknown",
						model: "unknown",
						usage: {
							input: 0,
							output: 0,
							cacheRead: 0,
							cacheWrite: 0,
							totalTokens: 0,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
						},
						stopReason: "error",
						errorMessage,
						timestamp: Date.now(),
					},
				});
				stream.end();
			});

		return stream;
	};
}

/**
 * Register all built-in providers
 *
 * Call this once at startup to register all providers declaratively.
 */
export function registerBuiltInProviders(): void {
	for (const registration of BUILTIN_PROVIDERS) {
		registerApiProvider({
			api: registration.api,
			stream: createLazyStream(registration),
			streamSimple: createLazyStream(registration),
		});
	}
}

/**
 * Get list of registered provider APIs (for debugging/introspection)
 */
export function getRegisteredProviderApis(): Api[] {
	return BUILTIN_PROVIDERS.map((p) => p.api);
}
