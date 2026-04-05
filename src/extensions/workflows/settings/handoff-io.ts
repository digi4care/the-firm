/**
 * Handoff document I/O operations
 */

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getSetting } from "../../settings/lib/settings-store.js";

export const ensureHandoffDir = (): string => {
	const dir = join(process.cwd(), ".pi", "firm", "handoffs");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
};

export const getHandoffPath = (sessionId?: string): string => {
	const dir = ensureHandoffDir();
	if (sessionId) {
		const ts = new Date().toISOString().replace(/[:.]/g, "-");
		return join(dir, `handoff-${sessionId.slice(0, 8)}-${ts}.md`);
	}
	return join(dir, "HANDOFF.md");
};

export const getLastSessionPath = (): string => {
	return join(process.cwd(), ".pi", "firm", "last-session.json");
};

export const ensureFirmDir = (): string => {
	const dir = join(process.cwd(), ".pi", "firm");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return dir;
};

export const saveHandoffDoc = (content: string, sessionId?: string): void => {
	try {
		writeFileSync(getHandoffPath(sessionId), content, "utf-8");
	} catch (_error) {}
};

export const saveSessionMetadata = (extra?: Record<string, unknown>): void => {
	try {
		ensureFirmDir();
		writeFileSync(
			getLastSessionPath(),
			JSON.stringify(
				{
					closedAt: new Date().toISOString(),
					cwd: process.cwd(),
					...extra,
				},
				null,
				"\t",
			),
			"utf-8",
		);
	} catch (_error) {}
};

export const findLatestHandoffDoc = (): string | null => {
	try {
		const handoffDir = ensureHandoffDir();

		const entries = readdirSync(handoffDir)
			.filter((f: string) => f.startsWith("handoff-") && f.endsWith(".md"))
			.sort()
			.reverse();

		if (entries.length > 0) {
			const content = readFileSync(join(handoffDir, entries[0]), "utf-8").trim();
			return content || null;
		}

		const legacyPath = join(ensureFirmDir(), "HANDOFF.md");
		if (existsSync(legacyPath)) {
			const content = readFileSync(legacyPath, "utf-8").trim();
			return content || null;
		}

		return null;
	} catch (_error) {
		return null;
	}
};

export const readHandoffDoc = (): string | null => findLatestHandoffDoc();

export const clearHandoffDoc = (): void => {
	const storage = getSetting("theFirm.compaction.handoffStorage");
	if (storage === "file") return;

	try {
		const handoffDir = ensureHandoffDir();
		const files = readdirSync(handoffDir).filter(
			(f: string) => f.startsWith("handoff-") || f === "HANDOFF.md",
		);

		for (const f of files) {
			unlinkSync(join(handoffDir, f));
		}
	} catch (_error) {}
};
