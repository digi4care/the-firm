/**
 * Settings helpers for workflow settings
 */

import { getSetting } from "../../settings/lib/settings-store.js";

export const isAutoCompact = (): boolean => {
	const val = getSetting("theFirm.session.autoCompact");
	return val !== false;
};

export const getReserveTokens = (): number => {
	const val = getSetting("theFirm.compaction.reserveTokens");
	return typeof val === "number" ? val : 16384;
};

export const getKeepRecentTokens = (): number => {
	const val = getSetting("theFirm.compaction.keepRecentTokens");
	return typeof val === "number" ? val : 20000;
};

export const isSaveOnExit = (): boolean => {
	const val = getSetting("theFirm.session.saveOnExit");
	return val !== false;
};

export const getCompactionStrategy = (): string => {
	const val = getSetting("theFirm.workflows.compactionStrategy");
	return typeof val === "string" ? val : "context-full";
};

export const getThresholdPercent = (): number => {
	const val = getSetting("theFirm.compaction.thresholdPercent");
	if (typeof val === "number") return val;
	if (typeof val === "string") return Number(val);
	return -1;
};

export const getThresholdTokens = (): number => {
	const val = getSetting("theFirm.compaction.thresholdTokens");
	if (typeof val === "number") return val;
	if (typeof val === "string") return Number(val);
	return -1;
};

export const isHandoffSaveToDisk = (): boolean => {
	const val = getSetting("theFirm.compaction.handoffStorage");
	return val === "file";
};

export const isAutoContinue = (): boolean => {
	const val = getSetting("theFirm.compaction.autoContinue");
	return val !== false;
};

export const getEffectiveStrategy = (): string => {
	const userStrategy = getCompactionStrategy();
	if (userStrategy === "handoff") return "off";
	return userStrategy;
};
