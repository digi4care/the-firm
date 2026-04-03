/**
 * tf-delete-guard — Enforces requireConfirmationBeforeDelete from settings.json
 *
 * Intercepts bash commands containing destructive operations (rm, unlink, rmdir,
 * rsync --delete, git clean, git reset --hard) and prompts for confirmation
 * before allowing them through.
 *
 * Controlled by src/settings.json → theFirm.requireConfirmationBeforeDelete
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const DELETE_PATTERNS = [
	/\brm\s+/,
	/\brmdir\b/,
	/\bunlink\b/,
	/\brsync\b.*--delete/,
	/\bgit\s+clean\b/,
	/\bgit\s+reset\s+--hard/,
	/\bgit\s+checkout\s+\./,
];

interface TheFirmSettings {
	theFirm?: {
		requireConfirmationBeforeDelete?: boolean;
	};
}

function isDeleteGuardEnabled(): boolean {
	// Check runtime (.pi/settings.json) first, then source (src/settings.json)
	const paths = [
		join(process.cwd(), ".pi", "settings.json"),
		join(process.cwd(), "src", "settings.json"),
	];

	for (const settingsPath of paths) {
		if (existsSync(settingsPath)) {
			try {
				const raw = readFileSync(settingsPath, "utf-8");
				const settings: TheFirmSettings = JSON.parse(raw);
				if (settings.theFirm?.requireConfirmationBeforeDelete === true) {
					return true;
				}
			} catch {
				// Malformed settings — skip
			}
		}
	}

	return false;
}

export default function register(pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;
		if (!isDeleteGuardEnabled()) return undefined;

		const command = event.input.command as string;
		const isDelete = DELETE_PATTERNS.some((p) => p.test(command));

		if (!isDelete) return undefined;

		if (!ctx.hasUI) {
			return { block: true, reason: "Delete command blocked (no UI for confirmation)" };
		}

		const confirmed = await ctx.ui.confirm(
			"🗑️ Delete Guard",
			`This command contains a delete operation:\n\n  ${command}\n\nAllow?`,
		);

		if (!confirmed) {
			return { block: true, reason: "Blocked by user (delete guard)" };
		}

		return undefined;
	});
}
