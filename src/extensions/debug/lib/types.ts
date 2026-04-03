/**
 * types.ts — Shared type definitions for The Firm
 *
 * All debug-related interfaces live here so they can be reused
 * across widgets, overlays, and future extensions.
 */

// ── Lifecycle Event Types ──────────────────────────────────────────────────

/** Categories of pi lifecycle events we track */
export type EventCategory =
	| "session"
	| "agent"
	| "turn"
	| "tool"
	| "message"
	| "hook"
	| "model"
	| "input";

/** A single tracked lifecycle event */
export interface TrackedEvent {
	/** Unique sequential ID */
	id: number;
	/** When it happened (ms since epoch) */
	timestamp: number;
	/** Event category */
	category: EventCategory;
	/** Event type name (e.g. "tool_execution_start") */
	eventType: string;
	/** Human-readable label */
	label: string;
	/** Optional details (tool name, model id, etc.) */
	details?: Record<string, unknown>;
	/** Duration in ms if the event has completed */
	duration?: number;
}

// ── Tool State ─────────────────────────────────────────────────────────────

export type ToolStatus = "pending" | "running" | "done" | "error" | "blocked";

export interface ToolCall {
	/** Tool call ID from pi */
	id: string;
	/** Tool name */
	name: string;
	/** Current status */
	status: ToolStatus;
	/** When it started */
	startedAt: number;
	/** When it ended (if done) */
	endedAt?: number;
	/** Was it blocked by an extension? */
	blocked?: boolean;
	/** Block reason */
	blockReason?: string;
	/** Preview of arguments */
	argsPreview?: string;
}

// ── Agent State ────────────────────────────────────────────────────────────

export type AgentPhase = "idle" | "starting" | "running" | "turn" | "ending";

export interface AgentState {
	/** Current phase */
	phase: AgentPhase;
	/** Model in use */
	model?: string;
	/** Current turn index (0-based) */
	turnIndex: number;
	/** Total turns in this agent run */
	totalTurns: number;
	/** When the agent started */
	startedAt?: number;
	/** Thinking level */
	thinkingLevel?: string;
	/** Prompt that started this run */
	currentPrompt?: string;
}

// ── Dashboard State ────────────────────────────────────────────────────────

export interface HookState {
	/** Hook name (e.g. "context", "before_provider_request") */
	name: string;
	/** When the hook started */
	startedAt: number;
	/** Hook-specific details */
	details?: Record<string, unknown>;
}

export interface DashboardState {
	/** Tracked events (ring buffer) */
	events: TrackedEvent[];
	/** Active tool calls */
	activeTools: Map<string, ToolCall>;
	/** Currently active hook, if any */
	activeHook: HookState | null;
	/** Agent state */
	agent: AgentState;
	/** Session start time */
	sessionStartedAt: number;
	/** Total events captured */
	totalEventCount: number;
	/** Events per category counter */
	categoryCounts: Record<EventCategory, number>;
}

// ── Filter State ───────────────────────────────────────────────────────────

export interface EventFilter {
	/** Only show these categories */
	categories: Set<EventCategory>;
	/** Text search */
	search: string;
}

// ── Debug Theme ────────────────────────────────────────────────────────────

export interface ColorDef {
	r: number;
	g: number;
	b: number;
}

export interface DebugPalette {
	/** Category colors */
	session: ColorDef;
	agent: ColorDef;
	turn: ColorDef;
	tool: ColorDef;
	message: ColorDef;
	hook: ColorDef;
	model: ColorDef;
	input: ColorDef;
	/** Status colors */
	success: ColorDef;
	error: ColorDef;
	warning: ColorDef;
	running: ColorDef;
	pending: ColorDef;
	/** UI colors */
	dim: ColorDef;
	text: ColorDef;
	border: ColorDef;
	/** Background colors */
	bgPanel: ColorDef;
	bgRow: ColorDef;
	bgSelected: ColorDef;
}
