/**
 * Safe file writing utilities
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PlannedWrite } from "../types.js";

export const readTextFile = async (filePath: string): Promise<string | null> => {
	try {
		return await readFile(filePath, "utf8");
	} catch (error) {
		const err = error as NodeJS.ErrnoException;
		if (err.code === "ENOENT") return null;
		throw error;
	}
};

export const writeFileSafe = async (write: PlannedWrite, overwrite: boolean): Promise<void> => {
	const existing = await readTextFile(write.path);
	if (existing && !overwrite && write.action === "create") {
		throw new Error(`File exists: ${write.path}`);
	}
	await mkdir(path.dirname(write.path), { recursive: true });
	await writeFile(write.path, write.content, "utf8");
};

export const applyWrites = async (writes: PlannedWrite[], overwrite: boolean): Promise<void> => {
	for (const write of writes) {
		await writeFileSafe(write, overwrite);
	}
};
