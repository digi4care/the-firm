/**
 * handoff-generator.ts — Core handoff summary generation
 *
 * Generates structured handoff documents from session entries.
 * Uses OMP's exact handoff-document.md prompt template.
 *
 * Two modes:
 * 1. Manual /handoff — agent writes the handoff document itself (OMP-style)
 * 2. Fallback basic handoff — no LLM needed, extracts file ops + recent messages
 */

import type { SessionEntry } from "@mariozechner/pi-coding-agent";

// ═══════════════════════════════════════════════════════════════
// OMP's exact handoff prompt template
// ═══════════════════════════════════════════════════════════════
// Source: oh-my-pi/packages/coding-agent/src/prompts/system/handoff-document.md

const HANDOFF_DOCUMENT_PROMPT = `<critical>
Write a comprehensive handoff document for another instance of yourself.
The handoff **MUST** be sufficient for seamless continuation without access to this conversation.
Output ONLY the handoff document. No preamble, no commentary, no wrapper text.
</critical>

<instruction>
Capture exact technical state, not abstractions.
Include concrete file paths, symbol names, commands run, test results, observed failures, decisions made, and any partial work that materially affects the next step.
</instruction>

<output>
Use exactly this structure:

## Goal
[What the user is trying to accomplish]

## Constraints & Preferences
- [Any constraints, preferences, or requirements mentioned]

## Progress
### Done
- [x] [Completed tasks with specifics]

### In Progress
- [ ] [Current work if any]

### Pending
- [ ] [Tasks mentioned but not started]

## Key Decisions
- **[Decision]**: [Rationale]

## Critical Context
- [Code snippets, file paths, function/type names, error messages, or data essential to continue]
- [Repository state if relevant]

## Next Steps
1. [What should happen next]
</output>`;

/** OMP's auto-handoff threshold focus — for threshold-triggered handoff */
const AUTO_HANDOFF_THRESHOLD_FOCUS =
	"Threshold-triggered maintenance: preserve critical implementation state and immediate next actions.";

/**
 * Render the handoff document prompt with optional additional focus.
 * OMP uses {{additionalFocus}} template variable — we render it inline.
 */
export function renderHandoffPrompt(additionalFocus?: string): string {
	if (!additionalFocus) return HANDOFF_DOCUMENT_PROMPT;
	return `${HANDOFF_DOCUMENT_PROMPT}\n<instruction>\nAdditional focus: ${additionalFocus}\n</instruction>`;
}

/** Get the auto-handoff threshold focus prompt */
export function getAutoHandoffFocus(): string {
	return AUTO_HANDOFF_THRESHOLD_FOCUS;
}

// ═══════════════════════════════════════════════════════════════
// File operation extraction (used by basic handoff)
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

			if (block.name === "read" && block.arguments?.path) {
				readFiles.add(block.arguments.path);
			}

			if ((block.name === "write" || block.name === "edit") && block.arguments?.path) {
				modifiedFiles.add(block.arguments.path);
			}

			if (block.name === "bash" && typeof block.arguments?.command === "string") {
				const cmd = block.arguments.command;
				const writePatterns = [
					/>\s*(\S+)/,
					/tee\s+(\S+)/,
					/cp\s+(\S+)\s+(\S+)/,
					/mv\s+(\S+)\s+(\S+)/,
				];
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
// Basic handoff (no LLM — fallback when agent can't write it)
// ═══════════════════════════════════════════════════════════════

/**
 * Build a basic handoff from entries without LLM (fallback).
 * Used when no model is available or as safety net.
 */
export function generateBasicHandoff(entries: SessionEntry[]): string {
	const fileOps = extractFileOps(entries);
	const messageEntries = filterMessageEntries(entries);

	// Get last user messages as context
	const recentUserMessages: string[] = [];
	for (const entry of messageEntries.slice(-20).reverse()) {
		const msg = (entry as any).message;
		if (msg?.role === "user") {
			const text =
				typeof msg.content === "string"
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

// ═══════════════════════════════════════════════════════════════
// Handoff context injection (OMP-style <handoff-context>)
// ═══════════════════════════════════════════════════════════════

/**
 * Wrap handoff text in OMP's <handoff-context> format.
 * This is the same wrapper OMP uses for injecting handoff into new sessions.
 */
export function wrapHandoffContext(handoffText: string): string {
	return `<handoff-context>\n${handoffText}\n</handoff-context>\n\nThe above is a handoff document from a previous session. Use this context to continue the work seamlessly.`;
}
