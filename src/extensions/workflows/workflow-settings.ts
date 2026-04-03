/**
 * The Firm Workflow Settings Extension
 *
 * Links workflow settings to Pi lifecycle events:
 *   - theFirm.workflows.autoSaveHandoff: save handoff on session shutdown
 *   - theFirm.workflows.compactionStrategy: control compaction behavior
 *   - theFirm.session.autoCompact: enable/disable auto-compaction
 *   - theFirm.session.saveOnExit: persist extension state on shutdown
 *
 * All settings read from .pi/settings.json via settings-store.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../settings/lib/settings-store";

// ═══════════════════════════════════════════════════════════════
// Setting helpers
// ═══════════════════════════════════════════════════════════════

function isAutoSaveHandoff(): boolean {
	return getSetting("theFirm.workflows.autoSaveHandoff") === true; // default false
}

function getCompactionStrategy(): string {
	const val = getSetting("theFirm.workflows.compactionStrategy");
	return typeof val === "string" ? val : "context-full"; // default context-full
}

function isAutoCompact(): boolean {
	const val = getSetting("theFirm.session.autoCompact");
	return val === false ? false : true; // default true
}

function isSaveOnExit(): boolean {
	const val = getSetting("theFirm.session.saveOnExit");
	return val === false ? false : true; // default true
}

// ═══════════════════════════════════════════════════════════════
// Extension
// ═══════════════════════════════════════════════════════════════

export default function registerWorkflowSettings(pi: ExtensionAPI) {
	// ── Compaction control ─────────────────────────────────
	pi.on("session_before_compact", async (_event, _ctx) => {
		// autoCompact overrides everything
		if (!isAutoCompact()) {
			return { cancel: true };
		}

		// compactionStrategy controls how
		const strategy = getCompactionStrategy();
		if (strategy === "off") {
			return { cancel: true };
		}

		// "context-full" and "handoff" let compaction proceed for now
		// handoff strategy could be expanded later to trigger /handoff instead
		return undefined;
	});

	// ── Session shutdown: auto-save handoff + state ────────
	pi.on("session_shutdown", async (_event, ctx) => {
		const cwd = process.cwd();
		const localDir = join(cwd, ".local");

		// Auto-save handoff document
		if (isAutoSaveHandoff()) {
			try {
				const entries = ctx.sessionManager.getEntries();
				const messages = entries.filter((e: any) => e.type === "message");

				if (messages.length >= 2) {
					// Build a simple handoff from recent messages
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
							if (text) {
								handoffLines.push(`**User:** ${text.slice(0, 200)}`);
							}
						} else if (msg.role === "assistant") {
							const text = typeof msg.content === "string"
								? msg.content
								: msg.content?.filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ") ?? "";
							if (text) {
								handoffLines.push(`**Assistant:** ${text.slice(0, 200)}...`);
							}
						}
					}

					if (!existsSync(localDir)) {
						mkdirSync(localDir, { recursive: true });
					}

					writeFileSync(
						join(localDir, "HANDOFF.md"),
						handoffLines.join("\n"),
						"utf-8",
					);
				}
			} catch {
				// Best effort — don't crash on shutdown
			}
		}

		// Save extension state
		if (isSaveOnExit()) {
			try {
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
