import type { Context, Model, SimpleStreamOptions } from "../types.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { getKimiCommonHeaders } from "../utils/oauth/kimi.js";
import { streamSimpleAnthropic } from "./anthropic.js";

const KIMI_ANTHROPIC_BASE_URL = "https://api.kimi.com/coding";

export function isKimiModel(model: Model<any>): boolean {
	return model.provider === "kimi-coding";
}

export function streamKimi(
	model: Model<"anthropic-messages">,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const stream = new AssistantMessageEventStream();

	(async () => {
		try {
			const kimiHeaders = await getKimiCommonHeaders();
			const mergedHeaders = { ...kimiHeaders, ...model.headers, ...options?.headers };
			const anthropicModel: Model<"anthropic-messages"> = {
				...model,
				api: "anthropic-messages",
				baseUrl: KIMI_ANTHROPIC_BASE_URL,
				headers: mergedHeaders,
			};

			const innerStream = streamSimpleAnthropic(anthropicModel, context, {
				...options,
				headers: mergedHeaders,
			});

			for await (const event of innerStream) {
				stream.push(event);
			}
		} catch (error) {
			stream.push({
				type: "error",
				reason: "error",
				error: {
					role: "assistant",
					content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
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
					timestamp: Date.now(),
				},
			});
		}
	})();

	return stream;
}
