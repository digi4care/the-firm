/**
 * Tests for shared session I/O
 */

import { describe, expect, it } from "bun:test";
import { calculateSessionStats, formatDuration, type SessionEntry } from "../session-io.js";

describe("formatDuration", () => {
	it("formats milliseconds", () => {
		expect(formatDuration(500)).toBe("500ms");
	});

	it("formats seconds", () => {
		expect(formatDuration(5000)).toBe("5.0s");
	});

	it("formats minutes", () => {
		expect(formatDuration(120000)).toBe("2m 0s");
	});

	it("formats hours", () => {
		expect(formatDuration(7200000)).toBe("2h 0m");
	});

	it("handles zero", () => {
		expect(formatDuration(0)).toBe("0ms");
	});
});

describe("calculateSessionStats", () => {
	it("calculates basic stats", () => {
		const entries: SessionEntry[] = [
			{ id: "1", type: "message", role: "user" },
			{ id: "2", type: "message", role: "assistant" },
		];

		const stats = calculateSessionStats(entries);
		expect(stats.totalEntries).toBe(2);
		expect(stats.userMessages).toBe(1);
		expect(stats.assistantMessages).toBe(1);
	});

	it("counts tool results", () => {
		const entries: SessionEntry[] = [
			{ id: "1", type: "message", role: "user" },
			{ id: "2", type: "message", role: "toolResult" },
		];

		const stats = calculateSessionStats(entries);
		expect(stats.toolResults).toBe(1);
	});

	it("calculates duration from timestamps", () => {
		const entries: SessionEntry[] = [
			{ id: "1", type: "message", timestamp: 1000 },
			{ id: "2", type: "message", timestamp: 5000 },
		];

		const stats = calculateSessionStats(entries);
		expect(stats.durationMs).toBe(4000);
	});

	it("collects unique tools", () => {
		const entries: SessionEntry[] = [
			{ id: "1", type: "message", role: "user", toolName: "read" },
			{ id: "2", type: "message", role: "assistant", toolName: "write" },
			{ id: "3", type: "message", role: "user", toolName: "read" },
		];

		const stats = calculateSessionStats(entries);
		expect(stats.uniqueTools.length).toBe(2);
		expect(stats.uniqueTools).toContain("read");
		expect(stats.uniqueTools).toContain("write");
	});

	it("handles empty entries", () => {
		const stats = calculateSessionStats([]);
		expect(stats.totalEntries).toBe(0);
		expect(stats.durationMs).toBe(0);
	});
});
