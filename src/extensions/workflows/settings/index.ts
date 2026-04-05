/**
 * The Firm Workflow Settings Extension
 *
 * Links workflow settings to Pi lifecycle events:
 *   - Compaction settings sync (reserveTokens, keepRecentTokens, enabled)
 *   - Handoff: inject context from previous session on startup
 *   - After compaction: save Pi's compaction summary as handoff
 *   - Session shutdown: save handoff doc for next session
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../../settings/lib/settings-store.js";
import { checkContextThreshold, shouldTriggerAutoHandoff } from "../lib/context-monitor.js";
import {
	generateBasicHandoff,
	getAutoHandoffFocus,
	renderHandoffPrompt,
	wrapHandoffContext,
} from "../lib/handoff-generator.js";
import { syncCompactionSettingsToPi } from "./compaction-sync.js";
import {
	clearHandoffDoc,
	readHandoffDoc,
	saveHandoffDoc,
	saveSessionMetadata,
} from "./handoff-io.js";
import { getCompactionStrategy, getThresholdPercent, isSaveOnExit } from "./settings-helpers.js";

// Re-export for backwards compatibility (all helpers used by tests)
export {
	getCompactionStrategy,
	getEffectiveStrategy,
	getKeepRecentTokens,
	getReserveTokens,
	getThresholdPercent,
	getThresholdTokens,
	isAutoCompact,
	isAutoContinue,
	isHandoffSaveToDisk,
	isSaveOnExit,
} from "./settings-helpers.js";

export default function registerWorkflowSettings(pi: ExtensionAPI) {
	let handoffInjected = false;
	let pendingNotifyStrategy = false;
	let handoffInProgress = false;

	// ── Session start: sync settings + prepare handoff injection ──
	pi.on("session_start", async (_event, ctx) => {
		syncCompactionSettingsToPi();

		const handoffDoc = readHandoffDoc();
		if (handoffDoc) {
			handoffInjected = false;
		}

		if (pendingNotifyStrategy) {
			pendingNotifyStrategy = false;
			setTimeout(() => {
				ctx.ui.notify(
					"📋 Handoff context loaded from previous session. Continue where you left off.",
					"info",
				);
			}, 1000);
		}
	});

	// ── Inject handoff into first agent turn ───────────────
	pi.on("before_agent_start", async (event, _ctx) => {
		if (handoffInjected) return;

		const handoffDoc = readHandoffDoc();
		if (!handoffDoc) return;

		handoffInjected = true;

		const contextMessage = wrapHandoffContext(handoffDoc);
		clearHandoffDoc();

		return {
			systemPrompt: `${event.systemPrompt}\n\n${contextMessage}`,
		};
	});

	// ── Compaction: let Pi handle it ──
	pi.on("session_before_compact", async () => {
		return undefined;
	});

	// ── After compaction: save Pi's compaction summary as handoff ──
	pi.on("session_compact", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager?.getSessionId?.() || "unknown";
			const compactionSummary = event.compactionEntry?.summary;
			const entries = ctx.sessionManager.getEntries();

			let handoffContent: string;

			if (compactionSummary) {
				handoffContent = `# Handoff — After Compaction\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n${compactionSummary}`;
			} else if (entries.length >= 2) {
				handoffContent = `# Handoff — After Compaction (fallback)\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n${generateBasicHandoff(entries)}`;
			} else {
				return;
			}

			saveHandoffDoc(handoffContent, sessionId);

			const strategy = getSetting("theFirm.workflows.compactionStrategy");
			if (strategy === "handoff" && ctx.hasUI) {
				ctx.ui.notify(
					"📋 Context threshold bereikt. Handoff opgeslagen. " +
						"Start een nieuwe sessie (/handoff of Ctrl+D) om verder te gaan met schone context.",
					"info",
				);
			}
		} catch (_error) {}
	});

	// ── Session shutdown: save handoff for next session ──
	pi.on("session_shutdown", async (_event, ctx) => {
		const entries = ctx.sessionManager?.getEntries?.();
		const sessionId = ctx.sessionManager?.getSessionId?.() || "unknown";
		const existingHandoff = readHandoffDoc();

		if (existingHandoff) {
			saveSessionMetadata({ handoffGenerated: true, method: "existing", sessionId });
		} else if (entries && entries.length >= 2) {
			try {
				const basicHandoff = generateBasicHandoff(entries);
				saveHandoffDoc(
					`# Handoff — Session End\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
					sessionId,
				);
				saveSessionMetadata({ handoffGenerated: true, method: "basic", sessionId });
			} catch (_error) {}
		} else {
			saveHandoffDoc(
				`# Handoff — Session End\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n*Session was empty or had insufficient context for handoff.*`,
				sessionId,
			);
		}

		if (isSaveOnExit()) {
			saveSessionMetadata();
		}
	});

	// ── Agent end: auto-handoff context threshold detection ──
	pi.on("agent_end", async (_event, ctx) => {
		const strategy = getCompactionStrategy();
		if (strategy !== "handoff") return;
		if (handoffInProgress) return;

		const threshold = getThresholdPercent();
		if (threshold <= 0) return;

		// biome-ignore lint/suspicious/noExplicitAny: Pi SDK doesn't expose getContextUsage type
		const usage = (
			ctx as unknown as { getContextUsage?: () => { percent: number | null } }
		).getContextUsage?.();
		const result = checkContextThreshold(() => usage ?? undefined, threshold);

		if (shouldTriggerAutoHandoff(strategy, result)) {
			handoffInProgress = true;

			try {
				const sessionId = ctx.sessionManager?.getSessionId?.() || "unknown";
				const branch = ctx.sessionManager?.getBranch?.() || [];
				if (branch.length >= 2) {
					const basicHandoff = generateBasicHandoff(branch);
					saveHandoffDoc(basicHandoff, sessionId);
				}

				pi.sendUserMessage(renderHandoffPrompt(getAutoHandoffFocus()));

				ctx.ui?.notify(
					`📋 Context threshold bereikt (${result.percent}%). Handoff wordt gegenereerd...`,
					"info",
				);
			} finally {
				setTimeout(() => {
					handoffInProgress = false;
				}, 30000);
			}
		}
	});
}
