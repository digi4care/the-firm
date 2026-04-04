/**
 * context-monitor.ts — Context threshold detection for auto-handoff
 *
 * Pure functions that determine whether auto-handoff should be triggered
 * based on context usage and the configured compaction strategy.
 */

export interface ContextCheckResult {
	shouldTrigger: boolean;
	percent: number | null;
	tokens: number | null;
	contextWindow: number;
}

/**
 * Check if context usage exceeds the given threshold percentage.
 */
export function checkContextThreshold(
	getContextUsage: () =>
		| { tokens: number | null; contextWindow: number; percent: number | null }
		| undefined,
	thresholdPercent: number,
): ContextCheckResult {
	const usage = getContextUsage();
	if (!usage) {
		return { shouldTrigger: false, percent: null, tokens: null, contextWindow: 0 };
	}
	if (usage.percent === null || usage.percent === undefined) {
		return {
			shouldTrigger: false,
			percent: null,
			tokens: usage.tokens,
			contextWindow: usage.contextWindow,
		};
	}
	return {
		shouldTrigger: usage.percent >= thresholdPercent,
		percent: usage.percent,
		tokens: usage.tokens,
		contextWindow: usage.contextWindow,
	};
}

/**
 * Determine if auto-handoff should be triggered based on strategy and context check.
 * Only strategy "handoff" combined with shouldTrigger=true will result in true.
 */
export function shouldTriggerAutoHandoff(
	strategy: string,
	contextResult: ContextCheckResult,
): boolean {
	if (strategy !== "handoff") return false;
	return contextResult.shouldTrigger;
}
