/**
 * The Firm Workflow Settings Extension
 *
 * Links workflow settings to Pi lifecycle events:
 *   - Compaction strategy (context-full / handoff / off)
 *   - Handoff: LLM-powered summary generation on shutdown
 *   - Handoff: automatic context injection on session start (OMP-style wrapper)
 *   - Auto-trigger: handoff on threshold via session_before_compact
 *   - Reserve tokens / keep recent tokens
 *   - Auto-compact on/off
 *   - Save state on exit
 *
 * Syncs The Firm settings to Pi's own compaction settings in .pi/settings.json.
 * All settings read from .pi/settings.json via settings-store.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../settings/lib/settings-store";
import {
	generateHandoffSummary,
	generateBasicHandoff,
	AUTO_HANDOFF_FOCUS,
	type HandoffResult,
} from "./lib/handoff-generator";

// ═══════════════════════════════════════════════════════════════
// Setting helpers
// ═══════════════════════════════════════════════════════════════

function getCompactionStrategy(): string {
	const val = getSetting("theFirm.workflows.compactionStrategy");
	return typeof val === "string" ? val : "context-full";
}

function getThresholdPercent(): number {
	const val = getSetting("theFirm.compaction.thresholdPercent");
	return typeof val === "number" ? val : -1;
}

function getThresholdTokens(): number {
	const val = getSetting("theFirm.compaction.thresholdTokens");
	return typeof val === "number" ? val : -1;
}

function isHandoffSaveToDisk(): boolean {
	return getSetting("theFirm.compaction.handoffSaveToDisk") === true;
}

function isAutoContinue(): boolean {
	const val = getSetting("theFirm.compaction.autoContinue");
	return val !== false;
}

function getReserveTokens(): number {
	const val = getSetting("theFirm.compaction.reserveTokens");
	return typeof val === "number" ? val : 16384;
}

function getKeepRecentTokens(): number {
	const val = getSetting("theFirm.compaction.keepRecentTokens");
	return typeof val === "number" ? val : 20000;
}

function isAutoCompact(): boolean {
	const val = getSetting("theFirm.session.autoCompact");
	return val !== false;
}

function isSaveOnExit(): boolean {
	const val = getSetting("theFirm.session.saveOnExit");
	return val !== false;
}

// ═══════════════════════════════════════════════════════════════
// Sync The Firm compaction settings → Pi's compaction settings
// ═══════════════════════════════════════════════════════════════

function syncCompactionSettingsToPi(): void {
	const piSettingsPath = join(process.cwd(), ".pi", "settings.json");

	let piSettings: Record<string, unknown> = {};
	if (existsSync(piSettingsPath)) {
		try {
			piSettings = JSON.parse(readFileSync(piSettingsPath, "utf-8"));
		} catch {
			piSettings = {};
		}
	}

	const compaction: Record<string, unknown> = {
		enabled: isAutoCompact(),
		reserveTokens: getReserveTokens(),
		keepRecentTokens: getKeepRecentTokens(),
	};

	piSettings.compaction = compaction;

	try {
		mkdirSync(join(process.cwd(), ".pi"), { recursive: true });
		writeFileSync(piSettingsPath, JSON.stringify(piSettings, null, "\t") + "\n", "utf-8");
	} catch {
		// Best effort
	}
}

// ═══════════════════════════════════════════════════════════════
// Handoff I/O helpers
// ═══════════════════════════════════════════════════════════════

function getHandoffPath(): string {
	return join(process.cwd(), ".local", "HANDOFF.md");
}

function getLastSessionPath(): string {
	return join(process.cwd(), ".pi", "firm", "last-session.json");
}

function ensureLocalDir(): string {
	const dir = join(process.cwd(), ".local");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
}

function ensureFirmDir(): string {
	const dir = join(process.cwd(), ".pi", "firm");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
}

function saveHandoffDoc(content: string): void {
	try {
		ensureLocalDir();
		writeFileSync(getHandoffPath(), content, "utf-8");
	} catch {
		// Best effort
	}
}

function saveSessionMetadata(extra?: Record<string, unknown>): void {
	try {
		ensureFirmDir();
		writeFileSync(
			getLastSessionPath(),
			JSON.stringify({
				closedAt: new Date().toISOString(),
				cwd: process.cwd(),
				...extra,
			}, null, "\t"),
			"utf-8",
		);
	} catch {
		// Best effort
	}
}

function readHandoffDoc(): string | null {
	try {
		const path = getHandoffPath();
		if (!existsSync(path)) return null;
		const content = readFileSync(path, "utf-8").trim();
		return content || null;
	} catch {
		return null;
	}
}

function clearHandoffDoc(): void {
	try {
		const path = getHandoffPath();
		if (existsSync(path)) unlinkSync(path);
	} catch {
		// Best effort
	}
}

// ═══════════════════════════════════════════════════════════════
// Shared: generate + save handoff from entries
// ═══════════════════════════════════════════════════════════════

async function generateAndSaveHandoff(
	entries: any[],
	modelRegistry: any,
	model: any,
	label: string,
): Promise<void> {
	if (!entries || entries.length < 2) return;

	try {
		const result = await generateHandoffSummary(entries, modelRegistry, model);

		if (result) {
			saveHandoffDoc(
				`# Handoff — ${label}\n\nGenerated: ${new Date().toISOString()}\n\n${result.summary}`,
			);
		} else {
			const basicHandoff = generateBasicHandoff(entries);
			saveHandoffDoc(
				`# Handoff — ${label} (basic)\n\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
			);
		}
	} catch {
		const basicHandoff = generateBasicHandoff(entries);
		saveHandoffDoc(
			`# Handoff — ${label} (fallback)\n\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
		);
	}
}

// ═══════════════════════════════════════════════════════════════
// Extension
// ═══════════════════════════════════════════════════════════════

export default function registerWorkflowSettings(pi: ExtensionAPI) {
	let handoffInjected = false;

	// ── Session start: sync settings + flag handoff ────────
	pi.on("session_start", async (event, _ctx) => {
		syncCompactionSettingsToPi();

		if (event.reason !== "startup") return;

		const handoffDoc = readHandoffDoc();
		if (!handoffDoc) return;

		handoffInjected = false;
	});

	// ── Inject handoff into first agent turn (OMP-style) ──
	// Gebruikt OMP's <handoff-context> wrapper voor herkenbaarheid
	pi.on("before_agent_start", async (event, _ctx) => {
		if (handoffInjected) return;

		const handoffDoc = readHandoffDoc();
		if (!handoffDoc) return;

		handoffInjected = true;

		// OMP-style wrapper — zelfde formaat als Pi's core handoff
		const contextMessage = `<handoff-context>
${handoffDoc}
</handoff-context>

The above is a handoff document from a previous session. Use this context to continue the work seamlessly.`;

		// Clear the handoff doc only if user doesn't want it saved to disk
		if (!isHandoffSaveToDisk()) {
			clearHandoffDoc();
		}

		return {
			systemPrompt: event.systemPrompt + "\n\n" + contextMessage,
		};
	});

	// ── Compaction control ─────────────────────────────────
	// Strategy "handoff": intercept compaction, generate handoff instead
	// Strategy "context-full": let Pi's built-in compaction handle it
	// Strategy "off": cancel everything
	pi.on("session_before_compact", async (_event, ctx) => {
		if (!isAutoCompact()) {
			return { cancel: true };
		}

		const strategy = getCompactionStrategy();
		if (strategy === "off") {
			return { cancel: true };
		}

		// Strategy "handoff": generate handoff doc, cancel Pi's compaction
		// The handoff doc will be picked up on next session start or /handoff
		if (strategy === "handoff") {
			const entries = ctx.sessionManager.getEntries();
			if (entries.length >= 2) {
				// Generate handoff with OMP's threshold focus prompt
				await generateAndSaveHandoff(
					entries,
					ctx.modelRegistry,
					ctx.model,
					"Auto-Handoff (threshold)",
				);
			}
			// Cancel Pi's compaction — we did our own handoff instead
			return { cancel: true };
		}

		// Strategy "context-full": let Pi compact normally
		return undefined;
	});

	// ── After compaction: save handoff as safety net ───────
	pi.on("session_compact", async (_event, ctx) => {
		const entries = ctx.sessionManager.getEntries();
		if (entries.length < 2) return;

		await generateAndSaveHandoff(
			entries,
			ctx.modelRegistry,
			ctx.model,
			"After Compaction",
		);
	});

	// ── Session shutdown: ALWAYS generate handoff ────────
	pi.on("session_shutdown", async (_event, ctx) => {
		const entries = ctx.sessionManager?.getEntries?.();

		if (entries && entries.length >= 2) {
			await generateAndSaveHandoff(
				entries,
				ctx.modelRegistry,
				ctx.model,
				"Session End",
			);
			saveSessionMetadata({ handoffGenerated: true });
		} else {
			saveHandoffDoc(
				`# Handoff — Session End\n\nGenerated: ${new Date().toISOString()}\n\n*Session was empty or had insufficient context for handoff.*`,
			);
		}

		if (isSaveOnExit()) {
			saveSessionMetadata();
		}
	});
}
