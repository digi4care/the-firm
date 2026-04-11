import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FirmScanner } from "../../scanning/firm-scanner";
import { FrameworkScanner } from "../../scanning/framework-scanner";
import { LanguageScanner } from "../../scanning/language-scanner";
import { ProjectScanner } from "../../scanning/project-scanner";
import { StructureScanner } from "../../scanning/structure-scanner";

let tempRoot: string;

async function makeTempDir(): Promise<string> {
	tempRoot = join(tmpdir(), `the-firm-scanner-test-${Date.now()}`);
	await mkdir(tempRoot, { recursive: true });
	return tempRoot;
}

afterEach(async () => {
	if (tempRoot) {
		await rm(tempRoot, { recursive: true, force: true });
	}
});

describe("LanguageScanner", () => {
	it("detects TypeScript from tsconfig.json", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "tsconfig.json"), "{}");
		await writeFile(join(root, "package.json"), JSON.stringify({ name: "test" }));

		const scanner = new LanguageScanner();
		const result = await scanner.scan(root);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("TypeScript");
		expect(result[0].confidence).toBe(1.0);
		expect(result[0].evidence).toContain("tsconfig.json");
	});

	it("detects JavaScript when no tsconfig.json exists", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "package.json"), JSON.stringify({ name: "test" }));

		const scanner = new LanguageScanner();
		const result = await scanner.scan(root);

		const js = result.find((l) => l.name === "JavaScript");
		expect(js).toBeDefined();
		expect(js?.confidence).toBeGreaterThanOrEqual(0.7);
		expect(js?.evidence).toContain("package.json");
	});

	it("does not detect JavaScript when tsconfig.json is present", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "tsconfig.json"), "{}");
		await writeFile(join(root, "package.json"), JSON.stringify({ name: "test" }));

		const scanner = new LanguageScanner();
		const result = await scanner.scan(root);

		expect(result.some((l) => l.name === "JavaScript")).toBe(false);
	});

	it("detects Python from requirements.txt", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "requirements.txt"), "flask==2.0");

		const scanner = new LanguageScanner();
		const result = await scanner.scan(root);

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Python");
		expect(result[0].confidence).toBe(1.0);
	});

	it("returns empty for unrecognized projects", async () => {
		const root = await makeTempDir();

		const scanner = new LanguageScanner();
		const result = await scanner.scan(root);

		expect(result).toHaveLength(0);
	});
});

describe("FrameworkScanner", () => {
	it("detects Svelte from svelte.config.js", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "svelte.config.js"), "export default {}");

		const scanner = new FrameworkScanner();
		const result = await scanner.scan(root);

		expect(result.length).toBeGreaterThanOrEqual(1);
		const svelte = result.find((f) => f.name === "Svelte");
		expect(svelte).toBeDefined();
		expect(svelte?.confidence).toBe(1.0);
		expect(svelte?.evidence).toContain("svelte.config.js");
	});

	it("detects Express from package.json dependency", async () => {
		const root = await makeTempDir();
		await writeFile(
			join(root, "package.json"),
			JSON.stringify({
				dependencies: { express: "^4.18.0" },
			})
		);

		const scanner = new FrameworkScanner();
		const result = await scanner.scan(root);

		const express = result.find((f) => f.name === "Express");
		expect(express).toBeDefined();
		expect(express?.evidence).toContain("package.json:express");
	});

	it("detects Django from manage.py and settings.py", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "manage.py"), "");
		await writeFile(join(root, "settings.py"), "");

		const scanner = new FrameworkScanner();
		const result = await scanner.scan(root);

		const django = result.find((f) => f.name === "Django");
		expect(django).toBeDefined();
		expect(django?.evidence).toContain("manage.py");
		expect(django?.evidence).toContain("settings.py");
	});

	it("returns empty when no frameworks match", async () => {
		const root = await makeTempDir();

		const scanner = new FrameworkScanner();
		const result = await scanner.scan(root);

		expect(result).toHaveLength(0);
	});
});

