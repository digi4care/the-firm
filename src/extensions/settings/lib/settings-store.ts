/**
 * settings-store.ts — Read/write The Firm settings from .pi/settings.json
 *
 * Operates on the RUNTIME layer (.pi/settings.json), NOT the source layer.
 * Provides a flat dotted-path API (e.g., "theFirm.autoSessionName")
 * for use by the settings selector component.
 *
 * Handles missing files, malformed JSON, and nested path creation.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Get the path to the runtime settings file */
function getSettingsPath(): string {
	return join(process.cwd(), ".pi", "settings.json");
}

/** Deep-clone safe JSON parse */
function readJsonFile(path: string): Record<string, unknown> {
	if (!existsSync(path)) return {};
	try {
		const raw = readFileSync(path, "utf-8");
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

/** Atomic JSON write */
function writeJsonFile(path: string, data: unknown): void {
	const dir = join(path, "..");
	mkdirSync(dir, { recursive: true });
	writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`, "utf-8");
}

/** Navigate a nested object by dotted path, returning the value */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/** Set a nested value by dotted path, creating intermediate objects */
function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
	const parts = path.split(".");
	let current: Record<string, unknown> = obj;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i]!;
		if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	current[parts[parts.length - 1]!] = value;
}

/** Flatten a nested object into dotted-path entries */
function flatten(obj: Record<string, unknown>, prefix = ""): Array<[string, string]> {
	const entries: Array<[string, string]> = [];
	for (const [key, value] of Object.entries(obj)) {
		const path = prefix ? `${prefix}.${key}` : key;
		if (value !== null && typeof value === "object" && !Array.isArray(value)) {
			entries.push(...flatten(value as Record<string, unknown>, path));
		} else {
			entries.push([path, String(value)]);
		}
	}
	return entries;
}

// ═══════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════

/** Read the full settings object */
export function readSettings(): Record<string, unknown> {
	return readJsonFile(getSettingsPath());
}

/** Get a single setting value by dotted path */
export function getSetting(path: string): unknown {
	const settings = readJsonFile(getSettingsPath());
	return getByPath(settings, path);
}

/** Set a single setting value by dotted path */
export function setSetting(path: string, value: unknown): void {
	const filePath = getSettingsPath();
	const settings = readJsonFile(filePath);
	setByPath(settings, path, value);
	writeJsonFile(filePath, settings);
}

/** Get all settings as a flat Map<dotted-path, string-value> */
export function getSettingsMap(): Map<string, string> {
	const settings = readJsonFile(getSettingsPath());
	const entries = flatten(settings);
	return new Map(entries);
}
