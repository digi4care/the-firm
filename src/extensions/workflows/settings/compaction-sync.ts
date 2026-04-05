/**
 * Sync The Firm compaction settings to Pi's compaction settings
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	getEffectiveStrategy,
	getKeepRecentTokens,
	getReserveTokens,
	getThresholdPercent,
	getThresholdTokens,
	isAutoCompact,
	isAutoContinue,
	isHandoffSaveToDisk,
} from "./settings-helpers.js";

export const syncCompactionSettingsToPi = (): void => {
	const piSettingsPath = join(process.cwd(), ".pi", "settings.json");

	let piSettings: Record<string, unknown> = {};
	if (existsSync(piSettingsPath)) {
		try {
			piSettings = JSON.parse(readFileSync(piSettingsPath, "utf-8"));
		} catch {
			piSettings = {};
		}
	}

	const compaction: Record<string, unknown> = {
		enabled: isAutoCompact(),
		strategy: getEffectiveStrategy(),
		thresholdPercent: getThresholdPercent(),
		thresholdTokens: getThresholdTokens(),
		reserveTokens: getReserveTokens(),
		keepRecentTokens: getKeepRecentTokens(),
		handoffSaveToDisk: isHandoffSaveToDisk(),
		autoContinue: isAutoContinue(),
	};

	piSettings.compaction = compaction;

	try {
		mkdirSync(join(process.cwd(), ".pi"), { recursive: true });
		writeFileSync(piSettingsPath, `${JSON.stringify(piSettings, null, "\t")}\n`, "utf-8");
	} catch (_error) {}
};
