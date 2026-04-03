/**
 * Project state management utilities
 *
 * Handles project initialization detection and rollback for cleanup.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

/**
 * Check if a project is already initialized by reading and validating
 * the project.yml file.
 *
 * Bug 3 fix: Instead of just checking file existence, we validate that
 * the file contains valid project config with version: 1 and identity.id.
 * This allows re-initialization if the first run failed after creating
 * a corrupt or empty file.
 */
export function isProjectInitialized(projectFile: string): boolean {
	if (!existsSync(projectFile)) {
		return false;
	}

	try {
		const content = readFileSync(projectFile, "utf-8");

		// Check for empty file
		if (!content.trim()) {
			return false;
		}

		// Simple YAML validation without external library:
		// 1. Must have project: section with version: 1
		// 2. Must have identity: section with id: field

		// Check for version: 1 under project:
		const hasProjectVersion =
			/^project:\s*$/m.test(content) &&
			/^project:\s*\n(?: {2}|\t).*version:\s*1\s*$/m.test(content);

		// Check for identity: section with id: field
		const hasIdentityId =
			/^identity:\s*$/m.test(content) && /^identity:\s*\n(?: {2}|\t).*id:\s*\S+/m.test(content);

		return hasProjectVersion && hasIdentityId;
	} catch {
		// File exists but can't be read (permissions, etc.) - treat as uninitialized
		return false;
	}
}

/**
 * Remove all created paths during rollback.
 *
 * Bug 2 fix: When validation fails after creating directories/files,
 * we need to clean them up so the user can retry without "already initialized" errors.
 */
export function rollbackPaths(paths: string[]): void {
	for (const path of paths) {
		try {
			rmSync(path, { recursive: true, force: true });
		} catch {
			// Silently ignore errors - force: true handles most cases
		}
	}
}

/**
 * Create a directory and track it for potential rollback.
 */
export function createTrackedDir(path: string, tracked: string[]): void {
	mkdirSync(path, { recursive: true });
	tracked.push(path);
}

/**
 * Create a file and track it for potential rollback.
 */
export function createTrackedFile(path: string, content: string, tracked: string[]): void {
	writeFileSync(path, content, "utf-8");
	tracked.push(path);
}
