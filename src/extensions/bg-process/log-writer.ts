/**
 * Log file I/O for background processes
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

export const writeLog = (logFile: string, content: string): void => {
	try {
		writeFileSync(logFile, content, "utf-8");
	} catch {
		// Ignore write errors
	}
};

export const appendLog = (logFile: string, content: string): void => {
	try {
		appendFileSync(logFile, content, "utf-8");
	} catch {
		// Ignore append errors
	}
};

export const readLog = (logFile: string, maxChars = 5000): string | null => {
	if (!existsSync(logFile)) return null;

	try {
		const content = readFileSync(logFile, "utf-8");
		if (content.length <= maxChars) return content;
		return `[...truncated, showing last ${maxChars} chars]\n${content.slice(-maxChars)}`;
	} catch {
		return null;
	}
};

export const readLogTail = (logFile: string, chars = 3000): string | null => {
	if (!existsSync(logFile)) return null;

	try {
		const content = readFileSync(logFile, "utf-8");
		if (content.length <= chars) return content;
		return `[...truncated]\n${content.slice(-chars)}`;
	} catch {
		return null;
	}
};
