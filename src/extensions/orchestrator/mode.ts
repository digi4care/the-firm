/**
 * Mode detection for Andre (orchestrator)
 *
 * Reads The Firm state from .pi/firm/config.json:
 *   - firmState: "active" → firm mode (route to departments)
 *   - firmState: "paused" | missing | no config → ad-hoc mode
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type FirmMode = "firm" | "ad-hoc";

export interface FirmStateResult {
	/** Which mode Andre operates in */
	mode: FirmMode;
	/** Whether .pi/firm/config.json exists (even if corrupt) */
	hasFirm: boolean;
	/** Raw firmState value from config */
	rawState: string | undefined;
}

/**
 * Determine Andre's operating mode based on The Firm config.
 */
export function getFirmState(cwd: string): FirmStateResult {
	const configPath = join(cwd, ".pi", "firm", "config.json");
	if (!existsSync(configPath)) {
		return { mode: "ad-hoc", hasFirm: false, rawState: undefined };
	}

	let raw: Record<string, unknown>;
	try {
		raw = JSON.parse(readFileSync(configPath, "utf-8"));
	} catch {
		return { mode: "ad-hoc", hasFirm: false, rawState: undefined };
	}

	const firmState = raw.firmState as string | undefined;
	const mode: FirmMode = firmState === "active" ? "firm" : "ad-hoc";

	return { mode, hasFirm: true, rawState: firmState };
}

/**
 * Write firmState to The Firm config. Creates file and directories if needed.
 * Preserves existing fields. Overwrites corrupt config.
 */
export function setFirmState(cwd: string, state: "active" | "paused"): void {
	const dir = join(cwd, ".pi", "firm");
	const configPath = join(dir, "config.json");

	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	let config: Record<string, unknown> = {};
	if (existsSync(configPath)) {
		try {
			config = JSON.parse(readFileSync(configPath, "utf-8"));
		} catch {
			config = {};
		}
	}

	config.firmState = state;
	writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`, "utf-8");
}
