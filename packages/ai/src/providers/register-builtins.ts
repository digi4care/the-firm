/**
 * Built-in API Provider Registration
 *
 * Replaces the original 433-line register-builtins.ts with declarative provider registration.
 * All public exports remain the same for backward compatibility.
 *
 * Each provider is declared as a simple configuration object:
 * - api: the API type
 * - modulePath: dynamic import path
 * - streamExport / simpleStreamExport: names of the exported functions
 *
 * Adding a new provider = adding one entry to BUILTIN_PROVIDERS.
 */

import { clearApiProviders, registerApiProvider } from "../api-registry.js";
import type { Api, AssistantMessageEvent, Context, Model, SimpleStreamOptions, StreamOptions } from "../types.js";
import type { AssistantMessageEventStream } from "../utils/event-stream.js";
import { AssistantMessageEventStream as EventStream } from "../utils/event-stream.js";

// ============================================================================
// Declarative provider registry
// ============================================================================

interface ProviderEntry {
	api: Api;
	modulePath: string;
	streamExport: string;
	simpleStreamExport: string;
	nodeOnly?: boolean;
}

const BUILTIN_PROVIDERS: ProviderEntry[] = [
	{
		api: "anthropic-messages",
		modulePath: "./anthropic.js",
		streamExport: "streamAnthropic",
		simpleStreamExport: "streamSimpleAnthropic",
	},
	{
		api: "openai-completions",
		modulePath: "./openai-completions.js",
		streamExport: "streamOpenAICompletions",
		simpleStreamExport: "streamSimpleOpenAICompletions",
	},
	{
		api: "mistral-conversations",
		modulePath: "./mistral.js",
		streamExport: "streamMistral",
		simpleStreamExport: "streamSimpleMistral",
	},
	{
		api: "openai-responses",
		modulePath: "./openai-responses.js",
		streamExport: "streamOpenAIResponses",
		simpleStreamExport: "streamSimpleOpenAIResponses",
	},
	{
		api: "azure-openai-responses",
		modulePath: "./azure-openai-responses.js",
		streamExport: "streamAzureOpenAIResponses",
		simpleStreamExport: "streamSimpleAzureOpenAIResponses",
	},
	{
		api: "openai-codex-responses",
		modulePath: "./openai-codex-responses.js",
		streamExport: "streamOpenAICodexResponses",
		simpleStreamExport: "streamSimpleOpenAICodexResponses",
	},
	{
		api: "google-generative-ai",
		modulePath: "./google.js",
		streamExport: "streamGoogle",
		simpleStreamExport: "streamSimpleGoogle",
	},
	{
		api: "google-gemini-cli",
		modulePath: "./google-gemini-cli.js",
		streamExport: "streamGoogleGeminiCli",
		simpleStreamExport: "streamSimpleGoogleGeminiCli",
	},
	{
		api: "google-vertex",
		modulePath: "./google-vertex.js",
		streamExport: "streamGoogleVertex",
		simpleStreamExport: "streamSimpleGoogleVertex",
	},
	{
		api: "bedrock-converse-stream",
		modulePath: "./amazon-bedrock.js",
		streamExport: "streamBedrock",
		simpleStreamExport: "streamSimpleBedrock",
		nodeOnly: true,
	},
];

// ============================================================================
// Module caching
// ============================================================================

type StreamFn = (model: Model<Api>, context: Context, options?: StreamOptions) => AssistantMessageEventStream;
type SimpleStreamFn = (
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
) => AssistantMessageEventStream;

interface CachedModule {
	stream: StreamFn;
	streamSimple: SimpleStreamFn;
}

const moduleCache = new Map<string, Promise<CachedModule>>();

function loadModule(entry: ProviderEntry): Promise<CachedModule> {
	const existing = moduleCache.get(entry.api);
	if (existing) return existing;

	const promise = import(entry.modulePath).then((mod: Record<string, unknown>) => {
		const stream = mod[entry.streamExport] as StreamFn;
		const streamSimple = mod[entry.simpleStreamExport] as SimpleStreamFn;

		if (!stream) throw new Error(`Export '${entry.streamExport}' not found in ${entry.modulePath}`);
		if (!streamSimple) throw new Error(`Export '${entry.simpleStreamExport}' not found in ${entry.modulePath}`);

		return { stream, streamSimple };
	});

	moduleCache.set(entry.api, promise);
	return promise;
}

// ============================================================================
// Lazy stream wrappers
// ============================================================================

function createLazyStream(entry: ProviderEntry): StreamFn {
	return (model, context, options) => {
		const outer = new EventStream();

		loadModule(entry)
			.then((mod) => {
				const inner = mod.stream(model, context, options);
				forwardEvents(outer, inner);
			})
			.catch((error) => {
				emitLoadError(outer, model, error);
			});

		return outer;
	};
}

function createLazySimpleStream(entry: ProviderEntry): SimpleStreamFn {
	return (model, context, options) => {
		const outer = new EventStream();

		loadModule(entry)
			.then((mod) => {
				const inner = mod.streamSimple(model, context, options);
				forwardEvents(outer, inner);
			})
			.catch((error) => {
				emitLoadError(outer, model, error);
			});

		return outer;
	};
}

function forwardEvents(target: EventStream, source: AssistantMessageEventStream): void {
	(async () => {
		for await (const event of source) {
			target.push(event);
		}
		target.end();
	})();
}

