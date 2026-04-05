/**
 * Formatting utilities for skill-creator markdown output
 */

export const formatBulletList = (items: string[], fallback: string): string => {
	const list = items.length ? items : [fallback];
	return list.map((item) => `- ${item}`).join("\n");
};

export const formatNumberedList = (items: string[], fallback: string): string => {
	const list = items.length ? items : [fallback];
	return list.map((item, index) => `${index + 1}. ${item}`).join("\n");
};
