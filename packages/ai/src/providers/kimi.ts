/**
 * Kimi Code provider - wraps OpenAI or Anthropic API based on format setting.
 *
 * Kimi offers both OpenAI-compatible and Anthropic-compatible APIs:
 * - OpenAI: https://api.kimi.com/coding/v1/chat/completions
 * - Anthropic: https://api.kimi.com/coding/v1/messages
 *
 * The Anthropic API is generally more stable and recommended.
 * Note: Kimi calculates TPM rate limits based on max_tokens, not actual output.
 *
 * Ported from oh-my-pi's dedicated kimi.ts provider.
 */

import type { Api, AssistantMessage, Context, Message, MessageSummary, Model, SimpleStreamOptions, StreamFunction, ToolCall } from "../types.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { getKimiCommonHeaders } from "../utils/oauth/index.js";
import { streamAnthropic } from "./anthropic.js";
import { streamOpenAICompletions } from "./openai-completions.js";
import { adjustMaxTokensForThinking } from "./simple-options.js";

export type KimiApiFormat = "openai" | "anthropic";

// Note: Anthropic SDK appends /v1/messages, so base URL should not include /v1
const KIMI_ANTHROPIC_BASE_URL = "https://api.kimi.com/coding";

export interface KimiOptions extends SimpleStreamOptions {
	/** API format: "openai" or "anthropic". Default: "anthropic" */
	format?: KimiApiFormat;
}

/**
 * Stream from Kimi Code, routing to either OpenAI or Anthropic API based on format.
 * Returns synchronously like other providers - async header fetching happens internally.
 */
