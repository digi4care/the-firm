/**
 * Frontmatter utilities for SKILL.md
 */

import { mergeLists, splitSentences } from "../utils/lists.js";

export const updateFrontmatter = (
	content: string,
	description?: string,
	_version?: string,
): { content: string; warnings: string[] } => {
	const match = content.match(/^---\n([\s\S]*?)\n---\n/);
	if (!match) {
		return { content, warnings: ["missing_frontmatter"] };
	}

	const lines = match[1].split("\n");
	let updatedDescription = false;

	const updated = lines.map((line) => {
		if (description && line.startsWith("description:")) {
			updatedDescription = true;
			const existingDescription = line.replace(/^description:\s*/, "").trim();
			const mergedDescription = mergeDescription(existingDescription, description);
			return `description: ${mergedDescription}`;
		}
		return line;
	});

	if (description && !updatedDescription) {
		const nameIndex = updated.findIndex((line) => line.startsWith("name:"));
		const insertAt = nameIndex >= 0 ? nameIndex + 1 : 0;
		updated.splice(insertAt, 0, `description: ${description}`);
	}

	const frontmatter = updated.join("\n");
	const rebuilt = `---\n${frontmatter}\n---\n${content.slice(match[0].length)}`;
	return { content: rebuilt, warnings: [] };
};

export const mergeDescription = (existing: string, incoming: string): string => {
	if (!incoming.trim()) return existing;
	if (!existing.trim()) return incoming;

	const existingHasPolicy =
		/use when/i.test(existing) && /do not trigger|do not use/i.test(existing);
	const incomingHasPolicy =
		/use when/i.test(incoming) && /do not trigger|do not use/i.test(incoming);

	if (existingHasPolicy && !incomingHasPolicy) {
		return existing;
	}

	const merged = mergeLists(splitSentences(existing), splitSentences(incoming));
	return merged.join(" ").trim();
};
