import { mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAvailableThemes, getAvailableThemesWithPaths } from "../src/modes/interactive/theme/theme.js";

describe("Theme discovery", () => {
	let testDir: string;
	let originalCwd: string;

	beforeEach(() => {
		testDir = join(tmpdir(), `themes-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });
		originalCwd = process.cwd();
		process.chdir(testDir);
	});

	afterEach(() => {
		process.chdir(originalCwd);
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("@themes/ subfolder", () => {
		it("should discover themes from .the-firm/themes/ directory", () => {
			const themesDir = join(testDir, ".the-firm", "themes");
			mkdirSync(themesDir, { recursive: true });
			writeFileSync(join(themesDir, "custom-dark.json"), JSON.stringify({ name: "Custom Dark", colors: {} }));
			writeFileSync(join(themesDir, "custom-light.json"), JSON.stringify({ name: "Custom Light", colors: {} }));

			const themes = getAvailableThemes();

			expect(themes).toContain("custom-dark");
			expect(themes).toContain("custom-light");
		});

		it("should include theme paths in getAvailableThemesWithPaths", () => {
			const themesDir = join(testDir, ".the-firm", "themes");
			mkdirSync(themesDir, { recursive: true });
			writeFileSync(join(themesDir, "project-theme.json"), JSON.stringify({ name: "Project Theme", colors: {} }));

			const themes = getAvailableThemesWithPaths();
			const projectTheme = themes.find((t) => t.name === "project-theme");

			expect(projectTheme).toBeDefined();
			expect(projectTheme?.path).toBe(join(themesDir, "project-theme.json"));
		});

		it("should handle missing .the-firm/themes/ gracefully", () => {
			const themes = getAvailableThemes();
			// Should still contain built-in themes
			expect(themes).toContain("dark");
			expect(themes).toContain("light");
		});
	});
});
