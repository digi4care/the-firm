import "./providers/register-builtins.js";

import { getApiProvider } from "./api-registry.js";
import { getEnvApiKey } from "./env-api-keys.js";
import { isKimiModel, streamKimi } from "./providers/kimi.js";
import type {
	Api,
	AssistantMessage,
	AssistantMessageEvent,
	AssistantMessageEventStream,
	CompletionSnapshot,
	Context,
	ContextSnapshot,
	Message,
	MessageSummary,
	Model,
	ProviderErrorSnapshot,
	ProviderStreamOptions,
	ProviderTraceScope,
	ResponseEventSnapshot,
	SimpleStreamOptions,
	StreamOptions,
	ToolCall,
} from "./types.js";
import { AssistantMessageEventStream as EventStream } from "./utils/event-stream.js";

export { getEnvApiKey } from "./env-api-keys.js";

function resolveApiProvider(api: Api) {
	const provider = getApiProvider(api);
	if (!provider) {
		throw new Error(`No API provider registered for api: ${api}`);
	}
	return provider;
}

function createProviderTrace<TApi extends Api>(
	callKind: "stream" | "streamSimple",
	model: Model<TApi>,
	context: Context,
	options?: StreamOptions,
): { trace?: ProviderTraceScope; ownsTrace: boolean } {
	if (options?.providerTrace) {
		return { trace: options.providerTrace, ownsTrace: false };
	}
	const runtime = options?.providerLogging;
	if (!runtime?.enabled || runtime.level === "off") {
		return { trace: undefined, ownsTrace: false };
	}
	const trace = runtime.startProviderCall({
		provider: model.provider,
		api: model.api,
		modelId: model.id,
		modelName: model.name,
		baseUrl: model.baseUrl,
		transport: options?.transport,
		callKind,
	});
	trace.contextReceived(summarizeContext(context));
	return { trace, ownsTrace: true };
}

function withTraceOptions<TOptions extends StreamOptions>(options: TOptions | undefined, trace?: ProviderTraceScope): TOptions | undefined {
	if (!trace || options?.providerTrace === trace) {
		return options;
	}
	return {
		...(options ?? ({} as TOptions)),
		providerTrace: trace,
	} as TOptions;
}

function wrapStreamWithTrace<TApi extends Api>(
	inner: AssistantMessageEventStream,
	trace: ProviderTraceScope | undefined,
	ownsTrace: boolean,
	model: Model<TApi>,
): AssistantMessageEventStream {
	if (!trace || !ownsTrace) {
		return inner;
	}

	const outer = new EventStream();
	let started = false;
	let terminal = false;

	(async () => {
		try {
			for await (const event of inner) {
				if (!started) {
					started = true;
					trace.responseStarted({
						responseId: "partial" in event ? event.partial.responseId : undefined,
						transport: undefined,
					});
				}

				trace.responseEvent(summarizeResponseEvent(event));

				if (event.type === "done") {
					terminal = true;
					trace.completed(summarizeCompletion(event.message));
				} else if (event.type === "error") {
					terminal = true;
					trace.error(summarizeProviderError(event.error));
				}

				outer.push(event);
			}

			if (!terminal) {
				const message = "Provider stream ended without terminal event";
				trace.error({
					message,
					phase: "response-parse",
				});
				outer.push({
					type: "error",
					reason: "error",
					error: createOuterTraceErrorMessage(model, message),
				});
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			trace.error({
				name: error instanceof Error ? error.name : undefined,
				message,
				phase: "unknown",
			});
			outer.push({
				type: "error",
				reason: "error",
				error: createOuterTraceErrorMessage(model, message),
			});
		} finally {
			outer.end();
		}
	})();

	return outer;
}

function summarizeContext(context: Context): ContextSnapshot {
	const summary = summarizeMessages(context.messages);
	return {
		messageCount: context.messages.length,
		systemPromptPresent: !!context.systemPrompt,
		toolCount: context.tools?.length ?? 0,
		assistantToolCallIds: summary.flatMap((msg) => msg.toolCallIds ?? []),
		toolResultIds: summary.flatMap((msg) => (msg.toolResultId ? [msg.toolResultId] : [])),
		summary,
	};
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

function summarizeResponseEvent(event: AssistantMessageEvent): ResponseEventSnapshot {
	switch (event.type) {
		case "text_delta":
		case "thinking_delta":
		case "toolcall_delta":
			return {
				type: event.type,
				deltaSize: event.delta.length,
			};
		case "toolcall_end":
			return {
				type: event.type,
				toolCallId: event.toolCall.id,
				toolCallName: event.toolCall.name,
			};
		case "done":
			return {
				type: event.type,
				finishReason: event.reason,
			};
		case "error":
			return {
				type: event.type,
				finishReason: event.reason,
			};
		default:
			return { type: event.type };
	}
}

function summarizeCompletion(message: AssistantMessage): CompletionSnapshot {
	const textBlocks = message.content.filter((block) => block.type === "text").length;
	const thinkingBlocks = message.content.filter((block) => block.type === "thinking").length;
	const toolCalls = message.content.filter((block) => block.type === "toolCall").length;
	return {
		stopReason: message.stopReason,
		usage: {
			input: message.usage.input,
			output: message.usage.output,
			cacheRead: message.usage.cacheRead,
			cacheWrite: message.usage.cacheWrite,
			totalTokens: message.usage.totalTokens,
		},
		contentSummary: {
			textBlocks,
			thinkingBlocks,
			toolCalls,
		},
	};
}

function summarizeProviderError(message: AssistantMessage): ProviderErrorSnapshot {
	return {
		message: message.errorMessage ?? "Unknown provider error",
		phase: "unknown",
	};
}

function createOuterTraceErrorMessage<TApi extends Api>(model: Model<TApi>, errorMessage: string): AssistantMessage {
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
		errorMessage,
		timestamp: Date.now(),
	};
}

export function stream<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): AssistantMessageEventStream {
	const provider = resolveApiProvider(model.api);
	const { trace, ownsTrace } = createProviderTrace("stream", model, context, options as StreamOptions | undefined);
	const inner = provider.stream(model, context, withTraceOptions(options as StreamOptions | undefined, trace));
	return wrapStreamWithTrace(inner, trace, ownsTrace, model);
}

export async function complete<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: ProviderStreamOptions,
): Promise<AssistantMessage> {
	const s = stream(model, context, options);
	return s.result();
}

export function streamSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const { trace, ownsTrace } = createProviderTrace("streamSimple", model, context, options);
	const tracedOptions = withTraceOptions(options, trace);

	if (isKimiModel(model)) {
		const apiKey = tracedOptions?.apiKey || getEnvApiKey(model.provider);
		const inner = streamKimi(model as Model<"openai-completions">, context, {
			...tracedOptions,
			apiKey,
			format: "anthropic",
		});
		return wrapStreamWithTrace(inner, trace, ownsTrace, model);
	}

	const provider = resolveApiProvider(model.api);
	const inner = provider.streamSimple(model, context, tracedOptions);
	return wrapStreamWithTrace(inner, trace, ownsTrace, model);
}

export async function completeSimple<TApi extends Api>(
	model: Model<TApi>,
	context: Context,
	options?: SimpleStreamOptions,
): Promise<AssistantMessage> {
	const s = streamSimple(model, context, options);
	return s.result();
}