describe("StructureScanner", () => {
	it("finds src/ directory and test patterns", async () => {
		const root = await makeTempDir();
		await mkdir(join(root, "src"), { recursive: true });
		await mkdir(join(root, "test"), { recursive: true });
		await writeFile(join(root, "src/index.ts"), "");
		await writeFile(join(root, "src/app.test.ts"), "");

		const scanner = new StructureScanner();
		const result = await scanner.scan(root);

		expect(result.directories).toContain("src");
		expect(result.directories).toContain("test");
		expect(result.testPatterns).toContain("test/**");
		expect(result.testPatterns).toContain("*.test.ts");
		expect(result.entryPoints).toContain("src/index.ts");
	});

	it("detects entry points at root level", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "main.py"), "");

		const scanner = new StructureScanner();
		const result = await scanner.scan(root);

		expect(result.entryPoints).toContain("main.py");
	});

	it("returns empty structure for empty directory", async () => {
		const root = await makeTempDir();

		const scanner = new StructureScanner();
		const result = await scanner.scan(root);

		expect(result.directories).toHaveLength(0);
		expect(result.entryPoints).toHaveLength(0);
		expect(result.testPatterns).toHaveLength(0);
	});
});

describe("FirmScanner", () => {
	it("detects missing .firm/ state", async () => {
		const root = await makeTempDir();

		const scanner = new FirmScanner();
		const result = await scanner.scan(root);

		expect(result.exists).toBe(false);
		expect(result.files).toHaveLength(0);
		expect(result.standards).toHaveLength(0);
		expect(result.navigationHealth).toBe("missing");
	});

	it("detects empty .firm/ with missing navigation", async () => {
		const root = await makeTempDir();
		await mkdir(join(root, ".firm"), { recursive: true });

		const scanner = new FirmScanner();
		const result = await scanner.scan(root);

		expect(result.exists).toBe(true);
		expect(result.files).toHaveLength(0);
		expect(result.navigationHealth).toBe("missing");
	});

	it("detects populated .firm/ with files", async () => {
		const root = await makeTempDir();
		await mkdir(join(root, ".firm/concepts"), { recursive: true });
		await mkdir(join(root, ".firm/lookup/standards"), { recursive: true });
		await writeFile(join(root, ".firm/navigation.md"), "# Navigation\n");
		await writeFile(join(root, ".firm/concepts/navigation.md"), "# Concepts\n");
		await writeFile(join(root, ".firm/concepts/test-concept.md"), "# Test\n");
		await writeFile(join(root, ".firm/lookup/navigation.md"), "# Lookup\n");
		await writeFile(join(root, ".firm/lookup/standards/navigation.md"), "# Standards\n");
		await writeFile(join(root, ".firm/lookup/standards/coding-standard.md"), "# Standard\n");

		const scanner = new FirmScanner();
		const result = await scanner.scan(root);

		expect(result.exists).toBe(true);
		expect(result.files.length).toBeGreaterThanOrEqual(3);
		expect(result.files).toContain("concepts/test-concept.md");
		expect(result.standards).toContain("coding-standard.md");
		expect(result.navigationHealth).toBe("healthy");
	});
});

describe("ProjectScanner", () => {
	it("orchestrates all scanners", async () => {
		const root = await makeTempDir();
		await writeFile(join(root, "tsconfig.json"), "{}");
		await writeFile(
			join(root, "package.json"),
			JSON.stringify({
				name: "test-project",
				dependencies: { "@sveltejs/kit": "^2.0.0" },
			})
		);
		await writeFile(join(root, "svelte.config.js"), "export default {}");
		await mkdir(join(root, "src"), { recursive: true });
		await writeFile(join(root, "src/index.ts"), "");
		await mkdir(join(root, ".firm"), { recursive: true });
		await writeFile(join(root, ".firm/navigation.md"), "# Navigation\n");

		const scanner = new ProjectScanner(
			new LanguageScanner(),
			new FrameworkScanner(),
			new StructureScanner(),
			new FirmScanner()
		);

		const profile = await scanner.scan(root);

		expect(profile.root).toBe(root);
		expect(profile.languages.some((l) => l.name === "TypeScript")).toBe(true);
		expect(profile.frameworks.some((f) => f.name === "Svelte")).toBe(true);
		expect(profile.structure.directories).toContain("src");
		expect(profile.existingFirm.exists).toBe(true);
		expect(profile.existingRules.exists).toBe(false);
	});
});
