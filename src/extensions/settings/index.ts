/**
 * The Firm Settings Extension
 *
 * Registers /firm command with subcommand routing:
 *   /firm              → settings panel (default)
 *   /firm settings     → same as /firm
 *   /firm handoff      → show handoff status + files
 *   /firm compaction   → show compaction settings
 *   /firm status       → show firm overview
 *
 * Also restores The Firm settings from .pi/settings.json on session start.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AutocompleteItem } from "@mariozechner/pi-tui";
import { getType } from "./lib/settings-schema";
import { createSettingsSelector } from "./lib/settings-selector";
import { getSetting, getSettingsMap, setSetting } from "./lib/settings-store";

// ═══════════════════════════════════════════════════════════════
// Subcommand definitions
// ═══════════════════════════════════════════════════════════════

const SUBCOMMANDS: AutocompleteItem[] = [
	{ value: "settings", label: "Open settings panel" },
	{ value: "handoff", label: "Show handoff status and files" },
	{ value: "compaction", label: "Show compaction settings" },
	{ value: "status", label: "Show firm overview" },
];

// ═══════════════════════════════════════════════════════════════
// Type conversion helper
// ═══════════════════════════════════════════════════════════════

/** Convert a raw string value from the UI to the correct JS type based on schema */
export function parseTypedValue(path: string, rawValue: string): unknown {
	const schemaType = getType(path as any);

	switch (schemaType) {
		case "number":
			return Number(rawValue);
		case "boolean":
			return rawValue === "true";
		default:
			return rawValue;
	}
}

// ═══════════════════════════════════════════════════════════════
// Subcommand handlers
// ═══════════════════════════════════════════════════════════════

function openSettingsPanel(ctx: any): Promise<void> {
	const settings = getSettingsMap();

	return ctx.ui.custom((_tui: any, theme: any, _keybindings: any, done: any) => {
		return createSettingsSelector({
			settings,
			theme,
			onChange: (path: string, newValue: string) => {
				setSetting(path, parseTypedValue(path, newValue));
			},
			onCancel: () => done(undefined),
		});
	});
}

function showHandoffStatus(ctx: any): void {
	const firmDir = join(process.cwd(), ".pi", "firm", "handoffs");

	if (!existsSync(firmDir)) {
		ctx.ui.notify("No handoff directory found (.pi/firm/handoffs/)", "warning");
		return;
	}

	const files = readdirSync(firmDir)
		.filter((f: string) => f.startsWith("handoff-") && f.endsWith(".md"))
		.sort()
		.reverse();

	if (files.length === 0) {
		ctx.ui.notify("No handoff files found", "info");
		return;
	}

	const storage = getSetting("theFirm.compaction.handoffStorage") || "inmemory";

	const lines: string[] = [`📋 Handoff files (${files.length}, storage: ${storage})`, ""];

	for (const f of files.slice(0, 10)) {
		const stat = statSync(join(firmDir, f));
		const size = stat.size > 1024 ? `${(stat.size / 1024).toFixed(1)}KB` : `${stat.size}B`;
		const age = formatAge(stat.mtime);
		lines.push(`  ${f}`);
		lines.push(`    ${size} · ${age}`);
	}

	if (files.length > 10) {
		lines.push(`  ... and ${files.length - 10} more`);
	}

	// Show last-session metadata
	const lastSessionPath = join(process.cwd(), ".pi", "firm", "last-session.json");
	if (existsSync(lastSessionPath)) {
		try {
			const meta = JSON.parse(readFileSync(lastSessionPath, "utf-8"));
			lines.push("");
			lines.push(`Last session closed: ${meta.closedAt || "unknown"}`);
			if (meta.sessionId) lines.push(`Session ID: ${meta.sessionId}`);
			if (meta.handoffGenerated) lines.push(`Handoff generated: ${meta.method || "basic"}`);
		} catch {
			// ignore
		}
	}

	ctx.ui.notify(lines.join("\n"), "info");
}

