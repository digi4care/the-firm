/**
 * handoff-generator.ts — Core handoff summary generation
 *
 * Generates structured handoff summaries from session entries using LLM.
 * Used by both automatic (session_shutdown, compaction) and manual (/handoff) flows.
 *
 * Based on OMP's handoff.ts + custom-compaction.ts patterns.
 */

import { complete, type Message } from "@mariozechner/pi-ai";
import type { SessionEntry } from "@mariozechner/pi-coding-agent";
import { convertToLlm, serializeConversation } from "@mariozechner/pi-coding-agent";
import type { Model, ModelRegistry } from "@mariozechner/pi-coding-agent";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface HandoffResult {
	summary: string;
	readFiles: string[];
	modifiedFiles: string[];
	tokensUsed: number;
}

export interface HandoffOptions {
	/** Extra instructions for the summary (e.g., focus area) */
	customInstructions?: string;
	/** Abort signal */
	signal?: AbortSignal;
	/** Model override (defaults to current session model) */
	model?: Model;
}

// ═══════════════════════════════════════════════════════════════
// System prompts
// ═══════════════════════════════════════════════════════════════

const HANDOFF_SYSTEM_PROMPT = `You are a context transfer assistant for a software engineering session.

Given a conversation history, generate a structured handoff summary that a NEW session can use to continue work seamlessly.

You MUST output in this exact format:

## Goal
[What the user is trying to accomplish — the overarching objective]

## Constraints & Preferences
- [Requirements, coding standards, tool preferences mentioned by user]

## Progress
### Done
- [x] [Completed tasks with brief details]

### In Progress
- [ ] [Current work that was being done when session ended]

### Blocked
- [Issues, open questions, or blockers]

## Key Decisions
- **[Decision]**: [Why this choice was made]

## Next Steps
1. [Concrete next action to take]
2. [Follow-up action]

## Critical Context
- [Any data, variables, configs, or knowledge needed to continue]
- [Important nuances that aren't obvious from code alone]

## Files
- **Read**: [list of files that were read/examined]
- **Modified**: [list of files that were changed]

Rules:
- Be specific: include file paths, function names, variable names
- Be concise: no filler, no repetition
- Include WHY decisions were made, not just WHAT was decided
- If work was interrupted mid-task, describe exactly where it stopped
- The new session should be able to continue WITHOUT the old conversation`;

const FOCUSED_HANDOFF_PROMPT = `You are a context transfer assistant.

Given a conversation history and the user's goal for a new thread, generate a focused prompt that:

1. Summarizes relevant context from the conversation (decisions made, approaches taken, key findings)
2. Lists any relevant files that were discussed or modified
3. Clearly states the next task based on the user's goal
4. Is self-contained — the new thread should be able to proceed without the old conversation

Format your response as a prompt the user can send to start the new thread. Be concise but include all necessary context.

Example output format:
## Context
We've been working on X. Key decisions:
- Decision 1
- Decision 2

Files involved:
- path/to/file1.ts

## Task
[Clear description of what to do next based on user's goal]`;

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

/** Extract file paths from tool calls in session entries */
function extractFileOps(entries: SessionEntry[]): { readFiles: string[]; modifiedFiles: string[] } {
	const readFiles = new Set<string>();
	const modifiedFiles = new Set<string>();

	for (const entry of entries) {
		if (entry.type !== "message") continue;
		const msg = (entry as any).message;
		if (!msg?.content || !Array.isArray(msg.content)) continue;

		for (const block of msg.content) {
			if (block.type !== "toolCall") continue;

			// Read tool
			if (block.name === "read" && block.arguments?.path) {
				readFiles.add(block.arguments.path);
			}

			// Write/Edit tools
			if ((block.name === "write" || block.name === "edit") && block.arguments?.path) {
				modifiedFiles.add(block.arguments.path);
			}

			// Bash commands that modify files
			if (block.name === "bash" && typeof block.arguments?.command === "string") {
				const cmd = block.arguments.command;
				// Detect common file-writing commands
				const writePatterns = [/>\s*(\S+)/, /tee\s+(\S+)/, /cp\s+(\S+)\s+(\S+)/, /mv\s+(\S+)\s+(\S+)/];
				for (const pattern of writePatterns) {
					const match = cmd.match(pattern);
					if (match) modifiedFiles.add(match[1]);
				}
			}
		}
	}

	return {
		readFiles: Array.from(readFiles),
		modifiedFiles: Array.from(modifiedFiles),
	};
}

/** Filter entries to only message types relevant for summarization */
function filterMessageEntries(entries: SessionEntry[]): SessionEntry[] {
	return entries.filter((entry) => {
		if (entry.type !== "message") return false;
		const msg = (entry as any).message;
		return msg?.role === "user" || msg?.role === "assistant" || msg?.role === "toolResult";
	});
}

// ═══════════════════════════════════════════════════════════════
// Core generation functions
// ═══════════════════════════════════════════════════════════════

/** Resolve model + auth for summarization */
async function resolveModelAuth(
	modelRegistry: ModelRegistry,
	preferredModel?: Model,
): Promise<{ model: Model; apiKey: string; headers: Record<string, string> } | null> {
	// Try preferred model first
	const candidates: (Model | undefined)[] = [preferredModel];

	// Fallback to flash models for cheaper summarization
	const flashModel = modelRegistry.find("google", "gemini-2.5-flash");
	if (flashModel) candidates.push(flashModel);

	// Last resort: current model from registry
	const sonnetModel = modelRegistry.find("anthropic", "claude-sonnet-4-20250514");
	if (sonnetModel) candidates.push(sonnetModel);

	for (const model of candidates) {
		if (!model) continue;

		const auth = await modelRegistry.getApiKeyAndHeaders(model);
		if (auth.ok && auth.apiKey) {
			return { model, apiKey: auth.apiKey, headers: auth.headers ?? {} };
		}
	}

	return null;
}

