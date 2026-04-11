import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

export interface RuleMetadata {
	name: string;
	alwaysApply: boolean;
	globs: string[];
}

export class RulesRepository {
	constructor(private root: string) {}

	// -- Path safety -------------------------------------------------------

	/**
	 * Resolve a user-supplied path against the repo root and verify it
	 * stays within the root boundary. Throws on path traversal attempts.
	 */
	private sanitizePath(userPath: string): string {
		const normalized = userPath.replace(/\\/g, "/");
		const resolved = resolve(this.root, normalized);
		const rootResolved = resolve(this.root);
		if (!resolved.startsWith(rootResolved)) {
			throw new Error("Path traversal detected");
		}
		return resolved;
	}

	// -- CRUD ---------------------------------------------------------------

	async read(path: string): Promise<string | null> {
		const safe = this.sanitizePath(path);
		try {
			return await readFile(safe, "utf-8");
		} catch {
			return null;
		}
	}

	async write(path: string, content: string): Promise<void> {
		const safe = this.sanitizePath(path);
		await mkdir(resolve(safe, ".."), { recursive: true });
		await writeFile(safe, content, "utf-8");
	}

	async delete(path: string): Promise<void> {
		const safe = this.sanitizePath(path);
		await unlink(safe);
	}

	async exists(path: string): Promise<boolean> {
		const safe = this.sanitizePath(path);
		try {
			const s = await stat(safe);
			return s.isFile();
		} catch {
			return false;
		}
	}

	async list(): Promise<string[]> {
		const rootResolved = resolve(this.root);
		const results: string[] = [];

		const walk = async (dir: string): Promise<void> => {
			let entries: string[];
			try {
				entries = await readdir(dir);
			} catch {
				return;
			}
			for (const name of entries) {
				const full = join(dir, name);
				const s = await stat(full);
				if (s.isDirectory()) {
					await walk(full);
				} else if (name.endsWith(".md")) {
					results.push(full.slice(rootResolved.length + 1));
				}
			}
		};

		await walk(rootResolved);
		return results.sort();
	}

	// -- Metadata -----------------------------------------------------------

	async readMetadata(path: string): Promise<RuleMetadata> {
		const content = await this.read(path);
		if (content === null) {
			throw new Error(`Rule file not found: ${path}`);
		}
		return parseFrontmatter(content);
	}
}

// -- YAML frontmatter parsing -----------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

function parseFrontmatter(content: string): RuleMetadata {
	const match = content.match(FRONTMATTER_RE);
	if (!match) {
		return { name: "", alwaysApply: false, globs: [] };
	}

	const block = match[1];
	const name = extractStringValue(block, "name");
	const alwaysApply = extractBooleanValue(block, "alwaysApply");
	const globs = extractArrayValue(block, "globs");

	return { name, alwaysApply, globs };
}

function extractStringValue(block: string, key: string): string {
	const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
	const m = block.match(re);
	if (!m) {
		return "";
	}
	// Strip optional quotes
	const val = m[1].trim();
	if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
		return val.slice(1, -1);
	}
	return val;
}

function extractBooleanValue(block: string, key: string): boolean {
	const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
	const m = block.match(re);
	if (!m) {
		return false;
	}
	return m[1].trim().toLowerCase() === "true";
}

function extractArrayValue(block: string, key: string): string[] {
	// Format 1: inline array — globs: ["a", "b"]
	const inlineRe = new RegExp(`^${key}:\\s*\\[(.+?)\\]`, "m");
	const inlineM = block.match(inlineRe);
	if (inlineM) {
		return inlineM[1]
			.split(",")
			.map((s) => s.trim())
			.map((s) => {
				if (
					(s.startsWith('"') && s.endsWith('"')) ||
					(s.startsWith("'") && s.endsWith("'"))
				) {
					return s.slice(1, -1);
				}
				return s;
			})
			.filter((s) => s.length > 0);
	}

	// Format 2: YAML list — globs:\n  - "a"\n  - "b"
	const listRe = new RegExp(`^${key}:\\s*$`, "m");
	const listM = block.match(listRe);
	if (listM && listM.index !== undefined) {
		const afterKey = block.slice(listM.index + listM[0].length);
		const items: string[] = [];
		for (const line of afterKey.split("\n")) {
			const trimmed = line.trim();
			if (trimmed === "") { continue; }
			const itemMatch = line.match(/^\s+-\s+(.+)$/);
			if (!itemMatch) { break; }
			let val = itemMatch[1].trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			if (val.length > 0) { items.push(val); }
		}
		return items;
	}

	return [];
}
