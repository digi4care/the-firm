/**
 * The Firm Workflow Settings Extension
 *
 * Links workflow settings to Pi lifecycle events:
 *   - Compaction settings sync (reserveTokens, keepRecentTokens, enabled)
 *   - Handoff: inject context from previous session on startup
 *   - Session shutdown: save basic handoff as safety net
 *   - session_before_compact: DO NOT cancel — let Pi's compaction handle it
 *
 * Key principle: we use session_before_compact only for custom compaction
 * summaries (like OMP's custom-compaction.ts example). We NEVER cancel
 * compaction without providing an alternative — that blocks the session.
 *
 * For handoff at threshold: OMP handles this via its core handoff() method
 * in agent-session.ts. Extensions should NOT try to replicate that.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../settings/lib/settings-store";
import { generateBasicHandoff, wrapHandoffContext } from "./lib/handoff-generator";

// ═══════════════════════════════════════════════════════════════
// Setting helpers
// ═══════════════════════════════════════════════════════════════

function isAutoCompact(): boolean {
	const val = getSetting("theFirm.session.autoCompact");
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
		writeFileSync(piSettingsPath, `${JSON.stringify(piSettings, null, "\t")}\n`, "utf-8");
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
			JSON.stringify(
				{
					closedAt: new Date().toISOString(),
					cwd: process.cwd(),
					...extra,
				},
				null,
				"\t",
			),
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
	let handoffInjected = false;

	// ── Session start: sync settings + prepare handoff injection ──
	pi.on("session_start", async (event, _ctx) => {
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
	// Uses OMP's <handoff-context> wrapper format
	pi.on("before_agent_start", async (event, _ctx) => {
		// Only inject once per session
		if (handoffInjected) return;

		const handoffDoc = readHandoffDoc();
		if (!handoffDoc) return;

		handoffInjected = true;

		// OMP-style wrapper — same format as Pi's core handoff
		const contextMessage = wrapHandoffContext(handoffDoc);

		// Clear the handoff doc so it's not re-consumed
		clearHandoffDoc();

		return {
			systemPrompt: `${event.systemPrompt}\n\n${contextMessage}`,
		};
	});

	// ── Compaction: let Pi handle it, save basic handoff after ──
	// We do NOT cancel compaction. We do NOT try to replace it with
	// our own LLM call (that's what caused the blocking bug).
	// Instead, we save a basic handoff doc as a safety net.
	pi.on("session_before_compact", async (_event, _ctx) => {
		// Always let Pi's compaction run. Return undefined = no override.
		return undefined;
	});

	// ── After compaction: save basic handoff as safety net ──
	pi.on("session_compact", async (_event, ctx) => {
		try {
			const entries = ctx.sessionManager.getEntries();
			if (entries.length < 2) return;

			// Save basic handoff (no LLM call — just file ops + recent messages)
			const basicHandoff = generateBasicHandoff(entries);
			saveHandoffDoc(
				`# Handoff — After Compaction (basic)\n\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
			);
		} catch {
			// Don't break compaction
		}
	});

	// ── Session shutdown: save basic handoff ───────────────
	pi.on("session_shutdown", async (_event, ctx) => {
		const entries = ctx.sessionManager?.getEntries?.();

		// Always generate and save a basic handoff doc
		if (entries && entries.length >= 2) {
			try {
				const basicHandoff = generateBasicHandoff(entries);
				saveHandoffDoc(
					`# Handoff — Session End\n\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
				);
				saveSessionMetadata({ handoffGenerated: true, method: "basic" });
			} catch {
				// Best effort
			}
		} else {
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
