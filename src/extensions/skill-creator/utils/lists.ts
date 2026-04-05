/**
 * List/array utilities for skill-creator
 */

import { normalizeForMatch } from "./strings.js";

export const normalizeList = (items?: string[]): string[] =>
	(items ?? []).map((item) => item.trim()).filter(Boolean);

export const unique = <T>(items: T[]): T[] => [...new Set(items)];

export const mergeLists = (primary: string[], fallback: string[]): string[] => {
	const merged = [...primary, ...fallback];
	const seen: string[] = [];
	const result: string[] = [];

	for (const item of merged) {
		const normalized = normalizeForMatch(item);
		if (!normalized) continue;

		const overlaps = seen.some(
			(existing) =>
				existing === normalized || existing.includes(normalized) || normalized.includes(existing),
		);
		if (overlaps) continue;

		seen.push(normalized);
		result.push(item.trim().replace(/^['"]|['"]$/g, ""));
	}

	return result;
};

export const toNormalizedItem = (line: string): string =>
	line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim();

export const parseListItems = (body: string): string[] =>
	body
		.split("\n")
		.map((line) => toNormalizedItem(line))
		.filter((line) => !!line && !line.startsWith("<add "));
