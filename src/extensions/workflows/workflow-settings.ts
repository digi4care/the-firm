/**
 * The Firm Workflow Settings Extension
 *
 * Links workflow settings to Pi lifecycle events:
 *   - Compaction strategy (context-full / handoff / off)
 *   - Compaction thresholds (percentage, tokens)
 *   - Handoff save-to-disk
 *   - Auto-continue after compaction
 *   - Reserve tokens / keep recent tokens
 *   - Auto-compact on/off
 *   - Save state on exit
 *
 * Syncs The Firm settings to Pi's own compaction settings in .pi/settings.json.
 * All settings read from .pi/settings.json via settings-store.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting, setSetting } from "../settings/lib/settings-store";

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
	return val === false ? false : true;
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
	return val === false ? false : true;
}

function isSaveOnExit(): boolean {
	const val = getSetting("theFirm.session.saveOnExit");
	return val === false ? false : true;
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

	// Build compaction object from The Firm settings
	const compaction: Record<string, unknown> = {
		enabled: isAutoCompact(),
		strategy: getCompactionStrategy(),
		thresholdPercent: getThresholdPercent(),
		thresholdTokens: getThresholdTokens(),
		reserveTokens: getReserveTokens(),
		keepRecentTokens: getKeepRecentTokens(),
		autoContinue: isAutoContinue(),
	};

	// Merge into Pi settings (don't overwrite other keys)
	piSettings.compaction = compaction;

	try {
		mkdirSync(join(process.cwd(), ".pi"), { recursive: true });
		writeFileSync(piSettingsPath, JSON.stringify(piSettings, null, "\t") + "\n", "utf-8");
	} catch {
		// Best effort
	}
}

// ═══════════════════════════════════════════════════════════════
// Extension
// ═══════════════════════════════════════════════════════════════

export default function registerWorkflowSettings(pi: ExtensionAPI) {
	// Sync settings on session start so Pi picks them up
	pi.on("session_start", async () => {
		syncCompactionSettingsToPi();
	});

	// ── Compaction control ─────────────────────────────────
	pi.on("session_before_compact", async (_event, _ctx) => {
		// autoCompact overrides everything
		if (!isAutoCompact()) {
			return { cancel: true };
		}

		const strategy = getCompactionStrategy();
		if (strategy === "off") {
			return { cancel: true };
		}

		// context-full and handoff let compaction proceed
		// Pi's own compaction.enabled and thresholds are synced via settings.json
		return undefined;
	});

	// ── After compaction: save handoff if configured ───────
	pi.on("session_compact", async (_event, ctx) => {
		if (isHandoffSaveToDisk()) {
			try {
				const cwd = process.cwd();
				const localDir = join(cwd, ".local");
				if (!existsSync(localDir)) {
					mkdirSync(localDir, { recursive: true });
				}

				const entries = ctx.sessionManager.getEntries();
				const messages = entries.filter((e: any) => e.type === "message");

				if (messages.length >= 2) {
					const recentMessages = messages.slice(-10);
					const handoffLines: string[] = [
						"# Handoff — Auto-Saved",
						"",
						`Generated: ${new Date().toISOString()}`,
						"",
						"## Recent Activity",
						"",
					];

					for (const entry of recentMessages) {
						const msg = (entry as any).message;
						if (!msg) continue;

						if (msg.role === "user") {
							const text = typeof msg.content === "string"
								? msg.content
								: msg.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ") ?? "";
							if (text) handoffLines.push(`**User:** ${text.slice(0, 200)}`);
						} else if (msg.role === "assistant") {
							const text = typeof msg.content === "string"
								? msg.content
								: msg.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ") ?? "";
							if (text) handoffLines.push(`**Assistant:** ${text.slice(0, 200)}...`);
						}
					}

					writeFileSync(
						join(localDir, "HANDOFF.md"),
						handoffLines.join("\n"),
						"utf-8",
					);
				}
			} catch {
				// Best effort
			}
		}
	});

	// ── Session shutdown: save state ───────────────────────
	pi.on("session_shutdown", async () => {
		// Save handoff on exit if configured
		if (isHandoffSaveToDisk()) {
			try {
				const cwd = process.cwd();
				const localDir = join(cwd, ".local");
				if (!existsSync(localDir)) {
					mkdirSync(localDir, { recursive: true });
				}

				writeFileSync(
					join(localDir, "HANDOFF.md"),
					`# Handoff — Session End\n\nGenerated: ${new Date().toISOString()}\n`,
					"utf-8",
				);
			} catch {
				// Best effort
			}
		}

		// Save extension state
		if (isSaveOnExit()) {
			try {
				const cwd = process.cwd();
				const firmDir = join(cwd, ".pi", "firm");
				if (!existsSync(firmDir)) {
					mkdirSync(firmDir, { recursive: true });
				}

				writeFileSync(
					join(firmDir, "last-session.json"),
					JSON.stringify({
						closedAt: new Date().toISOString(),
						cwd,
					}, null, "\t"),
					"utf-8",
				);
			} catch {
				// Best effort
			}
		}
	});
}
