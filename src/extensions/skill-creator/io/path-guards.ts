/**
 * Path validation utilities for safe file operations
 */

import path from "node:path";

export const ensureWithinRoot = (root: string, target: string): string => {
	if (path.isAbsolute(target)) {
		throw new Error(`Absolute paths are not allowed: ${target}`);
	}
	const resolvedRoot = path.resolve(root);
	const resolvedTarget = path.resolve(root, target);
	if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)) {
		throw new Error(`Path must be inside project root: ${target}`);
	}
	return resolvedTarget;
};