/**
 * Generate a full handoff summary from session entries.
 * Used for automatic handoff (session_shutdown, compaction).
 */
export async function generateHandoffSummary(
	entries: SessionEntry[],
	modelRegistry: ModelRegistry,
	preferredModel?: Model,
	options?: HandoffOptions,
): Promise<HandoffResult | null> {
	const messageEntries = filterMessageEntries(entries);
	if (messageEntries.length === 0) return null;

	const auth = await resolveModelAuth(modelRegistry, options?.model ?? preferredModel);
	if (!auth) return null;

	// Serialize conversation
	const messages = messageEntries.map((e) => (e as any).message);
	const conversationText = serializeConversation(convertToLlm(messages));

	// Extract file operations
	const fileOps = extractFileOps(entries);

	// Check for existing compaction summaries
	let previousContext = "";
	for (const entry of entries) {
		if (entry.type === "compaction" && (entry as any).summary) {
			previousContext = (entry as any).summary;
		}
	}

	const extraInstructions = options?.customInstructions
		? `\n\nExtra focus: ${options.customInstructions}`
		: "";

	const contextBlock = previousContext
		? `\n\n<previous-summary>\n${previousContext}\n</previous-summary>`
		: "";

	const userMessage: Message = {
		role: "user",
		content: [
			{
				type: "text",
				text: `Summarize this conversation for handoff to a new session.${extraInstructions}${contextBlock}\n\n<conversation>\n${conversationText}\n</conversation>`,
			},
		],
		timestamp: Date.now(),
	};

	try {
		const response = await complete(
			auth.model,
			{ systemPrompt: HANDOFF_SYSTEM_PROMPT, messages: [userMessage] },
			{
				apiKey: auth.apiKey,
				headers: auth.headers,
				maxTokens: 4096,
				signal: options?.signal,
			},
		);

		if (response.stopReason === "aborted") return null;

		const summary = response.content
			.filter((c): c is { type: "text"; text: string } => c.type === "text")
			.map((c) => c.text)
			.join("\n")
			.trim();

		if (!summary) return null;

		return {
			summary,
			readFiles: fileOps.readFiles,
			modifiedFiles: fileOps.modifiedFiles,
			tokensUsed: response.usage?.totalTokens ?? 0,
		};
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error("[handoff-generator] Summary generation failed:", msg);
		return null;
	}
}

/**
 * Generate a focused handoff prompt for a specific goal.
 * Used for manual /handoff command.
 */
export async function generateFocusedHandoff(
	entries: SessionEntry[],
	goal: string,
	modelRegistry: ModelRegistry,
	preferredModel?: Model,
	signal?: AbortSignal,
): Promise<string | null> {
	const messageEntries = filterMessageEntries(entries);
	if (messageEntries.length === 0) return null;

	const auth = await resolveModelAuth(modelRegistry, preferredModel);
	if (!auth) return null;

	const messages = messageEntries.map((e) => (e as any).message);
	const conversationText = serializeConversation(convertToLlm(messages));

	const userMessage: Message = {
		role: "user",
		content: [
			{
				type: "text",
				text: `## Conversation History\n\n${conversationText}\n\n## User's Goal for New Thread\n\n${goal}`,
			},
		],
		timestamp: Date.now(),
	};

	try {
		const response = await complete(
			auth.model,
			{ systemPrompt: FOCUSED_HANDOFF_PROMPT, messages: [userMessage] },
			{
				apiKey: auth.apiKey,
				headers: auth.headers,
				maxTokens: 4096,
				signal,
			},
		);

		if (response.stopReason === "aborted") return null;

		return response.content
			.filter((c): c is { type: "text"; text: string } => c.type === "text")
			.map((c) => c.text)
			.join("\n")
			.trim();
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error("[handoff-generator] Focused handoff failed:", msg);
		return null;
	}
}

/**
 * Build a basic handoff from entries without LLM (fallback).
 * Used when no model/API key is available.
 */
export function generateBasicHandoff(entries: SessionEntry[]): string {
	const fileOps = extractFileOps(entries);
	const messageEntries = filterMessageEntries(entries);

	// Get last user messages as context
	const recentUserMessages: string[] = [];
	for (const entry of messageEntries.slice(-20).reverse()) {
		const msg = (entry as any).message;
		if (msg?.role === "user") {
			const text = typeof msg.content === "string"
				? msg.content
				: Array.isArray(msg.content)
					? msg.content
							.filter((b: any) => b.type === "text")
							.map((b: any) => b.text)
							.join(" ")
					: "";
			if (text) recentUserMessages.push(text.slice(0, 300));
			if (recentUserMessages.length >= 5) break;
		}
	}

	const lines: string[] = [
		"# Handoff — Session End",
		"",
		`Generated: ${new Date().toISOString()}`,
		"",
	];

	if (recentUserMessages.length > 0) {
		lines.push("## Recent Activity", "");
		for (const msg of recentUserMessages.reverse()) {
			lines.push(`- ${msg}`);
		}
		lines.push("");
	}

	if (fileOps.readFiles.length > 0 || fileOps.modifiedFiles.length > 0) {
		lines.push("## Files", "");
		if (fileOps.readFiles.length > 0) {
			lines.push("**Read:**");
			for (const f of fileOps.readFiles.slice(-20)) lines.push(`- ${f}`);
			lines.push("");
		}
		if (fileOps.modifiedFiles.length > 0) {
			lines.push("**Modified:**");
			for (const f of fileOps.modifiedFiles.slice(-20)) lines.push(`- ${f}`);
			lines.push("");
		}
	}

	return lines.join("\n");
}
