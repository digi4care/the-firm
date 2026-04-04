/**
 * The Firm Workflow Settings Extension
 *
 * Links workflow settings to Pi lifecycle events:
 *   - Compaction settings sync (reserveTokens, keepRecentTokens, enabled)
 *   - Handoff: inject context from previous session on startup
 *   - After compaction: save Pi's compaction summary as handoff
 *   - Session shutdown: save handoff doc for next session
 *
 * Key principle: Pi's own compaction generates excellent structured
 * summaries. We reuse those summaries as handoff documents rather than
 * generating our own from raw session entries.
 *
 * Note on "handoff" strategy: Pi's extension API does not expose
 * newSession() on ExtensionContext (only on ExtensionCommandContext).
 * So we cannot auto-start a new session from compaction events.
 * Instead, the handoff strategy saves Pi's compaction summary and
 * notifies the user to start a new session manually.
 */

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
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

export function getCompactionStrategy(): string {
	const val = getSetting("theFirm.workflows.compactionStrategy");
	return typeof val === "string" ? val : "context-full";
}

export function getThresholdPercent(): number {
	const val = getSetting("theFirm.compaction.thresholdPercent");
	if (typeof val === "number") return val;
	if (typeof val === "string") return Number(val);
	return -1;
}

export function getThresholdTokens(): number {
	const val = getSetting("theFirm.compaction.thresholdTokens");
	if (typeof val === "number") return val;
	if (typeof val === "string") return Number(val);
	return -1;
}

export function isHandoffSaveToDisk(): boolean {
	const val = getSetting("theFirm.compaction.handoffStorage");
	return val === "file";
}