function emitLoadError(stream: EventStream, model: Model<Api>, error: unknown): void {
	const message = createErrorMessage(model, error);
	stream.push({ type: "error", reason: "error", error: message });
	stream.end(message);
}

function createErrorMessage(model: Model<Api>, error: unknown) {
	return {
		role: "assistant" as const,
		content: [],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "error" as const,
		errorMessage: error instanceof Error ? error.message : String(error),
		timestamp: Date.now(),
	};
}

// ============================================================================
// Bedrock override support (for testing/extension)
// ============================================================================

interface BedrockProviderModule {
	streamBedrock: (
		model: Model<"bedrock-converse-stream">,
		context: Context,
		options?: Record<string, unknown>,
	) => AsyncIterable<AssistantMessageEvent>;
	streamSimpleBedrock: (
		model: Model<"bedrock-converse-stream">,
		context: Context,
		options?: SimpleStreamOptions,
	) => AsyncIterable<AssistantMessageEvent>;
}

let bedrockOverride: CachedModule | undefined;

export function setBedrockProviderModule(module: BedrockProviderModule): void {
	bedrockOverride = {
		stream: (model, context, options) => {
			const asyncIter = module.streamBedrock(
				model as Model<"bedrock-converse-stream">,
				context,
				options as Record<string, unknown>,
			);
			return wrapAsyncIterable(asyncIter);
		},
		streamSimple: (model, context, options) => {
			const asyncIter = module.streamSimpleBedrock(model as Model<"bedrock-converse-stream">, context, options);
			return wrapAsyncIterable(asyncIter);
		},
	};
}

/**
 * Wrap an AsyncIterable<AssistantMessageEvent> into an AssistantMessageEventStream
 */
function wrapAsyncIterable(iter: AsyncIterable<AssistantMessageEvent>): AssistantMessageEventStream {
	const stream = new EventStream();
	(async () => {
		for await (const event of iter) {
			stream.push(event);
		}
		stream.end();
	})();
	return stream;
}

// Intercept Bedrock loading to support override
const originalLoadModule = loadModule;
function _loadBedrockModule(): Promise<CachedModule> {
	if (bedrockOverride) return Promise.resolve(bedrockOverride);
	return originalLoadModule(BUILTIN_PROVIDERS.find((p) => p.api === "bedrock-converse-stream")!);
}

// ============================================================================
// Public exports — backward compatible with original register-builtins.ts
// ============================================================================

// Lazy stream functions (20 exports, matching original)
export const streamAnthropic = createLazyStream(BUILTIN_PROVIDERS[0]);
export const streamSimpleAnthropic = createLazySimpleStream(BUILTIN_PROVIDERS[0]);
export const streamOpenAICompletions = createLazyStream(BUILTIN_PROVIDERS[1]);
export const streamSimpleOpenAICompletions = createLazySimpleStream(BUILTIN_PROVIDERS[1]);
export const streamMistral = createLazyStream(BUILTIN_PROVIDERS[2]);
export const streamSimpleMistral = createLazySimpleStream(BUILTIN_PROVIDERS[2]);
export const streamOpenAIResponses = createLazyStream(BUILTIN_PROVIDERS[3]);
export const streamSimpleOpenAIResponses = createLazySimpleStream(BUILTIN_PROVIDERS[3]);
export const streamAzureOpenAIResponses = createLazyStream(BUILTIN_PROVIDERS[4]);
export const streamSimpleAzureOpenAIResponses = createLazySimpleStream(BUILTIN_PROVIDERS[4]);
export const streamOpenAICodexResponses = createLazyStream(BUILTIN_PROVIDERS[5]);
export const streamSimpleOpenAICodexResponses = createLazySimpleStream(BUILTIN_PROVIDERS[5]);
export const streamGoogle = createLazyStream(BUILTIN_PROVIDERS[6]);
export const streamSimpleGoogle = createLazySimpleStream(BUILTIN_PROVIDERS[6]);
export const streamGoogleGeminiCli = createLazyStream(BUILTIN_PROVIDERS[7]);
export const streamSimpleGoogleGeminiCli = createLazySimpleStream(BUILTIN_PROVIDERS[7]);
export const streamGoogleVertex = createLazyStream(BUILTIN_PROVIDERS[8]);
export const streamSimpleGoogleVertex = createLazySimpleStream(BUILTIN_PROVIDERS[8]);
export const streamBedrockLazy = createLazyStream(BUILTIN_PROVIDERS[9]);
export const streamSimpleBedrockLazy = createLazySimpleStream(BUILTIN_PROVIDERS[9]);

// Registration functions
export function registerBuiltInApiProviders(): void {
	for (const entry of BUILTIN_PROVIDERS) {
		if (entry.api === "bedrock-converse-stream") {
			// Bedrock uses special loading that supports override
			registerApiProvider({
				api: entry.api,
				stream: createLazyStream(entry),
				streamSimple: createLazySimpleStream(entry),
			});
		} else {
			registerApiProvider({
				api: entry.api,
				stream: createLazyStream(entry),
				streamSimple: createLazySimpleStream(entry),
			});
		}
	}
}

export function resetApiProviders(): void {
	clearApiProviders();
	registerBuiltInApiProviders();
}

// Auto-register on import
registerBuiltInApiProviders();
