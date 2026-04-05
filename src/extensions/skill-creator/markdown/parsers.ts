/**
 * Parsers for SKILL.md content
 */

import type { Tests } from "../types.js";
import { toNormalizedItem } from "../utils/lists.js";
import { escapeRegExp } from "../utils/strings.js";

export const parseWhenToUseBody = (body: string): { use: string[]; avoid: string[] } => {
	const lines = body.split("\n");
	let mode: "use" | "avoid" | null = null;
	const use: string[] = [];
	const avoid: string[] = [];

	for (const line of lines) {
		if (/^\s*use me when:/i.test(line)) {
			mode = "use";
			continue;
		}
		if (/^\s*do not use me for:/i.test(line)) {
			mode = "avoid";
			continue;
		}

		const item = toNormalizedItem(line);
		if (!item || item.startsWith("<add ")) continue;
		if (mode === "use") use.push(item);
		if (mode === "avoid") avoid.push(item);
	}

	return { use, avoid };
};

export const parseQuickTestsBody = (body: string): Tests => {
	const lines = body.split("\n");
	let mode: "trigger" | "not" | "functional" | null = null;
	const tests: Tests = {
		shouldTrigger: [],
		shouldNotTrigger: [],
		functional: [],
	};

	for (const line of lines) {
		if (/^\s*should trigger:/i.test(line)) {
			mode = "trigger";
			continue;
		}
		if (/^\s*should not trigger:/i.test(line)) {
			mode = "not";
			continue;
		}
		if (/^\s*functional:/i.test(line)) {
			mode = "functional";
			continue;
		}

		const item = toNormalizedItem(line);
		if (!item || item.startsWith("<add ")) continue;
		if (mode === "trigger") tests.shouldTrigger.push(item);
		if (mode === "not") tests.shouldNotTrigger.push(item);
		if (mode === "functional") tests.functional.push(item);
	}

	return tests;
};

export const parseReferenceItems = (body: string): string[] => {
	const matches = body.match(/`references\/([^`]+)`/g) ?? [];
	return matches
		.map((match) =>
			match
				.replace(/`references\//, "")
				.replace(/`$/, "")
				.trim(),
		)
		.filter(Boolean);
};

export const getSectionBody = (content: string, title: string): string | null => {
	const headingPattern = new RegExp(`(^|\\n)##\\s+${escapeRegExp(title)}\\b`, "i");
	const heading = headingPattern.exec(content);
	if (!heading) return null;

	const start = heading.index + heading[0].length;
	const nextHeadingPattern = /\n##\s+/g;
	nextHeadingPattern.lastIndex = start;
	const nextHeading = nextHeadingPattern.exec(content);
	const end = nextHeading ? nextHeading.index : content.length;
	return content.slice(start, end).trim();
};

export const hasSection = (content: string, title: string): boolean => {
	const pattern = new RegExp(`(^|\\n)##\\s+${escapeRegExp(title)}\\b`, "i");
	return pattern.test(content);
};