export function isAutoContinue(): boolean {
	const val = getSetting("theFirm.compaction.autoContinue");
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

	// Build The Firm compaction object — custom settings Pi doesn't natively support
	const theFirmCompaction: Record<string, unknown> = {
		strategy: getCompactionStrategy(),
		thresholdPercent: getThresholdPercent(),
		thresholdTokens: getThresholdTokens(),
		handoffStorage: isHandoffSaveToDisk() ? "file" : "inmemory",
		autoContinue: isAutoContinue(),
	};

	piSettings.theFirmCompaction = theFirmCompaction;

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

function ensureHandoffDir(): string {
	const dir = join(process.cwd(), ".pi", "firm", "handoffs");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
}

function getHandoffPath(sessionId?: string): string {
	const dir = ensureHandoffDir();
	if (sessionId) {
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		return join(dir, `handoff-${sessionId.slice(0, 8)}-${ts}.md`);
	}
	return join(dir, "HANDOFF.md");
}

function getLastSessionPath(): string {
	return join(process.cwd(), ".pi", "firm", "last-session.json");
}

function ensureFirmDir(): string {
	const dir = join(process.cwd(), ".pi", "firm");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
}

function saveHandoffDoc(content: string, sessionId?: string): void {
	try {
		writeFileSync(getHandoffPath(sessionId), content, "utf-8");
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

/**
 * Find the most recent handoff doc (supports multi-instance naming).
 * Looks for handoff-*.md files first, falls back to legacy HANDOFF.md.
 */
function findLatestHandoffDoc(): string | null {
	try {
		const handoffDir = ensureHandoffDir();

		const entries = readdirSync(handoffDir)
			.filter((f: string) => f.startsWith("handoff-") && f.endsWith(".md"))
			.sort()
			.reverse(); // newest first (ISO timestamps sort chronologically)

		if (entries.length > 0) {
			const content = readFileSync(join(handoffDir, entries[0]), "utf-8").trim();
			return content || null;
		}

		// Fallback to legacy HANDOFF.md in .pi/firm/
		const legacyPath = join(ensureFirmDir(), "HANDOFF.md");
		if (existsSync(legacyPath)) {
			const content = readFileSync(legacyPath, "utf-8").trim();
			return content || null;
		}

		return null;
	} catch {
		return null;
	}
}

function readHandoffDoc(): string | null {
	return findLatestHandoffDoc();
}

function clearHandoffDoc(): void {
	// Only clear if storage mode is 'inmemory' (default)
	const storage = getSetting("theFirm.compaction.handoffStorage");
	if (storage === "file") return; // keep files on disk

	try {
		const handoffDir = ensureHandoffDir();

		const files = readdirSync(handoffDir).filter(
			(f: string) => f.startsWith("handoff-") || f === "HANDOFF.md",
		);

		for (const f of files) {
			unlinkSync(join(handoffDir, f));
		}
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
	// Note: SessionStartEvent has no `reason` field in Pi's types.
	// The handler always runs; handoff injection is gated by handoffInjected flag.
	let pendingNotifyStrategy = false;

	pi.on("session_start", async (_event, ctx) => {
		// Sync The Firm settings to Pi compaction config
		syncCompactionSettingsToPi();

		// Check for existing handoff document
		const handoffDoc = readHandoffDoc();
		if (handoffDoc) {
			// Mark that we have handoff to inject on first agent turn
			handoffInjected = false;
		}

		// If the handoff strategy was triggered last session, notify user
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

	// ── Compaction: let Pi handle it ──
	// We never cancel compaction. Pi's own summarizer generates excellent
	// structured summaries. We save those as handoff docs after compaction.
	pi.on("session_before_compact", async (_event, _ctx) => {
		// Always let Pi's compaction run. Return undefined = no override.
		return undefined;
	});

	// ── After compaction: save Pi's compaction summary as handoff ──
	// Pi's own compaction generates a structured summary — that's exactly
	// what we want as a handoff document. Much better than our basic handoff
	// which dumps raw session entries.
	pi.on("session_compact", async (event, ctx) => {
		try {
			const sessionId = ctx.sessionManager?.getSessionId?.() || "unknown";

			// Use Pi's own compaction summary (structured, readable)
			// Fallback to basic handoff only if no summary available
			const compactionSummary = event.compactionEntry?.summary;
			const entries = ctx.sessionManager.getEntries();

			let handoffContent: string;
			let method: string;

			if (compactionSummary) {
				handoffContent = `# Handoff — After Compaction\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n${compactionSummary}`;
				method = "compaction-summary";
			} else if (entries.length >= 2) {
				handoffContent = `# Handoff — After Compaction (fallback)\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n${generateBasicHandoff(entries)}`;
				method = "basic-fallback";
			} else {
				return; // Nothing useful to save
			}

			saveHandoffDoc(handoffContent, sessionId);

			// If compactionStrategy is "handoff", notify user
			const strategy = getSetting("theFirm.workflows.compactionStrategy");
			if (strategy === "handoff" && ctx.hasUI) {
				ctx.ui.notify(
					"📋 Context threshold bereikt. Handoff opgeslagen. " +
						"Start een nieuwe sessie (/handoff of Ctrl+D) om verder te gaan met schone context.",
					"info",
				);
			}
		} catch {
			// Don't break compaction
		}
	});

	// ── Session shutdown: save handoff for next session ──
	// Only save if there isn't already a good handoff doc from compaction.
	// Avoids overwriting a structured compaction summary with raw basic handoff.
	pi.on("session_shutdown", async (_event, ctx) => {
		const entries = ctx.sessionManager?.getEntries?.();
		const sessionId = ctx.sessionManager?.getSessionId?.() || "unknown";

		// Check if a handoff was already saved (e.g. by session_compact)
		const existingHandoff = readHandoffDoc();

		if (existingHandoff) {
			// Already have a good handoff — just save metadata
			saveSessionMetadata({ handoffGenerated: true, method: "existing", sessionId });
		} else if (entries && entries.length >= 2) {
			// No handoff yet — generate one as safety net
			try {
				const basicHandoff = generateBasicHandoff(entries);
				saveHandoffDoc(
					`# Handoff — Session End\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n${basicHandoff}`,
					sessionId,
				);
				saveSessionMetadata({ handoffGenerated: true, method: "basic", sessionId });
			} catch {
				// Best effort
			}
		} else {
			saveHandoffDoc(
				`# Handoff — Session End\n\nSession: ${sessionId}\nGenerated: ${new Date().toISOString()}\n\n*Session was empty or had insufficient context for handoff.*`,
				sessionId,
			);
		}

		// Save session state metadata
		if (isSaveOnExit()) {
			saveSessionMetadata();
		}
	});
}
