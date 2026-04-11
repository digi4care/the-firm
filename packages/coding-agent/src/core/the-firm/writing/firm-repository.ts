import { copyFile, mkdir, readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { WriteOperation } from "../types/index.js";

const BACKUP_DIR = ".firm.backup";

/**
 * Low-level filesystem operations scoped to a .firm/ root.
 * All public methods accept paths relative to root; paths are
 * resolved and checked for traversal before any I/O.
 */
export class FirmRepository {
	constructor(private root: string) {}

	/** Return the absolute root path. */
	getRoot(): string {
		return this.root;
	}

	/** Resolve a relative path and verify it stays within root. */
	private resolveSafe(relativePath: string): string {
		const resolved = resolve(this.root, relativePath);
		if (!resolved.startsWith(`${this.root}/`) && resolved !== this.root) {
			throw new Error("Path traversal detected");
		}
		return resolved;
	}

	/** Read file content. Returns null if the file does not exist. */
	async read(path: string): Promise<string | null> {
		const abs = this.resolveSafe(path);
		try {
			return await readFile(abs, "utf-8");
		} catch (err: unknown) {
			if (isEnoent(err)) { return null; }
			throw err;
		}
	}

	/** Write content to file, creating parent directories as needed. */
	async write(path: string, content: string): Promise<void> {
		const abs = this.resolveSafe(path);
		await mkdir(dirname(abs), { recursive: true });
		await writeFile(abs, content, "utf-8");
	}

	/** Move (rename) a file. */
	async move(from: string, to: string): Promise<void> {
		const absFrom = this.resolveSafe(from);
		const absTo = this.resolveSafe(to);
		await mkdir(dirname(absTo), { recursive: true });
		await rename(absFrom, absTo);
	}

	/** Delete a file. Throws if the file does not exist. */
	async delete(path: string): Promise<void> {
		const abs = this.resolveSafe(path);
		await unlink(abs);
	}

	/** Check whether a file exists. */
	async exists(path: string): Promise<boolean> {
		const abs = this.resolveSafe(path);
		try {
			await stat(abs);
			return true;
		} catch (err: unknown) {
			if (isEnoent(err)) { return false; }
			throw err;
		}
	}

	/** Recursively list all files under root, returning relative paths.
	 *  Skips the .firm.backup directory. Returns sorted results.
	 *  Returns empty array if root does not exist.
	 */
	async listAllFiles(): Promise<string[]> {
		const files: string[] = [];
		const walk = async (dir: string): Promise<void> => {
			let entries: string[];
			try {
				entries = await readdir(dir);
			} catch (err: unknown) {
				if (isEnoent(err)) { return; }
				throw err;
			}
			for (const entry of entries) {
				const full = join(dir, entry);
				const entryStat = await stat(full);
				if (entryStat.isDirectory()) {
					if (entry !== BACKUP_DIR) {
						await walk(full);
					}
				} else {
					const relative = full.slice(this.root.length + 1);
					files.push(relative);
				}
			}
		};
		await walk(this.root);
		return files.sort();
	}

	/** List .md files in a directory, sorted alphabetically. */
	async list(dir: string): Promise<string[]> {
		return await this.listFiles(dir, ".md");
	}

	/** List files by extension in a directory, sorted alphabetically. */
	async listFiles(dir: string, extension: string): Promise<string[]> {
		const abs = this.resolveSafe(dir);
		let entries: string[];
		try {
			entries = await readdir(abs);
		} catch (err: unknown) {
			if (isEnoent(err)) { return []; }
			throw err;
		}
		return entries.filter((e) => e.endsWith(extension)).sort();
	}

	/**
	 * Create a backup copy at `.firm.backup/<timestamp>/<original-name>.md`.
	 * Returns the backup path (relative to root).
	 * Throws if the source file does not exist.
	 */
	async backup(path: string): Promise<string> {
		const abs = this.resolveSafe(path);
		const timestamp = Date.now().toString();
		const fileName = abs.split("/").pop() ?? "file.md";
		const backupRel = `${BACKUP_DIR}/${timestamp}/${fileName}`;
		const backupAbs = resolve(this.root, backupRel);

		await mkdir(dirname(backupAbs), { recursive: true });
		await copyFile(abs, backupAbs);
		return backupRel;
	}

	/**
	 * Back up (if file exists), then write new content.
	 * Returns a WriteOperation describing what happened.
	 */
	async writeWithBackup(path: string, content: string): Promise<WriteOperation> {
		const fileExists = await this.exists(path);
		let backupPath: string | undefined;

		if (fileExists) {
			backupPath = await this.backup(path);
		}

		await this.write(path, content);

		return {
			action: fileExists ? "update" : "create",
			targetPath: path,
			content,
			backupPath,
		};
	}
}

function isEnoent(err: unknown): boolean {
	return err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT";
}
