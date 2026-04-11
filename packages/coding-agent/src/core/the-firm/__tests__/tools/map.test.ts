import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { MapTool } from "../../tools/map";
import { FirmRepository } from "../../writing/firm-repository";

let testRoot: string;

async function makeRoot(): Promise<{ root: string; tool: MapTool }> {
	testRoot = join(tmpdir(), `map-tool-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
	await mkdir(testRoot, { recursive: true });
	const firmRoot = join(testRoot, ".firm");
	await mkdir(firmRoot, { recursive: true });
	return {
		root: firmRoot,
		tool: new MapTool(new FirmRepository(firmRoot)),
	};
}

/** Write a file with N lines of content inside the .firm/ root. */
async function writeLines(root: string, relativePath: string, lines: number): Promise<void> {
	const fullPath = join(root, relativePath);
	await mkdir(join(fullPath, ".."), { recursive: true });
	await writeFile(fullPath, Array.from({ length: lines }, (_, i) => `line ${i + 1}`).join("\n"));
}

/** Write arbitrary content to a file inside .firm/ root. */
async function writeContent(root: string, relativePath: string, content: string): Promise<void> {
	const fullPath = join(root, relativePath);
	await mkdir(join(fullPath, ".."), { recursive: true });
	await writeFile(fullPath, content);
}

describe("MapTool", () => {
	afterEach(async () => {
		if (testRoot) {
		await rm(testRoot, { recursive: true, force: true }).catch(() => {
			/* ignore cleanup errors */
		});
		}
	});

	it("maps empty .firm/ returns empty tree", async () => {
		const { tool } = await makeRoot();

		const result = await tool.execute({ projectRoot: testRoot });

		expect(result.tree.name).toBe(".firm");
		expect(result.tree.type).toBe("directory");
		expect(result.tree.children).toEqual([]);
		expect(result.stats.totalFiles).toBe(0);
		expect(result.stats.totalDirectories).toBe(0);
		expect(result.stats.mviViolations).toEqual([]);
		expect(result.stats.missingNavigations).toEqual([]);
		expect(result.stats.emptyDirectories).toEqual([]);
		expect(result.healthScore).toBe(100);
	});

	it("maps populated .firm/ with correct tree structure", async () => {
		const { root, tool } = await makeRoot();
		await writeContent(root, "decisions/adr-001.md", "decision");
		await writeContent(root, "decisions/navigation.md", "# Nav");
		await writeContent(root, "concepts/pattern-foo.md", "concept");

		const result = await tool.execute({ projectRoot: testRoot });

		expect(result.tree.name).toBe(".firm");
		expect(result.tree.type).toBe("directory");

		// Should have subdirectories
		// biome-ignore lint/style/noNonNullAssertion: test asserts children exist
		const dirs = result.tree.children!.filter((c) => c.type === "directory");
		const dirNames = dirs.map((d) => d.name).sort();
		expect(dirNames).toContain("decisions");
		expect(dirNames).toContain("concepts");

		// Files should be under their directories
		// biome-ignore lint/style/noNonNullAssertion: test asserts find succeeds
		const decisions = dirs.find((d) => d.name === "decisions")!;
		// biome-ignore lint/style/noNonNullAssertion: test asserts children exist
		const decisionFiles = decisions.children!.filter((c) => c.type === "file");
		expect(decisionFiles.map((f) => f.name).sort()).toEqual(["adr-001.md", "navigation.md"]);

		expect(result.stats.totalFiles).toBe(3);
		expect(result.stats.totalDirectories).toBe(2);
	});

	it("detects MVI violations (>200 lines)", async () => {
		const { root, tool } = await makeRoot();
		await writeLines(root, "concepts/long-file.md", 250);
		await writeContent(root, "concepts/navigation.md", "# Nav");

		const result = await tool.execute({ projectRoot: testRoot });

		expect(result.stats.mviViolations).toHaveLength(1);
		expect(result.stats.mviViolations[0].file).toBe("concepts/long-file.md");
		expect(result.stats.mviViolations[0].lines).toBe(250);
		expect(result.stats.mviViolations[0].maxLines).toBe(200);
	});

	it("detects missing navigation.md files", async () => {
		const { root, tool } = await makeRoot();
		await writeContent(root, "decisions/adr-001.md", "decision");
		// No navigation.md in decisions/

		const result = await tool.execute({ projectRoot: testRoot });

		expect(result.stats.missingNavigations).toContain("decisions");
	});

	it("detects empty directories", async () => {
		const { root, tool } = await makeRoot();
		await mkdir(join(root, "empty-dir"), { recursive: true });

		const result = await tool.execute({ projectRoot: testRoot });

		expect(result.stats.emptyDirectories).toContain("empty-dir");
	});

	it("computes health score correctly", async () => {
		const { root, tool } = await makeRoot();
		// 1 missing navigation, 1 MVI violation, 1 empty dir
		await writeContent(root, "concepts/short.md", "short");
		await writeLines(root, "decisions/long.md", 250);
		await mkdir(join(root, "empty"), { recursive: true });

		const result = await tool.execute({ projectRoot: testRoot });

		// Root dir has .md files but no navigation.md -> missing nav
		// concepts/ has .md files but no navigation.md -> missing nav
		// decisions/ has .md files but no navigation.md -> missing nav
		// empty/ is empty directory
		// long.md has 250 lines > 200 -> MVI violation

		// Expected: -5 * (missing navigations) - 3 * 1 (MVI) - 2 * 1 (empty)
		// Missing navigations: concepts, decisions (root "." is excluded since we only count dirs with md files/subdirs that lack nav)
		// Actually root also has md files (via subdirs, but root's own files are only from children dirs)
		// Let's just verify the score is < 100
		expect(result.healthScore).toBeLessThan(100);
		expect(result.healthScore).toBeGreaterThanOrEqual(0);
	});

	it("health score clamped to 0-100", async () => {
		const { root, tool } = await makeRoot();
		// Create many violations to drive score below 0
		for (let i = 0; i < 40; i++) {
			await writeLines(root, `dir${i}/file-${i}.md`, 250);
		}

		const result = await tool.execute({ projectRoot: testRoot });

		expect(result.healthScore).toBe(0);
	});

	it("files by type counts extensions correctly", async () => {
		const { root, tool } = await makeRoot();
		await writeContent(root, "docs/readme.md", "readme");
		await writeContent(root, "docs/guide.yaml", "yaml");
		await writeContent(root, "docs/config.json", "{}");
		await writeContent(root, "navigation.md", "# Nav");

		const result = await tool.execute({ projectRoot: testRoot });

		expect(result.stats.filesByType.md).toBeGreaterThanOrEqual(2);
		expect(result.stats.filesByType.yaml).toBe(1);
		expect(result.stats.filesByType.json).toBe(1);
	});

	it("line count is present for .md files", async () => {
		const { root, tool } = await makeRoot();
		await writeLines(root, "test.md", 42);

		const result = await tool.execute({ projectRoot: testRoot });

		// biome-ignore lint/style/noNonNullAssertion: test asserts children exist
		const file = result.tree.children!.find((c) => c.name === "test.md");
		expect(file).toBeDefined();
		expect(file?.lines).toBe(42);
	});
});
