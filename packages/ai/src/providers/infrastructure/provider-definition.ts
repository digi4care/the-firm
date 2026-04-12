/**
 * Provider Definition Infrastructure
 *
 * Declarative provider definitions using Strategy pattern.
 * Each provider implements this interface to plug into the shared stream engine.
 */

import type { Api, Context, Model, StreamOptions } from "../../types.js";

/**
 * Configuration for creating SDK clients
 */
export interface ClientConfig {
	baseUrl: string;
	apiKey: string;
	headers?: Record<string, string>;
}

/**
 * Generic provider definition interface (Strategy pattern)
 *
 * Each provider implements these functions to participate in the stream engine.
 * Type parameters allow providers to specify their specific client, params, and chunk types.
 */
export interface ProviderDefinition<TClient = unknown, TParams = unknown, TChunk = unknown> {
	/** The API type this provider handles */
	readonly api: Api;

	/** Create an SDK client instance */
	createClient(config: ClientConfig): TClient;

	/** Transform conversation context to provider-specific format */
	transformMessages(context: Context, model: Model<Api>): unknown;

	/** Build the provider-specific request parameters */
	buildParams(model: Model<Api>, context: Context, options?: StreamOptions): TParams;

	/** Execute the streaming request, returning raw chunks */
	executeStream(client: TClient, params: TParams, signal?: AbortSignal): AsyncIterable<TChunk>;

	/** Parse a single chunk into standardized events */
	parseChunk(chunk: TChunk, state: ParseState): ParsedEvent[];

	/** Map provider-specific stop reason to standardized StopReason */
	mapStopReason(reason: string): "stop" | "length" | "toolUse";

	/** Optional: Prepare simple stream options before building params */
	prepareOptions?(model: Model<Api>, options: StreamOptions): Record<string, unknown>;

	/** Optional: Extract usage information from a chunk */
	extractUsage?(chunk: TChunk): UsageInfo | undefined;

	/** Optional: Extract response ID from a chunk */
	extractResponseId?(chunk: TChunk): string | undefined;
}

/**
 * State maintained during chunk parsing
 */
export interface ParseState {
	/** Current content blocks being built */
	blocks: unknown[];
	/** Current block index */
	currentBlockIndex: number;
	/** Whether we're currently in a thinking block */
	inThinkingBlock: boolean;
	/** Accumulated partial arguments for tool calls */
	toolCallArgs: Map<string, string>;
}

/**
 * Standardized parsed event from a chunk
 */
export type ParsedEvent =
	| { type: "text_start"; index: number }
	| { type: "text_delta"; index: number; delta: string }
	| { type: "text_end"; index: number; content: string }
	| { type: "thinking_start"; index: number }
	| { type: "thinking_delta"; index: number; delta: string }
	| { type: "thinking_end"; index: number; content: string }
	| { type: "toolcall_start"; index: number; toolCall: { id: string; name: string } }
	| { type: "toolcall_delta"; index: number; delta: string }
	| { type: "toolcall_end"; index: number; toolCall: { id: string; name: string; arguments: Record<string, unknown> } }
	| { type: "usage"; input: number; output: number; cacheRead: number; cacheWrite: number }
	| { type: "response_id"; id: string }
	| { type: "finish_reason"; reason: string };

/**
 * Usage information extracted from a chunk
 */
export interface UsageInfo {
	input: number;
	output: number;
	cacheRead: number;
	cacheWrite: number;
}

/**
 * Create initial parse state
 */
export function createParseState(): ParseState {
	return {
		blocks: [],
		currentBlockIndex: -1,
		inThinkingBlock: false,
		toolCallArgs: new Map(),
	};
}