export const streamKimi: StreamFunction<"openai-completions", KimiOptions> = (
	model: Model<"openai-completions">,
	context: Context,
	options?: KimiOptions,
): AssistantMessageEventStream => {
	const stream = new AssistantMessageEventStream();
	const format = options?.format ?? "anthropic";

	options?.providerTrace?.adapterStep({
		step: "request-format-selected",
		effectiveApi: format === "anthropic" ? "anthropic-messages" : model.api,
		effectiveProvider: model.provider,
		effectiveModelId: model.id,
		notes: [`format=${format}`],
	});

	// Async IIFE to handle header fetching and stream piping
	(async () => {
		try {
			const kimiHeaders = await getKimiCommonHeaders();
			const mergedHeaders = { ...kimiHeaders, ...options?.headers };

			if (format === "anthropic") {
				// Create a synthetic Anthropic model pointing to Kimi's endpoint
				const anthropicModel: Model<"anthropic-messages"> = {
					id: model.id,
					name: model.name,
					api: "anthropic-messages",
					provider: model.provider,
					baseUrl: KIMI_ANTHROPIC_BASE_URL,
					headers: mergedHeaders,
					contextWindow: model.contextWindow,
					maxTokens: model.maxTokens,
					reasoning: model.reasoning,
					input: model.input,
					cost: model.cost,
				};
				options?.providerTrace?.adapterStep({
					step: "synthetic-model-created",
					effectiveApi: anthropicModel.api,
					effectiveProvider: anthropicModel.provider,
					effectiveModelId: anthropicModel.id,
					notes: ["Kimi anthropic bridge model created"],
				});

				const reasoning = options?.reasoning;
				const thinkingEnabled = !!reasoning && model.reasoning;
				const adjusted = adjustMaxTokensForThinking(
					options?.maxTokens ?? Math.min(model.maxTokens, 32000),
					model.maxTokens,
					reasoning ?? "medium",
					options?.thinkingBudgets,
				);

				// Normalize message api/provider/model to match the synthetic Anthropic model.
				// Without this, transformMessages sees isSameModel=false (because stored messages
				// have api="openai-completions" but the synthetic model has api="anthropic-messages"),
				// which causes it to drop thinking blocks from tool-call assistant messages.
				// Kimi's Anthropic API then rejects the request: "reasoning_content is missing in
				// assistant tool call message at index N".
				const anthropicContext: Context = {
					...context,
					messages: context.messages.map((msg) => {
						if (msg.role === "assistant") {
							return {
								...msg,
								api: "anthropic-messages" as Api,
								provider: model.provider,
								model: model.id,
							};
						}
						return msg;
					}),
				};
				options?.providerTrace?.contextTransformed({
					stage: "provider:context-rewrite",
					before: summarizeMessages(context.messages),
					after: summarizeMessages(anthropicContext.messages),
					notes: ["Rewrote assistant api/provider/model to match synthetic anthropic model"],
				});

				const innerStream = streamAnthropic(anthropicModel, anthropicContext, {
					apiKey: options?.apiKey,
					temperature: options?.temperature,
					maxTokens: adjusted.maxTokens,
					signal: options?.signal,
					headers: mergedHeaders,
					sessionId: options?.sessionId,
					onPayload: options?.onPayload,
					thinkingEnabled,
					thinkingBudgetTokens: adjusted.thinkingBudget,
				});
				let responseRewriteLogged = false;
				for await (const event of innerStream) {
					let rewroteResponseMetadata = false;
					// Fix api/provider/model to match the original model, not the synthetic Anthropic model.
					// Without this, the assistant message gets api="anthropic-messages" but the model
					// has api="openai-completions", causing isSameModel=false in transformMessages
					// which normalizes tool call IDs and breaks Kimi's tool_use_id matching.
					if ("partial" in event && event.partial) {
						event.partial.api = model.api;
						event.partial.provider = model.provider;
						event.partial.model = model.id;
						rewroteResponseMetadata = true;
					}
					if ("message" in event && event.message) {
						event.message.api = model.api;
						event.message.provider = model.provider;
						event.message.model = model.id;
						rewroteResponseMetadata = true;
					}
					if ("error" in event && event.error) {
						event.error.api = model.api;
						event.error.provider = model.provider;
						event.error.model = model.id;
						rewroteResponseMetadata = true;
					}
					if (rewroteResponseMetadata && !responseRewriteLogged) {
						responseRewriteLogged = true;
						options?.providerTrace?.adapterStep({
							step: "response-rewritten",
							effectiveApi: model.api,
							effectiveProvider: model.provider,
							effectiveModelId: model.id,
							notes: ["Restored original api/provider/model on forwarded anthropic events"],
						});
					}
					stream.push(event);
				}
			} else {
				// OpenAI format - use original model with Kimi headers
				const innerStream = streamOpenAICompletions(model, context, {
					apiKey: options?.apiKey,
					temperature: options?.temperature,
					maxTokens: options?.maxTokens ?? model.maxTokens,
					signal: options?.signal,
					headers: mergedHeaders,
					sessionId: options?.sessionId,
					onPayload: options?.onPayload,
					reasoningEffort: options?.reasoning,
				});

				for await (const event of innerStream) {
					stream.push(event);
				}
			}
		} catch (err) {
			stream.push({
				type: "error",
				reason: "error",
				error: createErrorMessage(model, err),
			});
		}
	})();

	return stream;
};

function createErrorMessage(model: Model<Api>, err: unknown): AssistantMessage {
	return {
		role: "assistant",
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
		stopReason: "error",
		errorMessage: err instanceof Error ? err.message : String(err),
		timestamp: Date.now(),
	};
}

/**
 * Check if a model is a Kimi Code model.
 */
export function isKimiModel(model: Model<Api>): boolean {
	return model.provider === "kimi-coding";
}


function summarizeMessages(messages: Message[]): MessageSummary[] {
	return messages.map((message, index) => {
		if (message.role === "assistant") {
			const toolCalls = message.content.filter((block): block is ToolCall => block.type === "toolCall");
			return {
				index,
				role: message.role,
				api: message.api,
				provider: message.provider,
				model: message.model,
				contentKinds: message.content.map((block) => block.type),
				toolCallIds: toolCalls.map((toolCall) => toolCall.id),
			};
		}
		if (message.role === "toolResult") {
			return {
				index,
				role: message.role,
				contentKinds: message.content.map((block) => block.type),
				toolResultId: message.toolCallId,
			};
		}
		return {
			index,
			role: message.role,
			contentKinds: typeof message.content === "string" ? ["text"] : message.content.map((block) => block.type),
		};
	});
}