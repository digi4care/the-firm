/**
 * Stream Engine (Template Method Pattern)
 *
 * Defines the skeleton of the streaming algorithm.
 * Providers plug in via ProviderDefinition (Strategy pattern) to customize specific steps.
 */

import type {
	Api,
	AssistantMessage,
	Context,
	Model,
	SimpleStreamOptions,
	StreamOptions,
	ToolCall,
} from "../../types.js";
import { AssistantMessageEventStream } from "../../utils/event-stream.js";
import { resolveApiKey } from "./api-key-resolver.js";
import { getOrCreateClientSync } from "./client-pool.js";
import { createParseState, type ProviderDefinition } from "./provider-definition.js";

/**
 * Create a stream function from a provider definition
 *
 * This is the Template Method that orchestrates the streaming flow:
 * 1. Resolve API key
 * 2. Get or create cached client
 * 3. Transform messages
 * 4. Build parameters
 * 5. Execute stream
 * 6. Parse chunks and emit events
 * 7. Calculate final cost
 */
export function createStreamFunction<TClient, TParams, TChunk>(
	definition: ProviderDefinition<TClient, TParams, TChunk>,
): (model: Model<Api>, context: Context, options?: StreamOptions) => AssistantMessageEventStream {
	return (model, context, options) => {
		const stream = new AssistantMessageEventStream();

		// Initialize the assistant message
		const output: AssistantMessage = {
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
			stopReason: "stop",
			timestamp: Date.now(),
		};

		// Start async processing
		(async () => {
			try {
				// Step 1: Resolve API key
				const apiKey = resolveApiKey(model, options);

				// Step 2: Get or create cached client
				const client = getOrCreateClientSync(
					definition,
					{
						baseUrl: model.baseUrl,
						apiKey,
						headers: options?.headers,
					},
					definition.createClient,
				);

				// Step 3: Transform messages
				definition.transformMessages(context, model);

				options?.providerTrace?.requestBuilt({
					endpoint: model.baseUrl,
					method: "POST",
					transport: options?.transport,
					bodyShape: String(definition.api),
					messageCount: context.messages.length,
					toolCount: context.tools?.length,
				});
				// Step 4: Build parameters
				let params = definition.buildParams(model, context, options);

				// Allow payload inspection/modification
				if (options?.onPayload) {
					const modified = await options.onPayload(params, model);
					if (modified !== undefined) {
						params = modified as TParams;
						options?.providerTrace?.requestMutated({
							source: "onPayload",
							changed: [String(definition.api)],
						});
					}
				}

				options?.providerTrace?.requestDispatched({
					endpoint: model.baseUrl,
					transport: options?.transport,
					providerClientKind: String(definition.api),
				});
				// Step 5: Execute stream
				const rawStream = definition.executeStream(client, params, options?.signal);

				// Step 6: Parse chunks and emit events
				const state = createParseState();
				let hasStarted = false;

				for await (const chunk of rawStream) {
					if (!hasStarted) {
						stream.push({ type: "start", partial: output });
						hasStarted = true;
					}

					// Extract response ID if available
					const responseId = definition.extractResponseId?.(chunk);
					if (responseId) {
						output.responseId = responseId;
					}

					// Extract usage if available
					const usage = definition.extractUsage?.(chunk);
					if (usage) {
						output.usage.input = usage.input;
						output.usage.output = usage.output;
						output.usage.cacheRead = usage.cacheRead;
						output.usage.cacheWrite = usage.cacheWrite;
					}

					// Parse chunk into events
					const events = definition.parseChunk(chunk, state);

					for (const event of events) {
						switch (event.type) {
							case "text_start":
								output.content.push({ type: "text", text: "" });
								state.currentBlockIndex = output.content.length - 1;
								stream.push({
									type: "text_start",
									contentIndex: event.index,
									partial: output,
								});
								break;

							case "text_delta":
								if (state.currentBlockIndex >= 0) {
									const block = output.content[state.currentBlockIndex];
									if (block?.type === "text") {
										block.text += event.delta;
										stream.push({
											type: "text_delta",
											contentIndex: state.currentBlockIndex,
											delta: event.delta,
											partial: output,
										});
									}
								}
								break;

							case "text_end":
								stream.push({
									type: "text_end",
									contentIndex: event.index,
									content: event.content,
									partial: output,
								});
								break;

							case "thinking_start":
								output.content.push({ type: "thinking", thinking: "" });
								state.currentBlockIndex = output.content.length - 1;
								state.inThinkingBlock = true;
								stream.push({
									type: "thinking_start",
									contentIndex: event.index,
									partial: output,
								});
								break;

							case "thinking_delta":
								if (state.currentBlockIndex >= 0) {
									const block = output.content[state.currentBlockIndex];
									if (block?.type === "thinking") {
										block.thinking += event.delta;
										stream.push({
											type: "thinking_delta",
											contentIndex: state.currentBlockIndex,
											delta: event.delta,
											partial: output,
										});
									}
								}
								break;

							case "thinking_end":
								state.inThinkingBlock = false;
								stream.push({
									type: "thinking_end",
									contentIndex: event.index,
									content: event.content,
									partial: output,
								});
								break;

							case "toolcall_start": {
								const tcStart = event;
								output.content.push({
									type: "toolCall",
									id: tcStart.toolCall.id,
									name: tcStart.toolCall.name,
									arguments: {},
								});
								state.currentBlockIndex = output.content.length - 1;
								stream.push({
									type: "toolcall_start",
									contentIndex: state.currentBlockIndex,
									partial: output,
								});
								break;
							}

							case "toolcall_delta":
								if (state.currentBlockIndex >= 0) {
									const block = output.content[state.currentBlockIndex];
									if (block?.type === "toolCall") {
										const key = block.id;
										const existing = state.toolCallArgs.get(key) || "";
										state.toolCallArgs.set(key, existing + event.delta);
										stream.push({
											type: "toolcall_delta",
											contentIndex: state.currentBlockIndex,
											delta: event.delta,
											partial: output,
										});
									}
								}
								break;

							case "toolcall_end": {
								if (state.currentBlockIndex >= 0) {
									const block = output.content[state.currentBlockIndex];
									if (block?.type === "toolCall") {
										// Parse accumulated arguments
										const key = block.id;
										const argsJson = state.toolCallArgs.get(key) || "{}";
										try {
											block.arguments = JSON.parse(argsJson);
										} catch {
											block.arguments = {};
										}
										state.toolCallArgs.delete(key);
									}
									stream.push({
										type: "toolcall_end",
										contentIndex: state.currentBlockIndex,
										toolCall: block as ToolCall,
										partial: output,
									});
								}
								break;
							}

							case "finish_reason":
								output.stopReason = definition.mapStopReason(event.reason);
								break;
						}
					}
				}

				// Emit done event
				stream.push({
					type: "done",
					reason: output.stopReason as "stop" | "length" | "toolUse",
					message: output,
				});
				stream.end(output);
			} catch (error) {
				// Emit error event
				output.stopReason = "error";
				output.errorMessage = error instanceof Error ? error.message : String(error);
				stream.push({
					type: "error",
					reason: "error",
					error: output,
				});
				stream.end(output);
			}
		})();

		return stream;
	};
}

/**
 * Create a "simple" stream function that prepares options before delegating
 */
export function createSimpleStreamFunction<TClient, TParams, TChunk>(
	definition: ProviderDefinition<TClient, TParams, TChunk>,
	prepareOptions?: (model: Model<Api>, options: StreamOptions) => StreamOptions,
): (model: Model<Api>, context: Context, options?: SimpleStreamOptions) => AssistantMessageEventStream {
	const baseStream = createStreamFunction(definition);

	return (model, context, options) => {
		// Prepare options if provider has custom logic
		const preparedOptions = prepareOptions && options ? prepareOptions(model, options) : options;
		return baseStream(model, context, preparedOptions);
	};
}
