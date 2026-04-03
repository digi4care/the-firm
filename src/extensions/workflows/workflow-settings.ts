/**
 * The Firm Workflow Settings Extension
 *
 * Links workflow settings to Pi lifecycle events:
 *   - Compaction strategy (context-full / handoff / off)
 *   - Compaction thresholds (percentage, tokens)
 *   - Handoff: LLM-powered summary generation on shutdown
 *   - Handoff: automatic context injection on session start
 *   - Auto-continue after compaction
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

	// Build compaction object — only sync Pi-native settings
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
// Extension
// ═══════════════════════════════════════════════════════════════

export default function registerWorkflowSettings(pi: ExtensionAPI) {
	// Track whether we've injected handoff already
	let handoffInjected = false;

	// ── Session start: sync settings + inject handoff context ──
	pi.on("session_start", async (event, ctx) => {
		// Sync The Firm settings to Pi compaction config
		syncCompactionSettingsToPi();

		// Only inject handoff context on fresh startup (not resume/fork)
		if (event.reason !== "startup") return;

		// Check for existing handoff document
		const handoffDoc = readHandoffDoc();
		if (!handoffDoc) return;

		// Mark that we have handoff to inject
		handoffInjected = false;
	});

	// ── Inject handoff into first agent turn ───────────────
	pi.on("before_agent_start", async (event, _ctx) => {
		// Only inject once
		if (handoffInjected) return;

		const handoffDoc = readHandoffDoc();
		if (!handoffDoc) return;

		handoffInjected = true;

		const contextMessage = [
			"## 🔄 Handoff from Previous Session",
			"",
			"De vorige sessie heeft context achtergelaten. Lees deze voordat je begint:",
			"",
			handoffDoc,
			"",
			"---",
			"",
		].join("\n");

		// Clear the handoff doc so it's not re-consumed
		clearHandoffDoc();

		return {
			systemPrompt: event.systemPrompt + "\n\n" + contextMessage,
		};
	});

	// ── Compaction control ─────────────────────────────────
	pi.on("session_before_compact", async (_event, _ctx) => {
		if (!isAutoCompact()) {
			return { cancel: true };
		}

		const strategy = getCompactionStrategy();
		if (strategy === "off") {
			return { cancel: true };
		}

		// context-full and handoff both let compaction proceed
		return undefined;
	});

	// ── After compaction: save LLM-generated handoff ───────
	pi.on("session_compact", async (_event, ctx) => {
		const strategy = getCompactionStrategy();

		if (!isHandoffSaveToDisk() && strategy !== "handoff") return;

		try {
			const entries = ctx.sessionManager.getEntries();
			if (entries.length < 2) return;

			const result = await generateHandoffSummary(
				entries,
				ctx.modelRegistry,
				ctx.model,
			);

			if (result) {
				saveHandoffDoc(
					`# Handoff — After Compaction\n\nGenerated: ${new Date().toISOString()}\n\n${result.summary}`,
				);

				if (strategy === "handoff") {
					ctx.ui.notify("📋 Handoff saved to .local/HANDOFF.md", "info");
				}
			} else {
				const basicHandoff = generateBasicHandoff(entries);
				saveHandoffDoc(
					`# Handoff — After Compaction (basic)\n\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
				);
			}
		} catch {
			// Don't break compaction
		}
	});

	// ── Session shutdown: generate and save handoff ────────
	pi.on("session_shutdown", async (_event, ctx) => {
		const entries = ctx.sessionManager?.getEntries?.();

		// Generate and save handoff doc
		if (isHandoffSaveToDisk() && entries && entries.length >= 2) {
			try {
				const result = await generateHandoffSummary(
					entries,
					ctx.modelRegistry,
					ctx.model,
				);

				if (result) {
					saveHandoffDoc(
						`# Handoff — Session End\n\nGenerated: ${new Date().toISOString()}\n\n${result.summary}`,
					);
					saveSessionMetadata({
						handoffGenerated: true,
						tokensUsed: result.tokensUsed,
						readFiles: result.readFiles.length,
						modifiedFiles: result.modifiedFiles.length,
					});
				} else {
					const basicHandoff = generateBasicHandoff(entries);
					saveHandoffDoc(
						`# Handoff — Session End\n\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
					);
					saveSessionMetadata({ handoffGenerated: true, method: "basic" });
				}
			} catch {
				if (entries.length >= 2) {
					const basicHandoff = generateBasicHandoff(entries);
					saveHandoffDoc(
						`# Handoff — Session End\n\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
					);
				}
			}
		} else if (isHandoffSaveToDisk()) {
			saveHandoffDoc(
				`# Handoff — Session End\n\nGenerated: ${new Date().toISOString()}\n\n*Session was empty or had insufficient context for handoff.*`,
			);
		}

		// Save session state metadata
		if (isSaveOnExit()) {
			saveSessionMetadata();
		}
	});
}
