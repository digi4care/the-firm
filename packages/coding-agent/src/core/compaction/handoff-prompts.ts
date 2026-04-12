/**
 * Handoff prompt templates for session context transfer.
 *
 * Used by AgentSession.handoff() to generate structured handoff documents
 * that allow seamless continuation in a new session.
 */

/**
 * System prompt for handoff document generation.
 * Tells the LLM to produce a structured handoff document.
 */
export const HANDOFF_SYSTEM_PROMPT = `You are a context transfer assistant. Given a conversation history
and the user's goal for a new thread, generate a focused handoff document that:

1. Captures exact technical state, not abstractions
2. Includes concrete file paths, symbol names, commands run, test results
3. Documents observed failures, decisions made, and partial work
4. Is self-contained — the new thread can proceed without the old conversation

Output ONLY the handoff document. No preamble, no commentary, no wrapper text.

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
- [Code snippets, file paths, function/type names, error messages]
- [Repository state if relevant]

## Next Steps
1. [What should happen next]`;

/**
 * Focus text for auto-triggered handoff (threshold-based).
 * More concise than a user-provided goal.
 */
export const AUTO_HANDOFF_THRESHOLD_FOCUS =
	"Threshold-triggered maintenance: preserve critical implementation state and immediate next actions.";

/**
 * Default goal when the user doesn't provide one to manual handoff.
 */
export const DEFAULT_HANDOFF_GOAL = "Continue the current work seamlessly";

/**
 * The system message injected into the new session after handoff.
 * Wraps the handoff document with context for the agent.
 */
export function wrapHandoffContext(handoffDocument: string): string {
	return `<handoff-context>\n${handoffDocument}\n</handoff-context>\n\nThe above is a handoff document from a previous session. Use this context to continue the work seamlessly.`;
}

/**
 * The auto-continue prompt sent after handoff injection.
 */
export const HANDOFF_AUTO_CONTINUE_PROMPT = "Continue if you have next steps.";
