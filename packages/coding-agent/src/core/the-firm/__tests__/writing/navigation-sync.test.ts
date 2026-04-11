import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FirmRepository } from "../../writing/firm-repository.ts";
import { NavigationSync } from "../../writing/navigation-sync.ts";

/** Create a temp .firm/ structure with some markdown files. */
async function makeFirmRoot(): Promise<{
	root: string;
	firmDir: string;
	repo: FirmRepository;
	sync: NavigationSync;
}> {
	const root = join(tmpdir(), `nav-sync-test-${Date.now()}`);
	const firmDir = join(root, ".firm");
	await mkdir(firmDir, { recursive: true });

	const repo = new FirmRepository(firmDir);
	const sync = new NavigationSync(repo);

	return { root, firmDir, repo, sync };
}

async function cleanup(root: string): Promise<void> {
	await rm(root, { recursive: true, force: true });
}

describe("NavigationSync", () => {
	describe("syncDir", () => {
		it("creates navigation.md for a directory with markdown files", async () => {
			const { root, firmDir, sync } = await makeFirmRoot();
			try {
				const conceptsDir = join(firmDir, "concepts");
				await mkdir(conceptsDir, { recursive: true });
				await writeFile(
					join(conceptsDir, "my-concept.md"),
					"---\nstatus: active\n---\n# My Concept\nSome description here.\n"
				);

				const updated = await sync.syncDir(conceptsDir);

				expect(updated).toBe(true);
				expect(existsSync(join(conceptsDir, "navigation.md"))).toBe(true);
			} finally {
				await cleanup(root);
			}
		});

		it("skips an empty directory", async () => {
			const { root, firmDir, sync } = await makeFirmRoot();
			try {
				const emptyDir = join(firmDir, "empty");
				await mkdir(emptyDir, { recursive: true });

				const updated = await sync.syncDir(emptyDir);

				expect(updated).toBe(false);
				expect(existsSync(join(emptyDir, "navigation.md"))).toBe(false);
			} finally {
				await cleanup(root);
			}
		});

		it("returns false when content unchanged on second sync", async () => {
			const { root, firmDir, sync } = await makeFirmRoot();
			try {
				const conceptsDir = join(firmDir, "concepts");
				await mkdir(conceptsDir, { recursive: true });
				await writeFile(
					join(conceptsDir, "topic.md"),
					"---\nstatus: active\n---\n# Topic\nA topic.\n"
				);

				// First sync creates the file
				const first = await sync.syncDir(conceptsDir);
				expect(first).toBe(true);

				// Second sync with identical content should skip
				const second = await sync.syncDir(conceptsDir);
				expect(second).toBe(false);
			} finally {
				await cleanup(root);
			}
		});
	});

	describe("syncAll", () => {
		it("syncs all subdirectories and returns updated dirs", async () => {
			const { root, firmDir, sync } = await makeFirmRoot();
			try {
				// Create two subdirectories with content
				const conceptsDir = join(firmDir, "concepts");
				const decisionsDir = join(firmDir, "decisions");
				await mkdir(conceptsDir, { recursive: true });
				await mkdir(decisionsDir, { recursive: true });
				await writeFile(
					join(conceptsDir, "concept-a.md"),
					"---\nstatus: active\n---\n# Concept A\nFirst concept.\n"
				);
				await writeFile(
					join(decisionsDir, "decision-001.md"),
					"---\nstatus: active\n---\n# Decision 001\nA decision.\n"
				);

				const updated = await sync.syncAll(firmDir);

				// Both directories should have been synced (not skipped)
				expect(updated).toHaveLength(2);
				expect(updated).toContain(conceptsDir);
				expect(updated).toContain(decisionsDir);

				// navigation.md files created
				expect(existsSync(join(conceptsDir, "navigation.md"))).toBe(true);
				expect(existsSync(join(decisionsDir, "navigation.md"))).toBe(true);
			} finally {
				await cleanup(root);
			}
		});

		it("excludes skipped directories from results", async () => {
			const { root, firmDir, sync } = await makeFirmRoot();
			try {
				// One directory with content, one empty
				const conceptsDir = join(firmDir, "concepts");
				const emptyDir = join(firmDir, "empty");
				await mkdir(conceptsDir, { recursive: true });
				await mkdir(emptyDir, { recursive: true });
				await writeFile(
					join(conceptsDir, "concept-a.md"),
					"---\nstatus: active\n---\n# Concept A\nFirst concept.\n"
				);

				const updated = await sync.syncAll(firmDir);

				// Only the directory with content should be returned
				expect(updated).toHaveLength(1);
				expect(updated).toContain(conceptsDir);
			} finally {
				await cleanup(root);
			}
		});

		it("returns empty array when .firm/ has no subdirectories", async () => {
			const { root, firmDir, sync } = await makeFirmRoot();
			try {
				const updated = await sync.syncAll(firmDir);
				expect(updated).toEqual([]);
			} finally {
				await cleanup(root);
			}
		});
	});
});
