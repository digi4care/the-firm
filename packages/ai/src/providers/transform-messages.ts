import type {
	Api,
	AssistantMessage,
	Message,
	MessageSummary,
	Model,
	ProviderTraceScope,
	ToolCall,
	ToolResultMessage,
} from "../types.js";

/**
 * Track whether a tool call has been resolved (real or synthetic result).
 * Used to prevent duplicate synthetic results for aborted tool calls.
 */
enum ToolCallStatus {
	/** Tool call has received a result (real or synthetic for orphan) */
	Resolved = 1,
	/** Tool call was from an aborted message; synthetic result injected, skip real results */
	Aborted = 2,
}

/**
 * Normalize tool call ID for cross-provider compatibility.
 * OpenAI Responses API generates IDs that are 450+ chars with special characters like `|`.
 * Anthropic APIs require IDs matching ^[a-zA-Z0-9_-]+$ (max 64 chars).
 */
export function transformMessages<TApi extends Api>(
	messages: Message[],
	model: Model<TApi>,
	normalizeToolCallId?: (id: string, model: Model<TApi>, source: AssistantMessage) => string,
	providerTrace?: ProviderTraceScope,
): Message[] {
	providerTrace?.contextTransformed({
		stage: "transformMessages:before",
		before: summarizeMessages(messages),
	});

	// Build a map of original tool call IDs to normalized IDs
	const toolCallIdMap = new Map<string, string>();
	const toolCallStatus = new Map<string, ToolCallStatus>();

	// First pass: transform messages (thinking blocks, tool call ID normalization)
	const transformed = messages.map((msg, messageIndex) => {
		// User messages pass through unchanged
		if (msg.role === "user") {
			return msg;
		}

		// Handle toolResult messages - normalize toolCallId if we have a mapping
		if (msg.role === "toolResult") {
			const normalizedId = toolCallIdMap.get(msg.toolCallId);
			if (normalizedId && normalizedId !== msg.toolCallId) {
				providerTrace?.toolCallMapping({
					stage: "toolResult:mapped",
					originalId: msg.toolCallId,
					finalId: normalizedId,
					reason: "cross-model-normalization",
					messageIndex,
				});
				return { ...msg, toolCallId: normalizedId };
			}
			return msg;
		}

		// Assistant messages need transformation check
		if (msg.role === "assistant") {
			const assistantMsg = msg as AssistantMessage;
			const isSameModel =
				assistantMsg.provider === model.provider &&
				assistantMsg.api === model.api &&
				assistantMsg.model === model.id;
			const hasInvalidThinkingSignatures =
				assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted";

			const transformedContent = assistantMsg.content.flatMap((block) => {
				if (block.type === "thinking") {
					if (block.redacted) {
						if (!isSameModel || hasInvalidThinkingSignatures) {
							return [];
						}
						return block;
					}

					const sanitizedBlock = hasInvalidThinkingSignatures ? { ...block, thinkingSignature: undefined } : block;
					// For same model: keep thinking blocks with signatures (needed for replay)
					// even if the thinking text is empty (OpenAI encrypted reasoning)
					if (isSameModel && sanitizedBlock.thinkingSignature) return sanitizedBlock;
					// Skip empty thinking blocks, convert others to plain text
					if (!sanitizedBlock.thinking || sanitizedBlock.thinking.trim() === "") return [];
					if (isSameModel) return sanitizedBlock;
					return {
						type: "text" as const,
						text: sanitizedBlock.thinking,
					};
				}

				if (block.type === "text") {
					if (isSameModel) return block;
					return {
						type: "text" as const,
						text: block.text,
					};
				}

				if (block.type === "toolCall") {
					const toolCall = block as ToolCall;
					let normalizedToolCall: ToolCall = toolCall;

					if (!isSameModel && toolCall.thoughtSignature) {
						normalizedToolCall = { ...toolCall };
						delete (normalizedToolCall as { thoughtSignature?: string }).thoughtSignature;
					}

					if (!isSameModel && normalizeToolCallId) {
						const normalizedId = normalizeToolCallId(toolCall.id, model, assistantMsg);
						if (normalizedId !== toolCall.id) {
							toolCallIdMap.set(toolCall.id, normalizedId);
							providerTrace?.toolCallMapping({
								stage: "toolCall:normalized",
								originalId: toolCall.id,
								finalId: normalizedId,
								reason: "cross-model-normalization",
								messageIndex,
							});
							normalizedToolCall = { ...normalizedToolCall, id: normalizedId };
						}
					}

					return normalizedToolCall;
				}

				return block;
			});

			return {
				...assistantMsg,
				content: transformedContent,
			};
		}
		return msg;
	});

	// Second pass: insert synthetic empty tool results for orphaned tool calls
	// This preserves thinking signatures and satisfies API requirements
	const result: Message[] = [];
	let pendingToolCalls: ToolCall[] = [];
	let existingToolResultIds = new Set<string>();

	// Track aborted tool calls so we can match their results later
	let pendingAbortedToolCalls = new Map<string, ToolCall>();

	/** Insert synthetic tool results for any pending orphaned tool calls */
	function flushPendingToolCalls(timestamp: number): void {
		if (pendingToolCalls.length === 0) return;
		for (const tc of pendingToolCalls) {
			if (!existingToolResultIds.has(tc.id)) {
				result.push({
					role: "toolResult",
					toolCallId: tc.id,
					toolName: tc.name,
					content: [{ type: "text", text: "No result provided" }],
					isError: true,
					timestamp,
				} as ToolResultMessage);
				toolCallStatus.set(tc.id, ToolCallStatus.Resolved);
			}
		}
		pendingToolCalls = [];
		existingToolResultIds = new Set();
	}

	/** Insert synthetic tool results for aborted tool calls */
	function flushPendingAbortedToolCalls(): void {
		if (pendingAbortedToolCalls.size === 0) return;
		for (const [id, tc] of pendingAbortedToolCalls) {
			if (toolCallStatus.get(id) !== ToolCallStatus.Resolved) {
				result.push({
					role: "toolResult",
					toolCallId: id,
					toolName: tc.name,
					content: [{ type: "text", text: "The previous turn was aborted. The tool call was not completed." }],
					isError: true,
					timestamp: Date.now(),
				} as ToolResultMessage);
				toolCallStatus.set(id, ToolCallStatus.Aborted);
			}
		}
		pendingAbortedToolCalls = new Map();
	}

	for (let i = 0; i < transformed.length; i++) {
		const msg = transformed[i];

		if (msg.role === "assistant") {
			// Flush any pending orphaned tool calls from a previous assistant message
			flushPendingToolCalls((msg as AssistantMessage).timestamp ?? Date.now());

			const assistantMsg = msg as AssistantMessage;
			const isAborted = assistantMsg.stopReason === "error" || assistantMsg.stopReason === "aborted";

			// Track tool calls from this assistant message
			const toolCalls = assistantMsg.content.filter((b) => b.type === "toolCall") as ToolCall[];

			if (isAborted) {
				// KEEP the errored/aborted assistant message — the tool_use blocks must survive
				// so that the API can match subsequent tool_result messages to their tool_use IDs.
				// Without this, Anthropic-compatible APIs (Kimi, MiniMax) reject with "tool_call_id is not found".
				//
				// However, we must strip partial/incomplete thinking signatures from aborted messages,
				// as they can cause API rejections from providers that validate signatures.
				if (toolCalls.length > 0) {
					const sanitizedContent = assistantMsg.content.map((block) => {
						if (block.type === "thinking" && block.thinkingSignature) {
							// Strip partial thinking signatures from aborted turns
							return { ...block, thinkingSignature: undefined };
						}
						return block;
					});
					result.push({ ...assistantMsg, content: sanitizedContent });
					pendingAbortedToolCalls = new Map(toolCalls.map((tc) => [tc.id, tc] as const));
				} else {
					result.push(msg);
				}
				continue;
			}
			if (toolCalls.length > 0) {
				pendingToolCalls = toolCalls;
				existingToolResultIds = new Set();
			}

			result.push(msg);
		} else if (msg.role === "toolResult") {
			// If this is a real result for an aborted tool call, accept it
			if (pendingAbortedToolCalls.has(msg.toolCallId)) {
				pendingAbortedToolCalls.delete(msg.toolCallId);
				toolCallStatus.set(msg.toolCallId, ToolCallStatus.Resolved);
				result.push(msg);
				continue;
			}
			// Skip if we already injected a synthetic "aborted" result for this tool call
			if (toolCallStatus.get(msg.toolCallId) === ToolCallStatus.Aborted) continue;
			toolCallStatus.set(msg.toolCallId, ToolCallStatus.Resolved);
			existingToolResultIds.add(msg.toolCallId);
			result.push(msg);
		} else if (msg.role === "user") {
			// User message interrupts tool flow - flush any pending orphaned calls
			flushPendingToolCalls(Date.now());
			flushPendingAbortedToolCalls();
			result.push(msg);
		} else {
			result.push(msg);
		}
	}

	// Final flush for any trailing orphaned tool calls
	flushPendingToolCalls(Date.now());
	flushPendingAbortedToolCalls();

	providerTrace?.contextTransformed({
		stage: "transformMessages:after",
		after: summarizeMessages(result),
	});

	return result;
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
