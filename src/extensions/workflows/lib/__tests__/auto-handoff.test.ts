/**
 * auto-handoff.test.ts — Tests for context-monitor functions
 *
 * Tests the pure functions that determine whether auto-handoff
 * should be triggered based on context usage and strategy.
 */

import { describe, expect, it } from "bun:test";
import { checkContextThreshold, shouldTriggerAutoHandoff } from "../context-monitor";

// ================================================================
// checkContextThreshold
// ================================================================

describe("checkContextThreshold", () => {
	it("returns shouldTrigger true when percent >= threshold", () => {
		const result = checkContextThreshold(
			() => ({ tokens: 80000, contextWindow: 100000, percent: 80 }),
			70,
		);
		expect(result.shouldTrigger).toBe(true);
		expect(result.percent).toBe(80);
		expect(result.tokens).toBe(80000);
		expect(result.contextWindow).toBe(100000);
	});

	it("returns shouldTrigger true when percent equals threshold exactly", () => {
		const result = checkContextThreshold(
			() => ({ tokens: 70000, contextWindow: 100000, percent: 70 }),
			70,
		);
		expect(result.shouldTrigger).toBe(true);
	});

	it("returns shouldTrigger false when percent < threshold", () => {
		const result = checkContextThreshold(
			() => ({ tokens: 50000, contextWindow: 100000, percent: 50 }),
			70,
		);
		expect(result.shouldTrigger).toBe(false);
		expect(result.percent).toBe(50);
	});

	it("returns shouldTrigger false when usage is undefined", () => {
		const result = checkContextThreshold(() => undefined, 70);
		expect(result.shouldTrigger).toBe(false);
		expect(result.percent).toBeNull();
		expect(result.tokens).toBeNull();
		expect(result.contextWindow).toBe(0);
	});

	it("returns shouldTrigger false when percent is null", () => {
		const result = checkContextThreshold(
			() => ({ tokens: 50000, contextWindow: 100000, percent: null }),
			70,
		);
		expect(result.shouldTrigger).toBe(false);
		expect(result.percent).toBeNull();
		expect(result.tokens).toBe(50000);
		expect(result.contextWindow).toBe(100000);
	});

	it("returns shouldTrigger false when percent is undefined", () => {
		const result = checkContextThreshold(
			() => ({ tokens: 50000, contextWindow: 100000, percent: undefined as any }),
			70,
		);
		expect(result.shouldTrigger).toBe(false);
		expect(result.percent).toBeNull();
	});
});

// ================================================================
// shouldTriggerAutoHandoff
// ================================================================

describe("shouldTriggerAutoHandoff", () => {
	it("returns true only when strategy is 'handoff' and shouldTrigger is true", () => {
		const result = { shouldTrigger: true, percent: 80, tokens: 80000, contextWindow: 100000 };
		expect(shouldTriggerAutoHandoff("handoff", result)).toBe(true);
	});

	it("returns false when strategy is 'off'", () => {
		const result = { shouldTrigger: true, percent: 80, tokens: 80000, contextWindow: 100000 };
		expect(shouldTriggerAutoHandoff("off", result)).toBe(false);
	});

	it("returns false when strategy is 'context-full'", () => {
		const result = { shouldTrigger: true, percent: 80, tokens: 80000, contextWindow: 100000 };
		expect(shouldTriggerAutoHandoff("context-full", result)).toBe(false);
	});

	it("returns false when shouldTrigger is false", () => {
		const result = { shouldTrigger: false, percent: 50, tokens: 50000, contextWindow: 100000 };
		expect(shouldTriggerAutoHandoff("handoff", result)).toBe(false);
	});

	it("returns false when percent is null", () => {
		const result = { shouldTrigger: false, percent: null, tokens: null, contextWindow: 0 };
		expect(shouldTriggerAutoHandoff("handoff", result)).toBe(false);
	});
});
