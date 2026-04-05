/**
 * Delete guard - protects against destructive delete operations
 */

import type { HookContext, ToolEvent } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../../settings/lib/settings-store.js";
import { BaseGuard } from "../lib/base-guard.js";
import type { GuardResult } from "../lib/types.js";

const DELETE_PATTERNS = [
	/\brm\s+/,
	/\brmdir\b/,
	/\bunlink\b/,
	/\brsync\b.*--delete/,
	/\bgit\s+clean\b/,
	/\bgit\s+reset\s+--hard/,
	/\bgit\s+checkout\s+\./,
];

export class DeleteGuard extends BaseGuard {
	readonly name = "delete-guard";
	readonly toolNames = ["bash"];

	private isEnabled(): boolean {
		const val = getSetting("theFirm.requireConfirmationBeforeDelete");
		return val !== false; // default true
	}

	async check(event: ToolEvent, ctx: HookContext): Promise<GuardResult | undefined> {
		if (!this.isEnabled()) {
			return this.allow();
		}

		const command = event.input.command as string;
		const isDelete = DELETE_PATTERNS.some((p) => p.test(command));

		if (!isDelete) {
			return this.allow();
		}

		if (!ctx.hasUI) {
			return this.block("Delete command blocked (no UI for confirmation)");
		}

		const confirmed = await this.confirm(
			ctx,
			"🗑️ Delete Guard",
			`This command contains a delete operation:\n\n  ${command}\n\nAllow?`,
		);

		if (!confirmed) {
			return this.block("Blocked by user (delete guard)");
		}

		return this.allow();
	}
}
