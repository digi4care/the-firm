/**
 * Registry management for reference documents
 */

import type { Registry, RegistryEntry } from "../types.js";
import { toKebabCase, toTitleCase } from "../utils/strings.js";

export const buildRegistryEntry = (filename: string, timestamp: string): RegistryEntry => {
	const id = toKebabCase(filename.replace(/\.mdx?$/i, ""));
	return {
		id,
		title: toTitleCase(id),
		filename,
		category: "custom",
		description: `Reference for ${toTitleCase(id)}.`,
		keywords: [id],
		topics: ["references"],
		language: "en",
		created: timestamp,
		last_updated: timestamp,
	};
};

export const buildRegistry = (entries: RegistryEntry[]): Registry => {
	const timestamp = new Date().toISOString();
	return {
		version: "1.0.0",
		created: timestamp,
		last_updated: timestamp,
		registry_type: "reference_documents",
		entries,
	};
};

export const mergeRegistryEntries = (
	existing: {
		version?: string;
		created?: string;
		entries?: RegistryEntry[];
	} | null,
	references: string[],
): Registry => {
	const timestamp = new Date().toISOString();
	const entries = existing?.entries ? [...existing.entries] : [];
	const entryMap = new Map(entries.map((entry) => [entry.filename, entry]));

	for (const reference of references) {
		const entry = buildRegistryEntry(reference, timestamp);
		const current = entryMap.get(reference);
		if (current) {
			entryMap.set(reference, {
				...current,
				...entry,
				created: current.created || entry.created,
			});
		} else {
			entryMap.set(reference, entry);
		}
	}

	return {
		version: existing?.version ?? "1.0.0",
		created: existing?.created ?? timestamp,
		last_updated: timestamp,
		registry_type: "reference_documents",
		entries: Array.from(entryMap.values()),
	};
};
