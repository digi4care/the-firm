/**
 * Protected paths guard - blocks writes to sensitive files
 */

import type { HookContext, ToolEvent } from "@mariozechner/pi-coding-agent";
import { getSetting } from "../../settings/lib/settings-store.js";
import { BaseGuard } from "../lib/base-guard.js";
import type { GuardResult } from "../lib/types.js";

const PROTECTED_PATTERNS = [
	/\.env($|[._])/, // .env, .env.local, .env.production
	/^node_modules\//,
	/\/node_modules\//,
	/^\.git\//,
	/\/\.git\//,
	/\.key$/, // private keys
	/\.pem$/, // certificates
	/credentials/i,
	/\.htpasswd$/,
	/\.ssh\//,
];

export class ProtectedPathsGuard extends BaseGuard {
	readonly name = "protected-paths-guard";
	readonly toolNames = ["write", "edit"];

	private isEnabled(): boolean {
		const val = getSetting("theFirm.guards.blockProtectedPaths");
		return val !== false; // default true
	}

	async check(event: ToolEvent, ctx: HookContext): Promise<GuardResult | undefined> {
		if (!this.isEnabled()) {
			return this.allow();
		}

		const filePath = (event.input.path as string) ?? "";
		if (!filePath) {
			return this.allow();
		}

		const isProtected = PROTECTED_PATTERNS.some((p) => p.test(filePath));
		if (!isProtected) {
			return this.allow();
		}

		if (!ctx.hasUI) {
			return this.block(`Protected path blocked: ${filePath}`);
		}

		const confirmed = await this.confirm(
			ctx,
			"🛡️ Protected Path",
			`This file is in a protected path:\n\n  ${filePath}\n\nAllow?`,
		);

		if (!confirmed) {
			return this.block(`Blocked by user (protected path: ${filePath})`);
		}

		return this.allow();
	}
}
