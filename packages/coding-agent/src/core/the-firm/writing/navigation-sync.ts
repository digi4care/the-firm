/**
 * NavigationSync — generates navigation.md files for .firm/ subdirectories.
 *
 * Walks the .firm/ tree and creates/updates navigation.md in each directory
 * that contains subdirectories or markdown files.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FirmRepository } from "./firm-repository.js";

export class NavigationSync {
	constructor(private firmRepo: FirmRepository) {}

	/**
	 * Sync navigation.md files across all .firm/ subdirectories.
	 * Returns absolute paths of directories that were created or updated.
	 */
	async syncAll(projectRoot: string): Promise<string[]> {
		const updated: string[] = [];
		const firmDir = join(projectRoot, ".firm");

		if (!existsSync(firmDir)) return updated;

		const walk = (dir: string): void => {
			const entries = readdirSync(dir, { withFileTypes: true });
			const subdirs = entries.filter((e) => e.isDirectory());
			const mdFiles = entries.filter(
				(e) => e.isFile() && e.name.endsWith(".md") && e.name !== "navigation.md",
			);

			if (subdirs.length > 0 || mdFiles.length > 0) {
				const navPath = join(dir, "navigation.md");
				const content = this.generateNav(dir, subdirs, mdFiles);

				if (!existsSync(navPath) || readFileSync(navPath, "utf-8") !== content) {
					writeFileSync(navPath, content, "utf-8");
					updated.push(dir);
				}
			}

			for (const subdir of subdirs) {
				walk(join(dir, subdir.name));
			}
		};

		walk(firmDir);
		return updated;
	}

	/**
	 * Sync navigation.md for a single directory.
	 * Returns true if the file was created or updated.
	 */
	async syncDir(dir: string): Promise<boolean> {
		if (!existsSync(dir)) return false;

		const entries = readdirSync(dir, { withFileTypes: true });
		const subdirs = entries.filter((e) => e.isDirectory());
		const mdFiles = entries.filter(
			(e) => e.isFile() && e.name.endsWith(".md") && e.name !== "navigation.md",
		);

		if (subdirs.length === 0 && mdFiles.length === 0) return false;

		const navPath = join(dir, "navigation.md");
		const content = this.generateNav(dir, subdirs, mdFiles);

		if (existsSync(navPath) && readFileSync(navPath, "utf-8") === content) {
			return false;
		}

		writeFileSync(navPath, content, "utf-8");
		return true;
	}

	private generateNav(
		dir: string,
		subdirs: Array<{ name: string }>,
		mdFiles: Array<{ name: string }>,
	): string {
		const date = new Date().toISOString().split("T")[0];
		const dirName = dir.split("/").pop() || "root";
		const lines: string[] = [
			"---",
			"status: active",
			"owner: auto-generated",
			`created: ${date}`,
			`updated: ${date}`,
			"---",
			"",
			`# ${dirName}/ — Navigation`,
			"",
		];

		if (subdirs.length > 0) {
			lines.push("## Subdirectories");
			lines.push("");
			lines.push("| Directory | Description |");
			lines.push("|-----------|-------------|");
			for (const d of subdirs) {
				lines.push(`| [${d.name}/](${d.name}/navigation.md) | ${d.name} |`);
			}
			lines.push("");
		}

		if (mdFiles.length > 0) {
			lines.push("## Files");
			lines.push("");
			for (const f of mdFiles) {
				const name = f.name.replace(".md", "");
				lines.push(`- [${name}](${f.name})`);
			}
			lines.push("");
		}

		lines.push("---");
		lines.push("*Navigation: [Back to parent](../navigation.md)*");

		return lines.join("\n");
	}
}
