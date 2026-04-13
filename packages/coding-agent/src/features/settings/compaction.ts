/**
 * Compaction settings provider.
 * Context maintenance, compaction strategy, handoff behavior, idle compaction,
 * context promotion, branch summaries, memories, context pruning (DCP).
 *
 * Upstream comparison (oh-my-pi Context tab):
 * ┌───────────────────────────────────────┬──────────┬──────────────────────────────┐
 * │ Setting                               │ Upstream │ The Firm                     │
 * ├───────────────────────────────────────┼──────────┼──────────────────────────────┤
 * │ compaction.enabled                    │ ✓        │ ✓                            │
 * │ compaction.strategy                   │ ✓        │ ✓                            │
 * │ compaction.thresholdPercent           │ ✓ (-1)   │ ✓ (90)                       │
 * │ compaction.thresholdTokens            │ ✓        │ ✓                            │
 * │ compaction.handoffSaveToDisk          │ ✓        │ ✓                            │
 * │ compaction.handoffAutoContinue        │ ✗        │ ✓ (The Firm unique)          │
 * │ compaction.reserveTokens              │ ✗        │ ✓ (The Firm unique)          │
 * │ compaction.keepRecentTokens           │ ✗        │ ✓ (The Firm unique)          │
 * │ compaction.remoteEnabled              │ ✓        │ ✓                            │
 * │ compaction.idleEnabled                │ ✓        │ ✓                            │
 * │ compaction.idleThresholdTokens        │ ✓ (200k) │ ✓ (200k)                     │
 * │ compaction.idleTimeoutSeconds         │ ✓ (300)  │ ✓ (300)                      │
 * │ contextPromotion.enabled              │ ✓        │ ✓                            │
 * │ branchSummary.enabled                 │ ✓        │ ✓                            │
 * │ memories.enabled                      │ ✓        │ ✓                            │
 * │ contextPruning.enabled                │ ✗        │ ✓ (DCP — migrated from ext)  │
 * │ contextPruning.keepRecentCount        │ ✗        │ ✓ (DCP)                      │
 * │ ttsr.enabled                          │ ✓        │ ✓                            │
 * │ ttsr.contextMode                      │ ✓        │ ✓                            │
 * │ ttsr.interruptMode                    │ ✓        │ ✓                            │
 * │ ttsr.repeatMode                       │ ✓        │ ✓                            │
 * │ ttsr.repeatGap                        │ ✓        │ ✓                            │
 * └───────────────────────────────────────┴──────────┴──────────────────────────────┘
 *
 * Conscious divergences:
 * - thresholdPercent default: 90% (The Firm) vs -1 (upstream uses legacy reserve-based)
 * - handoffAutoContinue: The Firm unique — auto-prompt agent after handoff
 * - reserveTokens/keepRecentTokens: The Firm unique — fine-grained token budgets
 * - contextPruning.*: The Firm unique — DCP module migrated from pi-dcp extension
 * - TTSR settings included here for completeness (upstream puts them in Context tab)
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const compactionSettings: SettingsProvider = {
	id: "compaction",
	settings: {
		// ─── Core compaction ───────────────────────────────────────
		"compaction.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "context",
				label: "Auto-Compact",
				description: "Automatically compact context when it gets too large",
			},
		},

		"compaction.strategy": {
			type: "enum",
			values: ["context-full", "handoff", "off"] as const,
			default: "context-full",
			ui: {
				tab: "context",
				label: "Compaction Strategy",
				description: "How to reduce context: summarize in-place or generate handoff and start a new session",
				submenu: true,
			},
		},

		"compaction.thresholdPercent": {
			type: "number",
			default: 90,
			ui: {
				tab: "context",
				label: "Compaction Threshold",
				description: "Percent threshold for context maintenance; default is 90%",
				submenu: true,
			},
		},

		"compaction.thresholdTokens": {
			type: "number",
			default: -1,
			ui: {
				tab: "context",
				label: "Compaction Token Limit",
				description: "Fixed token limit for context maintenance; overrides percentage if set",
				submenu: true,
			},
		},

		// ─── Handoff ───────────────────────────────────────────────
		"compaction.handoffAutoContinue": {
			type: "boolean",
			default: true,
			ui: {
				tab: "context",
				label: "Handoff Auto-Continue",
				description: "After handoff, automatically prompt the agent to continue working in the new session",
			},
		},

		"compaction.handoffSaveToDisk": {
			type: "boolean",
			default: false,
			ui: {
				tab: "context",
				label: "Save Handoff Docs",
				description: "Save generated handoff documents to markdown files",
			},
		},

		// ─── Token budgets (The Firm unique) ───────────────────────
		"compaction.reserveTokens": {
			type: "number",
			default: 16384,
		},

		"compaction.keepRecentTokens": {
			type: "number",
			default: 20000,
		},

		// ─── Remote compaction ─────────────────────────────────────
		"compaction.remoteEnabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "context",
				label: "Remote Compaction",
				description: "Use remote compaction endpoints when available instead of local summarization",
			},
		},

		// ─── Idle compaction ───────────────────────────────────────
		"compaction.idleEnabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "context",
				label: "Idle Compaction",
				description: "Compact context while idle when token count exceeds threshold",
			},
		},

		"compaction.idleThresholdTokens": {
			type: "number",
			default: 200000,
			ui: {
				tab: "context",
				label: "Idle Compaction Threshold",
				description: "Token count above which idle compaction triggers",
				submenu: true,
			},
		},

		"compaction.idleTimeoutSeconds": {
			type: "number",
			default: 300,
			ui: {
				tab: "context",
				label: "Idle Compaction Delay",
				description: "Seconds to wait while idle before compacting",
				submenu: true,
			},
		},

		// ─── Context promotion ─────────────────────────────────────
		"contextPromotion.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "context",
				label: "Auto-Promote Context",
				description: "Promote to a larger-context model on context overflow instead of compacting",
			},
		},

		// ─── Branch summaries ──────────────────────────────────────
		"branchSummary.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "context",
				label: "Branch Summaries",
				description: "Prompt to summarize when leaving a branch",
			},
		},

		// ─── Memories ──────────────────────────────────────────────
		"memories.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "context",
				label: "Memories",
				description: "Enable autonomous memory extraction and consolidation",
			},
		},

		// ─── Context pruning (DCP — migrated from pi-dcp) ──────────
		"contextPruning.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "context",
				label: "Context Pruning",
				description: "Enable dynamic context pruning (DCP) before compaction to remove redundant messages",
			},
		},

		"contextPruning.keepRecentCount": {
			type: "number",
			default: 4,
			ui: {
				tab: "context",
				label: "Pruning Keep Recent",
				description: "Always keep the last N messages when pruning context",
				submenu: true,
			},
		},

		// ─── TTSR (Time Traveling Stream Rules) ────────────────────
		"ttsr.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "context",
				label: "TTSR",
				description: "Time Traveling Stream Rules: interrupt agent when output matches patterns",
			},
		},

		"ttsr.contextMode": {
			type: "enum",
			values: ["discard", "keep"] as const,
			default: "discard",
			ui: {
				tab: "context",
				label: "TTSR Context Mode",
				description: "What to do with partial output when TTSR triggers",
			},
		},

		"ttsr.interruptMode": {
			type: "enum",
			values: ["always", "end"] as const,
			default: "always",
			ui: {
				tab: "context",
				label: "TTSR Interrupt Mode",
				description: "When to interrupt mid-stream vs inject warning after completion",
				submenu: true,
			},
		},

		"ttsr.repeatMode": {
			type: "enum",
			values: ["once", "gap"] as const,
			default: "once",
			ui: {
				tab: "context",
				label: "TTSR Repeat Mode",
				description: "How rules can repeat: once per session or after a message gap",
			},
		},

		"ttsr.repeatGap": {
			type: "number",
			default: 10,
			ui: {
				tab: "context",
				label: "TTSR Repeat Gap",
				description: "Messages before a rule can trigger again",
				submenu: true,
			},
		},
	},
	options: {
		"compaction.strategy": [
			{
				value: "context-full",
				label: "Context-full",
				description: "Summarize in-place and keep the current session",
			},
			{ value: "handoff", label: "Handoff", description: "Generate handoff and continue in a new session" },
			{ value: "off", label: "Off", description: "Disable automatic context maintenance" },
		],
		"compaction.thresholdPercent": [
			{ value: 30, label: "30% — Very early", description: "Handoff early; safest for long sessions" },
			{ value: 35, label: "35% — Early", description: "Conservative threshold for large tasks" },
			{ value: 40, label: "40% — Moderately early", description: "Plenty of headroom for context growth" },
			{ value: 45, label: "45% — Cautious", description: "Safe balance for complex work" },
			{ value: 50, label: "50% — Halfway", description: "Compact when half the window is used" },
			{ value: 55, label: "55% — Moderate", description: "Predictable mid-point threshold" },
			{ value: 60, label: "60% — Comfortable", description: "Good room for conversation bursts" },
			{ value: 65, label: "65% — Relaxed", description: "Lets sessions grow before handoff" },
			{ value: 70, label: "70% — Balanced", description: "Typical balance of space and safety" },
			{ value: 75, label: "75% — Slightly aggressive", description: "Prefer keeping context over headroom" },
			{ value: 80, label: "80% — Aggressive", description: "Use most of the window before handoff" },
			{ value: 85, label: "85% — Very aggressive", description: "Push context usage close to the limit" },
			{
				value: 90,
				label: "90% — Near limit (default)",
				description: "Default: handoff when context is nearly full",
			},
			{ value: 95, label: "95% — Maximum", description: "Wait until the very edge of the window" },
		],
	},
};
