/**
 * OpenAI Completions Provider Definition (Proof of Concept)
 *
 * Declarative provider definition using the new ProviderDefinition interface.
 * Demonstrates how ~500 lines of imperative provider code becomes ~200 lines
 * of declarative configuration using the shared stream engine.
 */

import OpenAI from "openai";
import type { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { Api, Context, Model, OpenAICompletionsCompat, StreamOptions } from "../../types.js";
import {
	type ClientConfig,
	createStreamFunction,
	type ParsedEvent,
	type ParseState,
	type ProviderDefinition,
	type UsageInfo,
} from "../infrastructure/index.js";
import { transformMessages } from "../transform-messages.js";

// ============================================================================
// Types
// ============================================================================

export interface OpenAICompletionsOptions extends StreamOptions {
	toolChoice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
	reasoningEffort?: "minimal" | "low" | "medium" | "high" | "xhigh";
}

// ============================================================================
// Provider Definition
// ============================================================================

const openaiCompletionsDefinition: ProviderDefinition<
	OpenAI,
	OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
	ChatCompletionChunk
> = {
	api: "openai-completions",

	createClient(config: ClientConfig): OpenAI {
		return new OpenAI({
			baseURL: config.baseUrl,
			apiKey: config.apiKey,
			defaultHeaders: config.headers ?? {},
		});
	},

	transformMessages(context: Context, model: Model<Api>): ChatCompletionMessageParam[] {
		return transformMessages(context.messages, model) as unknown as ChatCompletionMessageParam[];
	},

	buildParams(
		model: Model<Api>,
		context: Context,
		options?: OpenAICompletionsOptions,
	): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
		const messages = this.transformMessages(context, model) as ChatCompletionMessageParam[];
		const compat = getCompatSettings(model);
		const maxTokensField = compat.maxTokensField ?? "max_completion_tokens";

		const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
			model: model.id,
			messages: messages || [],
			stream: true,
			stream_options: compat.supportsUsageInStreaming !== false ? { include_usage: true } : undefined,
		};

		if (options?.maxTokens) {
			if (maxTokensField === "max_completion_tokens") {
				params.max_completion_tokens = options.maxTokens;
			} else {
				params.max_tokens = options.maxTokens;
			}
		}

		if (options?.temperature !== undefined) {
			params.temperature = options.temperature;
		}

		if (compat.supportsReasoningEffort && options?.reasoningEffort) {
			applyReasoningEffort(params, options.reasoningEffort, compat);
		}

		if (context.tools?.length) {
			params.tools = context.tools.map((t) => ({
				type: "function" as const,
				function: {
					name: t.name,
					description: t.description,
					parameters: t.parameters,
				},
			}));

			if (options?.toolChoice) {
				params.tool_choice = options.toolChoice;
			}
		}

		return params;
	},

	async *executeStream(
		client: OpenAI,
		params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
		signal?: AbortSignal,
	): AsyncIterable<ChatCompletionChunk> {
		const response = await client.chat.completions.create(params, { signal });
		for await (const chunk of response) {
			if (chunk) yield chunk;
		}
	},

	parseChunk(chunk: ChatCompletionChunk, state: ParseState): ParsedEvent[] {
		const events: ParsedEvent[] = [];

		if (chunk.usage) {
			events.push({
				type: "usage",
				input: chunk.usage.prompt_tokens ?? 0,
				output: chunk.usage.completion_tokens ?? 0,
				cacheRead: (chunk.usage.prompt_tokens_details as any)?.cached_tokens ?? 0,
				cacheWrite: 0,
			});
		}

		if (chunk.id) {
			events.push({ type: "response_id", id: chunk.id });
		}

		const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : undefined;
		if (!choice) return events;

		if (choice.finish_reason) {
			events.push({ type: "finish_reason", reason: choice.finish_reason });
		}

		const delta = choice.delta;
		if (!delta) return events;

		// Text content
		if (delta.content) {
			if (state.currentBlockIndex < 0 || !isTextBlock(state)) {
				state.currentBlockIndex = state.blocks.length;
				state.blocks.push({ type: "text" });
				events.push({ type: "text_start", index: state.currentBlockIndex });
			}
			events.push({ type: "text_delta", index: state.currentBlockIndex, delta: delta.content });
		}

		// Reasoning/thinking (OpenAI-style)
		if ((delta as any).reasoning) {
			if (!state.inThinkingBlock) {
				state.currentBlockIndex = state.blocks.length;
				state.blocks.push({ type: "thinking" });
				state.inThinkingBlock = true;
				events.push({ type: "thinking_start", index: state.currentBlockIndex });
			}
			events.push({ type: "thinking_delta", index: state.currentBlockIndex, delta: (delta as any).reasoning });
		}

		// Tool calls
		if (delta.tool_calls?.length) {
			for (const tc of delta.tool_calls) {
				if (tc.id && tc.function?.name) {
					state.currentBlockIndex = state.blocks.length;
					state.blocks.push({ type: "toolCall", id: tc.id });
					events.push({
						type: "toolcall_start",
						index: state.currentBlockIndex,
						toolCall: { id: tc.id, name: tc.function.name },
					});
				}
				if (tc.function?.arguments) {
					events.push({
						type: "toolcall_delta",
						index: state.currentBlockIndex,
						delta: tc.function.arguments,
					});
				}
			}
		}

		return events;
	},

	mapStopReason(reason: string): "stop" | "length" | "toolUse" {
		switch (reason) {
			case "stop":
			case "end_turn":
				return "stop";
			case "max_tokens":
			case "length":
				return "length";
			case "tool_calls":
			case "function_call":
				return "toolUse";
			default:
				return "stop";
		}
	},

	extractUsage(chunk: ChatCompletionChunk): UsageInfo | undefined {
		if (!chunk.usage) return undefined;
		return {
			input: chunk.usage.prompt_tokens ?? 0,
			output: chunk.usage.completion_tokens ?? 0,
			cacheRead: (chunk.usage.prompt_tokens_details as any)?.cached_tokens ?? 0,
			cacheWrite: 0,
		};
	},

	extractResponseId(chunk: ChatCompletionChunk): string | undefined {
		return chunk.id;
	},
};

