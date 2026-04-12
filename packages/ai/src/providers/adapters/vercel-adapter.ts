/**
 * Vercel AI SDK Adapter — wraps any @ai-sdk/* provider into our ProviderDefinition
 *
 * This demonstrates how to use Vercel's providers through our declarative architecture.
 * It works because Vercel's doStream() returns a standardized stream of events
 * (text-delta, tool-call, reasoning-delta, finish, etc.) that we can map to our
 * ParsedEvent format.
 *
 * Usage:
 *   npm install @ai-sdk/openai
 *
 *   import { createOpenAI } from '@ai-sdk/openai';
 *   import { createVercelAdapter } from './vercel-adapter';
 *   import { createStreamFunction } from '../infrastructure';
 *
 *   const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *   const definition = createVercelAdapter({
 *     api: 'openai-completions',
 *     model: openai('gpt-4o'),
 *   });
 *   const stream = createStreamFunction(definition);
 *
 * NOTE: This is a foundation/proof-of-concept. The actual Kimi, Google Gemini CLI,
 * GitHub Copilot, and Amazon Bedrock providers CANNOT use Vercel's SDK because they
 * have Firm-specific auth (OAuth, subprocess, AWS SDK). But for standard OpenAI/
 * Anthropic/Mistral endpoints, this adapter works.
 */

import type { Api, Context, Model, StreamOptions } from "../../types.js";
import type { ClientConfig, ParsedEvent, ParseState, ProviderDefinition, UsageInfo } from "../infrastructure/index.js";

// Vercel AI SDK types (from @ai-sdk/provider)
interface VercelLanguageModel {
	readonly provider: string;
	readonly modelId: string;
	doStream(options: VercelCallOptions): PromiseLike<VercelStreamResult>;
}

interface VercelCallOptions {
	prompt: VercelPrompt;
	abortSignal?: AbortSignal;
	headers?: Record<string, string>;
}

type VercelPrompt = Array<VercelMessage>;

interface VercelMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: unknown;
}

interface VercelStreamResult {
	stream: ReadableStream<VercelStreamPart>;
}

type VercelStreamPart =
	| { type: "text-delta"; id: string; delta: string }
	| { type: "tool-call"; toolCallId: string; toolName: string; input: string }
	| { type: "tool-input-start"; id: string; toolName: string }
	| { type: "tool-input-delta"; id: string; delta: string }
	| { type: "tool-input-end"; id: string }
	| { type: "reasoning-delta"; id: string; delta: string }
	| { type: "finish"; usage: { promptTokens: number; completionTokens: number }; finishReason: string }
	| { type: "response-metadata"; id?: string }
	| { type: "error"; error: unknown };

// ============================================================================
// Adapter Configuration
// ============================================================================

interface VercelAdapterConfig {
	/** Our API type string */
	api: Api;
	/** The Vercel LanguageModelV4 instance (e.g., openai('gpt-4o')) */
	model: VercelLanguageModel;
	/** Convert our Context to Vercel's prompt format */
	convertPrompt: (context: Context) => VercelPrompt;
}

// ============================================================================
// Adapter Factory
// ============================================================================

/**
 * Create a ProviderDefinition that wraps a Vercel AI SDK model.
 *
 * This adapter bridges Vercel's doStream() output to our ParsedEvent format,
 * which then feeds into our shared streamEngine().
 */
