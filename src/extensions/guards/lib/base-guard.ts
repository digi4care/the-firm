/**
 * Base guard implementation with common functionality
 */

import type { ExtensionAPI, HookContext, ToolEvent } from "@mariozechner/pi-coding-agent";
import type { Guard, GuardResult } from "./types.js";

export abstract class BaseGuard implements Guard {
	abstract readonly name: string;
	abstract readonly toolNames: string[];

	constructor(protected pi: ExtensionAPI) {}

	shouldActivate(event: ToolEvent): boolean {
		return this.toolNames.includes(event.toolName);
	}

	abstract check(
		event: ToolEvent,
		ctx: HookContext,
		pi: ExtensionAPI,
	): Promise<GuardResult | undefined>;

	protected async confirm(ctx: HookContext, title: string, message: string): Promise<boolean> {
		return ctx.ui.confirm(title, message);
	}

	protected block(reason: string): GuardResult {
		return { block: true, reason };
	}

	protected allow(): undefined {
		return undefined;
	}
}