function showCompactionSettings(ctx: any): void {
	const autoCompact = getSetting("theFirm.session.autoCompact");
	const reserveTokens = getSetting("theFirm.compaction.reserveTokens");
	const keepRecentTokens = getSetting("theFirm.compaction.keepRecentTokens");
	const handoffStorage = getSetting("theFirm.compaction.handoffStorage") || "inmemory";
	const autoContinue = getSetting("theFirm.compaction.autoContinue");
	const strategy = getSetting("theFirm.workflows.compactionStrategy") || "context-full";
	const thresholdPercent = getSetting("theFirm.compaction.thresholdPercent");
	const thresholdTokens = getSetting("theFirm.compaction.thresholdTokens");

	// Also show Pi's native settings if available
	const piSettingsPath = join(process.cwd(), ".pi", "settings.json");
	let piCompaction: Record<string, unknown> | null = null;
	if (existsSync(piSettingsPath)) {
		try {
			const raw = JSON.parse(readFileSync(piSettingsPath, "utf-8"));
			piCompaction = raw.compaction || null;
		} catch {
			// ignore
		}
	}

	const lines: string[] = [
		"⚙️  Compaction Settings",
		"",
		"The Firm overrides:",
		`  autoCompact:       ${autoCompact ?? "true (default)"}`,
		`  strategy:          ${strategy}`,
		`  thresholdPercent:  ${thresholdPercent ?? "-1 (default)"}`,
		`  thresholdTokens:   ${thresholdTokens ?? "-1 (default)"}`,
		`  reserveTokens:     ${reserveTokens ?? "16384 (default)"}`,
		`  keepRecentTokens:  ${keepRecentTokens ?? "20000 (default)"}`,
		`  handoffStorage:    ${handoffStorage}`,
		`  autoContinue:      ${autoContinue ?? "true (default)"}`,
	];

	if (piCompaction) {
		lines.push("");
		lines.push("Pi's .pi/settings.json (synced):");
		lines.push(`  ${JSON.stringify(piCompaction, null, 2).split("\n").join("\n  ")}`);
	}

	// Also show theFirmCompaction block if available
	if (existsSync(piSettingsPath)) {
		try {
			const raw = JSON.parse(readFileSync(piSettingsPath, "utf-8"));
			if (raw.theFirmCompaction) {
				lines.push("");
				lines.push("The Firm compaction (synced to .pi/settings.json):");
				lines.push(`  ${JSON.stringify(raw.theFirmCompaction, null, 2).split("\n").join("\n  ")}`);
			}
		} catch {
			// ignore
		}
	}

	ctx.ui.notify(lines.join("\n"), "info");
}

function showFirmStatus(ctx: any): void {
	const firmDir = join(process.cwd(), ".pi", "firm");
	const hasFirmDir = existsSync(firmDir);

	const lines: string[] = [
		"🏗️  The Firm Status",
		"",
		`Initialized: ${hasFirmDir ? "yes" : "no"}`,
		`Working dir: ${process.cwd()}`,
	];

	if (hasFirmDir) {
		// Count handoff files
		const handoffDir = join(firmDir, "handoffs");
		const handoffCount = existsSync(handoffDir)
			? readdirSync(handoffDir).filter((f: string) => f.startsWith("handoff-")).length
			: 0;
		lines.push(`Handoff files: ${handoffCount}`);

		// Show config
		const configPath = join(firmDir, "config.json");
		if (existsSync(configPath)) {
			try {
				const config = JSON.parse(readFileSync(configPath, "utf-8"));
				lines.push(`Engagement: ${config.engagementType || "unknown"}`);
				if (config.clientName) lines.push(`Client: ${config.clientName}`);
			} catch {
				// ignore
			}
		}

		// Settings summary
		const settings = getSettingsMap();
		const nonDefault = Array.from(settings.entries()).filter(([k, v]) => {
			// Rough check — show all explicitly set settings
			return true;
		});
		if (nonDefault.length > 0) {
			lines.push("");
			lines.push(`Settings: ${nonDefault.length} configured`);
			for (const [key, value] of nonDefault.slice(0, 8)) {
				lines.push(`  ${key}: ${value}`);
			}
			if (nonDefault.length > 8) {
				lines.push(`  ... and ${nonDefault.length - 8} more`);
			}
		}
	}

	ctx.ui.notify(lines.join("\n"), "info");
}

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function formatAge(date: Date): string {
	const now = Date.now();
	const diff = now - date.getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

// ═══════════════════════════════════════════════════════════════
// Extension
// ═══════════════════════════════════════════════════════════════

export default function registerSettingsExtension(pi: ExtensionAPI) {
	// Restore settings on session start
	pi.on("session_start", async (_event, _ctx) => {
		// Settings are read on-demand from .pi/settings.json
	});

	// Register /firm command with subcommand routing
	pi.registerCommand("firm", {
		description: "The Firm: settings, handoff, compaction, status",
		getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
			const filtered = SUBCOMMANDS.filter((s) => s.value.startsWith(prefix));
			return filtered.length > 0 ? filtered : null;
		},
		handler: async (args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("The Firm requires interactive mode", "warning");
				return;
			}

			const subcommand = args.trim().split(/\s+/)[0]?.toLowerCase();

			switch (subcommand) {
				case "":
				case "settings":
					await openSettingsPanel(ctx);
					break;
				case "handoff":
					showHandoffStatus(ctx);
					break;
				case "compaction":
					showCompactionSettings(ctx);
					break;
				case "status":
					showFirmStatus(ctx);
					break;
				default:
					ctx.ui.notify(
						`Unknown section: "${subcommand}". Use: settings, handoff, compaction, status`,
						"warning",
					);
					break;
			}
		},
	});
}
