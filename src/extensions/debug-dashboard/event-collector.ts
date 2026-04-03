/**
 * event-collector.ts — Captures all pi lifecycle events into a ring buffer
 *
 * Single Responsibility: listen to pi events, store them, expose state.
 * Does NOT render anything — that's the job of compact-widget and debug-overlay.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type {
	AgentPhase,
	DashboardState,
	EventCategory,
	HookState,
	ToolCall,
	ToolStatus,
	TrackedEvent,
} from "../../lib/debug/types.ts";

const MAX_EVENTS = 500;

export class EventCollector {
	public readonly state: DashboardState;
	private nextEventId = 1;

	constructor(private readonly pi: ExtensionAPI) {
		this.state = this.createInitialState();
	}

	/** Start listening to all pi events */
	public start(): void {
		this.trackSessionEvents();
		this.trackAgentEvents();
		this.trackTurnEvents();
		this.trackToolEvents();
		this.trackMessageEvents();
		this.trackHookEvents();
		this.trackModelEvents();
		this.trackInputEvents();
		this.recordEvent("session", "session_start", "Session started");
	}

	// ── Event Recording ───────────────────────────────────────────────────

	private recordEvent(
		category: EventCategory,
		eventType: string,
		label: string,
		details?: Record<string, unknown>,
	): TrackedEvent {
		const event: TrackedEvent = {
			id: this.nextEventId++,
			timestamp: Date.now(),
			category,
			eventType,
			label,
			details,
		};

		this.state.events.push(event);
		if (this.state.events.length > MAX_EVENTS) {
			this.state.events.shift();
		}

		this.state.totalEventCount++;
		this.state.categoryCounts[category]++;

		return event;
	}

	// ── Session Events ────────────────────────────────────────────────────

	private trackSessionEvents(): void {
		this.pi.on("session_start", () => {
			this.state.sessionStartedAt = Date.now();
		});

		this.pi.on("session_shutdown", () => {
			this.recordEvent("session", "session_shutdown", "Session shutting down");
		});

		this.pi.on("session_switch", (event) => {
			this.recordEvent("session", "session_switch", `Session switched (${event.reason})`, {
				reason: event.reason,
			});
		});

		this.pi.on("session_before_compact", () => {
			this.recordEvent("session", "session_before_compact", "Compaction starting");
		});

		this.pi.on("session_compact", (event) => {
			this.recordEvent("session", "session_compact", "Compaction complete", {
				fromExtension: event.fromExtension,
			});
		});
	}

	// ── Agent Events ──────────────────────────────────────────────────────

	private trackAgentEvents(): void {
		this.pi.on("before_agent_start", (event) => {
			this.setPhase("starting");
			this.state.agent.currentPrompt = event.prompt;
			this.state.agent.turnIndex = 0;
			this.state.agent.totalTurns = 0;
			this.state.agent.startedAt = Date.now();
			this.recordEvent("agent", "before_agent_start", "Agent preparing", {
				promptPreview: event.prompt.slice(0, 80),
			});
		});

		this.pi.on("agent_start", () => {
			this.setPhase("running");
			this.recordEvent("agent", "agent_start", "Agent started");
		});

		this.pi.on("agent_end", (event) => {
			this.setPhase("idle");
			this.completeEventDuration("agent_start");
			this.recordEvent("agent", "agent_end", `Agent finished (${event.messages.length} msgs)`, {
				messageCount: event.messages.length,
			});
		});
	}

	// ── Turn Events ───────────────────────────────────────────────────────

	private trackTurnEvents(): void {
		this.pi.on("turn_start", (event) => {
			this.setPhase("turn");
			this.state.agent.turnIndex = event.turnIndex;
			this.state.agent.totalTurns = Math.max(this.state.agent.totalTurns, event.turnIndex + 1);
			this.recordEvent("turn", "turn_start", `Turn ${event.turnIndex} started`, {
				turnIndex: event.turnIndex,
			});
		});

		this.pi.on("turn_end", (event) => {
			this.state.agent.turnIndex = event.turnIndex;
			this.completeEventDuration("turn_start");
			const toolCount = event.toolResults?.length ?? 0;
			this.recordEvent("turn", "turn_end", `Turn ${event.turnIndex} ended (${toolCount} tools)`, {
				turnIndex: event.turnIndex,
				toolCount,
			});
		});
	}

	// ── Tool Events ───────────────────────────────────────────────────────

	private trackToolEvents(): void {
		this.pi.on("tool_execution_start", (event) => {
			const toolCall: ToolCall = {
				id: event.toolCallId,
				name: event.toolName,
				status: "running",
				startedAt: Date.now(),
				argsPreview: JSON.stringify(event.args).slice(0, 80),
			};
			this.state.activeTools.set(event.toolCallId, toolCall);
			this.recordEvent("tool", "tool_execution_start", `${event.toolName} started`, {
				toolCallId: event.toolCallId,
				toolName: event.toolName,
			});
		});

		this.pi.on("tool_call", (event) => {
			const existing = this.state.activeTools.get(event.toolCallId);
			if (existing) {
				existing.argsPreview = JSON.stringify(event.input).slice(0, 80);
			}
		});

		this.pi.on("tool_execution_end", (event) => {
			const existing = this.state.activeTools.get(event.toolCallId);
			const status: ToolStatus = event.isError ? "error" : "done";
			if (existing) {
				existing.status = status;
				existing.endedAt = Date.now();
			}
			this.recordEvent("tool", "tool_execution_end", `${event.toolName} ${status}`, {
				toolCallId: event.toolCallId,
				toolName: event.toolName,
				isError: event.isError,
			});
		});
	}

	// ── Message Events ────────────────────────────────────────────────────

	private trackMessageEvents(): void {
		this.pi.on("message_start", (event) => {
			const role = event.message?.role ?? "unknown";
			this.recordEvent("message", "message_start", `${role} message started`, { role });
		});

		this.pi.on("message_end", (event) => {
			const role = event.message?.role ?? "unknown";
			this.recordEvent("message", "message_end", `${role} message ended`, { role });
		});
	}

	// ── Hook Events ───────────────────────────────────────────────────────

	private trackHookEvents(): void {
		this.pi.on("context", (event) => {
			const msgCount = event.messages?.length ?? 0;
			const hook: HookState = {
				name: "context",
				startedAt: Date.now(),
				details: { messageCount: msgCount },
			};
			this.state.activeHook = hook;
			this.recordEvent("hook", "context", `Context hook (${msgCount} msgs)`, {
				messageCount: msgCount,
			});
		});

		this.pi.on("before_provider_request", (event) => {
			const payloadKeys = event.payload ? Object.keys(event.payload) : [];
			const model = event.payload?.model ?? "unknown";
			const hook: HookState = {
				name: "before_provider_request",
				startedAt: Date.now(),
				details: { model, payloadKeys },
			};
			this.state.activeHook = hook;
			this.recordEvent("hook", "before_provider_request", `Provider request (${model})`, {
				model,
				payloadKeys,
			});
		});

		// Clear active hook after hooks resolve (next tick)
		this.pi.on("turn_start", () => {
			this.state.activeHook = null;
		});
		this.pi.on("turn_end", () => {
			this.state.activeHook = null;
		});
		this.pi.on("tool_execution_start", () => {
			this.state.activeHook = null;
		});
		this.pi.on("message_start", () => {
			this.state.activeHook = null;
		});
	}

	// ── Model Events ──────────────────────────────────────────────────────

	private trackModelEvents(): void {
		this.pi.on("model_select", (event) => {
			const prev = event.previousModel
				? `${event.previousModel.provider}/${event.previousModel.id}`
				: "none";
			const next = `${event.model.provider}/${event.model.id}`;
			this.state.agent.model = next;
			this.state.agent.thinkingLevel = this.pi.getThinkingLevel();
			this.recordEvent("model", "model_select", `${prev} → ${next}`, {
				source: event.source,
			});
		});
	}

	// ── Input Events ──────────────────────────────────────────────────────

	private trackInputEvents(): void {
		this.pi.on("input", (event) => {
			this.recordEvent("input", "input", `Input (${event.source})`, {
				source: event.source,
				preview: event.text.slice(0, 60),
			});
		});
	}

	// ── Helpers ───────────────────────────────────────────────────────────

	private createInitialState(): DashboardState {
		return {
			events: [],
			activeTools: new Map(),
			activeHook: null,
			agent: {
				phase: "idle",
				model: undefined,
				turnIndex: 0,
				totalTurns: 0,
				startedAt: undefined,
				thinkingLevel: undefined,
				currentPrompt: undefined,
			},
			sessionStartedAt: Date.now(),
			totalEventCount: 0,
			categoryCounts: {
				session: 0,
				agent: 0,
				turn: 0,
				tool: 0,
				message: 0,
				hook: 0,
				model: 0,
				input: 0,
			},
		};
	}

	private setPhase(phase: AgentPhase): void {
		this.state.agent.phase = phase;
	}

	/** Find the last event of a given type and set its duration */
	private completeEventDuration(eventType: string): void {
		const events = this.state.events;
		for (let i = events.length - 1; i >= 0; i--) {
			if (events[i].eventType === eventType && events[i].duration === undefined) {
				events[i].duration = Date.now() - events[i].timestamp;
				return;
			}
		}
	}
}