// ============================================================================
// Helpers
// ============================================================================

function getCompatSettings(model: Model<Api>): OpenAICompletionsCompat {
	if ((model as Model<"openai-completions">).compat) {
		return (model as Model<"openai-completions">).compat!;
	}

	const url = model.baseUrl.toLowerCase();

	const defaults: OpenAICompletionsCompat = {
		supportsStore: false,
		supportsDeveloperRole: false,
		supportsReasoningEffort: false,
		supportsUsageInStreaming: true,
		maxTokensField: "max_completion_tokens",
		thinkingFormat: "openai",
	};

	if (url.includes("openrouter")) {
		return { ...defaults, thinkingFormat: "openrouter", supportsReasoningEffort: true };
	}
	if (url.includes("z.ai")) {
		return { ...defaults, thinkingFormat: "zai" };
	}
	return defaults;
}

function applyReasoningEffort(
	params: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming,
	effort: string,
	compat: OpenAICompletionsCompat,
): void {
	// Use type assertion to add non-standard fields
	const p = params as unknown as Record<string, unknown>;
	switch (compat.thinkingFormat) {
		case "openai":
			p.reasoning_effort = effort;
			break;
		case "openrouter":
			p.reasoning = { effort };
			break;
		case "zai":
			p.enable_thinking = effort !== "minimal";
			break;
	}
}

function isTextBlock(state: ParseState): boolean {
	const block = state.blocks[state.currentBlockIndex];
	return (block as any)?.type === "text";
}

// ============================================================================
// Exports
// ============================================================================

export const streamOpenAICompletions = createStreamFunction(openaiCompletionsDefinition);
