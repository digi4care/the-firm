/**
 * Types for the guard system
 */

import type { ExtensionAPI, HookContext, ToolEvent } from "@mariozechner/pi-coding-agent";

export interface GuardResult {
	block: boolean;
	reason?: string;
}

export interface Guard {
	readonly name: string;
	readonly toolNames: string[];

	shouldActivate(event: ToolEvent): boolean;
	check(event: ToolEvent, ctx: HookContext, pi: ExtensionAPI): Promise<GuardResult | undefined>;
}

export type GuardConstructor = new (pi: ExtensionAPI) => Guard;