export function createVercelAdapter(
	config: VercelAdapterConfig,
): ProviderDefinition<VercelLanguageModel, VercelCallOptions, VercelStreamPart> {
	return {
		api: config.api,

		createClient(_config: ClientConfig): VercelLanguageModel {
			// The Vercel model IS the client — it already has apiKey/baseURL baked in
			return config.model;
		},

		transformMessages(context: Context, _model: Model<Api>): unknown {
			// Defer to the convertPrompt function — Vercel handles its own format
			return config.convertPrompt(context);
		},

		buildParams(_model: Model<Api>, context: Context, options?: StreamOptions): VercelCallOptions {
			const prompt = config.convertPrompt(context);
			return {
				prompt,
				abortSignal: options?.signal,
				headers: options?.headers,
			};
		},

		async *executeStream(
			client: VercelLanguageModel,
			params: VercelCallOptions,
			_signal?: AbortSignal,
		): AsyncIterable<VercelStreamPart> {
			const result = await client.doStream(params);
			const reader = result.stream.getReader();

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					yield value;
				}
			} finally {
				reader.releaseLock();
			}
		},

		parseChunk(chunk: VercelStreamPart, state: ParseState): ParsedEvent[] {
			const events: ParsedEvent[] = [];

			switch (chunk.type) {
				case "text-delta":
					if (state.currentBlockIndex < 0 || (state.blocks[state.currentBlockIndex] as any)?.type !== "text") {
						state.currentBlockIndex = state.blocks.length;
						state.blocks.push({ type: "text" });
						events.push({ type: "text_start", index: state.currentBlockIndex });
					}
					events.push({ type: "text_delta", index: state.currentBlockIndex, delta: chunk.delta });
					break;

				case "tool-input-start":
					state.currentBlockIndex = state.blocks.length;
					state.blocks.push({ type: "toolCall" });
					events.push({
						type: "toolcall_start",
						index: state.currentBlockIndex,
						toolCall: { id: chunk.id, name: chunk.toolName },
					});
					break;

				case "tool-input-delta":
					events.push({
						type: "toolcall_delta",
						index: state.currentBlockIndex,
						delta: chunk.delta,
					});
					break;

				case "tool-input-end":
					// Tool input complete — arguments will be parsed from accumulated deltas
					break;

				case "tool-call": {
					// Full tool call (non-streaming provider or complete call)
					state.currentBlockIndex = state.blocks.length;
					state.blocks.push({ type: "toolCall" });
					events.push({
						type: "toolcall_start",
						index: state.currentBlockIndex,
						toolCall: { id: chunk.toolCallId, name: chunk.toolName },
					});
					// Parse the input as accumulated arguments
					try {
						const args = JSON.parse(chunk.input);
						events.push({
							type: "toolcall_end",
							index: state.currentBlockIndex,
							toolCall: { id: chunk.toolCallId, name: chunk.toolName, arguments: args },
						});
					} catch {
						events.push({
							type: "toolcall_delta",
							index: state.currentBlockIndex,
							delta: chunk.input,
						});
					}
					break;
				}

				case "reasoning-delta":
					if (!state.inThinkingBlock) {
						state.currentBlockIndex = state.blocks.length;
						state.blocks.push({ type: "thinking" });
						state.inThinkingBlock = true;
						events.push({ type: "thinking_start", index: state.currentBlockIndex });
					}
					events.push({ type: "thinking_delta", index: state.currentBlockIndex, delta: chunk.delta });
					break;

				case "finish":
					events.push({
						type: "usage",
						input: (chunk.usage as any)?.promptTokens ?? 0,
						output: (chunk.usage as any)?.completionTokens ?? 0,
						cacheRead: 0,
						cacheWrite: 0,
					});
					events.push({ type: "finish_reason", reason: chunk.finishReason });
					break;

				case "response-metadata":
					if (chunk.id) {
						events.push({ type: "response_id", id: chunk.id });
					}
					break;

				case "error":
					// Error handling is done by the stream engine
					break;
			}

			return events;
		},

		mapStopReason(reason: string): "stop" | "length" | "toolUse" {
			switch (reason) {
				case "stop":
				case "end-turn":
					return "stop";
				case "length":
				case "max-tokens":
					return "length";
				case "tool-calls":
					return "toolUse";
				default:
					return "stop";
			}
		},

		extractUsage(chunk: VercelStreamPart): UsageInfo | undefined {
			if (chunk.type !== "finish") return undefined;
			return {
				input: (chunk.usage as any)?.promptTokens ?? 0,
				output: (chunk.usage as any)?.completionTokens ?? 0,
				cacheRead: 0,
				cacheWrite: 0,
			};
		},

		extractResponseId(chunk: VercelStreamPart): string | undefined {
			if (chunk.type === "response-metadata") return (chunk as any).id;
			return undefined;
		},
	};
}
