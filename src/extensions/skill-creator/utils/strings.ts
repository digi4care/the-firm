/**
 * String utilities for skill-creator
 */

export const toKebabCase = (value: string): string =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

export const toTitleCase = (value: string): string =>
	value
		.split("-")
		.filter(Boolean)
		.map((word) => word[0]?.toUpperCase() + word.slice(1))
		.join(" ");

export const normalizeForMatch = (value: string): string =>
	value
		.trim()
		.replace(/^['"]|['"]$/g, "")
		.replace(/[.!?]+$/g, "")
		.toLowerCase();

export const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

export const normalizeFileName = (value: string): string => {
	const base = toKebabCase(value.replace(/\.mdx?$/i, ""));
	return base ? `${base}.md` : "reference.md";
};

export const splitSentences = (text: string): string[] =>
	text
		.split(/(?<=[.!?])\s+/)
		.map((part) => part.trim())
		.filter(Boolean);
