/**
 * debug-overlay.ts — Full debug dashboard as an overlay panel
 *
 * Opened via /debug command. Shows:
 *   - Agent state + model info
 *   - Active tool calls with live duration
 *   - Scrollable event timeline with category filtering
 *
 * Keyboard:
 *   up/down - scroll events
 *   1-8     - toggle category filter
 *   a       - toggle all categories
 *   f       - toggle search/filter mode
 *   q/esc   - close
 */

import { Container, Key, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import {
	bold,
	categoryColor,
	categoryLabel,
	DEBUG_PALETTE,
	dimText,
	fg,
	formatDuration,
	formatTime,
	statusIcon,
} from "../../lib/debug/debug-theme.ts";
import type {
	DashboardState,
	EventCategory,
	EventFilter,
	TrackedEvent,
} from "../../lib/debug/types.ts";

const ALL_CATEGORIES: EventCategory[] = [
	"session",
	"agent",
	"turn",
	"tool",
	"message",
	"hook",
	"model",
	"input",
];

const CATEGORY_KEYS: Record<string, EventCategory> = {
	"1": "session",
	"2": "agent",
	"3": "turn",
	"4": "tool",
	"5": "message",
	"6": "hook",
	"7": "model",
	"8": "input",
};

export class DebugOverlay {
	private selectedIndex = 0;
	private scrollOffset = 0;
	private filter: EventFilter = {
		categories: new Set(ALL_CATEGORIES),
		search: "",
	};
	private filterMode = false;

	constructor(
		private readonly getState: () => DashboardState,
		private readonly onClose: () => void,
	) {}

	public handleInput(data: string, requestRender: () => void): void {
		if (this.filterMode) {
			this.handleFilterInput(data);
			requestRender();
			return;
		}

		if (matchesKey(data, Key.up)) {
			this.selectedIndex = Math.max(0, this.selectedIndex - 1);
			this.ensureVisible();
		} else if (matchesKey(data, Key.down)) {
			const filtered = this.filteredEvents();
			this.selectedIndex = Math.min(filtered.length - 1, this.selectedIndex + 1);
			this.ensureVisible();
		} else if (matchesKey(data, Key.escape) || data === "q") {
			this.onClose();
		} else if (data === "f") {
			this.filterMode = !this.filterMode;
		} else if (data in CATEGORY_KEYS) {
			const cat = CATEGORY_KEYS[data];
			if (this.filter.categories.has(cat)) {
				this.filter.categories.delete(cat);
			} else {
				this.filter.categories.add(cat);
			}
		} else if (data === "a") {
			if (this.filter.categories.size === ALL_CATEGORIES.length) {
				this.filter.categories = new Set();
			} else {
				this.filter.categories = new Set(ALL_CATEGORIES);
			}
		}

		requestRender();
	}

	public render(width: number, height: number): string[] {
		const state = this.getState();
		const P = DEBUG_PALETTE;
		const container = new Container();

		// Header
		const sessionDur = formatDuration(Date.now() - state.sessionStartedAt);
		const title =
			bold(fg(P.session, "DEBUG")) +
			fg(P.dim, " | ") +
			fg(P.text, `events: ${state.totalEventCount}`) +
			fg(P.dim, " | ") +
			fg(P.dim, sessionDur);
		container.addChild(new Text(title, 1, 0));

		// Agent status bar
		const agentParts: string[] = [];
		agentParts.push(statusIcon(state.agent.phase));
		agentParts.push(fg(P.agent, state.agent.phase));
		if (state.agent.model) {
			agentParts.push(fg(P.dim, "|"));
			const shortModel = state.agent.model.split("/").pop() ?? state.agent.model;
			agentParts.push(fg(P.model, shortModel));
		}
		if (state.agent.totalTurns > 0) {
			agentParts.push(fg(P.dim, "|"));
			agentParts.push(fg(P.turn, `turn ${state.agent.turnIndex + 1}/${state.agent.totalTurns}`));
		}
		if (state.agent.startedAt) {
			agentParts.push(fg(P.dim, "|"));
			agentParts.push(fg(P.dim, formatDuration(Date.now() - state.agent.startedAt)));
		}
		container.addChild(new Text(` ${agentParts.join(" ")}`, 0, 0));

		// Active tools
		if (state.activeTools.size > 0) {
			const toolParts: string[] = [fg(P.dim, " tools:")];
			for (const tool of state.activeTools.values()) {
				const icon = statusIcon(tool.status);
				const dur = formatDuration(Date.now() - tool.startedAt);
				toolParts.push(`${icon} ${fg(P.tool, tool.name)} ${fg(P.dim, dur)}`);
			}
			container.addChild(new Text(toolParts.join(" "), 0, 0));
		}

		container.addChild(new Text(fg(P.border, "-".repeat(width)), 0, 0));

		// Event timeline
		const events = this.filteredEvents();
		const maxVisible = Math.max(5, height - 12);
		const start = this.scrollOffset;
		const end = Math.min(start + maxVisible, events.length);

		if (events.length > 0) {
			this.selectedIndex = Math.min(this.selectedIndex, events.length - 1);
		}

		const visible = events.slice(start, end);
		for (let i = 0; i < visible.length; i++) {
			const event = visible[i];
			const isSelected = start + i === this.selectedIndex;
			container.addChild(new Text(this.renderEventRow(event, isSelected, width), 0, 0));
		}

		if (events.length === 0) {
			container.addChild(new Text(fg(P.dim, "  (no events matching filter)"), 0, 0));
		}

		if (events.length > maxVisible) {
			const pct = Math.round((this.scrollOffset / events.length) * 100);
			container.addChild(
				new Text(fg(P.dim, `  showing ${start + 1}-${end} of ${events.length} (${pct}%)`), 0, 0),
			);
		}

		// Category filter bar
		container.addChild(new Text(fg(P.border, "-".repeat(width)), 0, 0));
		const filterParts: string[] = [];
		for (let i = 0; i < ALL_CATEGORIES.length; i++) {
			const cat = ALL_CATEGORIES[i];
			const active = this.filter.categories.has(cat);
			const key = String(i + 1);
			if (active) {
				filterParts.push(`${fg(P.text, key)}:${categoryLabel(cat)}`);
			} else {
				filterParts.push(`${fg(P.dim, key)}:${dimText(cat)}`);
			}
		}
		container.addChild(new Text(` ${filterParts.join(fg(P.dim, " "))}`, 0, 0));

		if (this.filterMode) {
			container.addChild(new Text(fg(P.warning, ` search: ${this.filter.search}_`), 0, 0));
		}

		container.addChild(
			new Text(fg(P.dim, " up/down scroll | 1-8 filter | a toggle all | f search | q close"), 0, 0),
		);

		return container.render(width);
	}

	public invalidate(): void {
		// No cache — always fresh
	}

	// --- Event Row ---

	private renderEventRow(event: TrackedEvent, selected: boolean, width: number): string {
		const P = DEBUG_PALETTE;
		const catColor = categoryColor(event.category);
		const time = formatTime(event.timestamp);
		const duration = event.duration ? fg(P.dim, ` ${formatDuration(event.duration)}`) : "";

		const prefix = selected ? fg(P.text, "> ") : "  ";
		const eventType = fg(catColor, event.eventType.padEnd(28).slice(0, 28));

		return truncateToWidth(
			`${prefix + fg(P.dim, time)} ${eventType} ${fg(P.text, event.label)}${duration}`,
			width,
		);
	}

	// --- Filtering ---

	private filteredEvents(): TrackedEvent[] {
		const { events } = this.getState();
		const { categories, search } = this.filter;

		return events.filter((e) => {
			if (!categories.has(e.category)) return false;
			if (search && !e.label.toLowerCase().includes(search.toLowerCase())) return false;
			return true;
		});
	}

	// --- Scrolling ---

	private ensureVisible(pageSize: number = 15): void {
		if (this.selectedIndex < this.scrollOffset) {
			this.scrollOffset = this.selectedIndex;
		} else if (this.selectedIndex >= this.scrollOffset + pageSize) {
			this.scrollOffset = this.selectedIndex - pageSize + 1;
		}
	}

	// --- Filter Mode Input ---

	private handleFilterInput(data: string): void {
		if (matchesKey(data, Key.escape) || data === "f") {
			this.filterMode = false;
			return;
		}

		if (matchesKey(data, Key.backspace) || matchesKey(data, Key.delete)) {
			this.filter.search = this.filter.search.slice(0, -1);
			return;
		}

		if (data.length === 1 && data.charCodeAt(0) >= 32) {
			this.filter.search += data;
		}
	}
}
