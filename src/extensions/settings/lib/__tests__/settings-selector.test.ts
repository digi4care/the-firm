/**
 * settings-selector.test.ts — Tests for the settings selector TUI component
 *
 * Tests the component in isolation using the same pattern as
 * oh-my-pi's tui/test/settings-list.test.ts and tui/test/tab-bar.test.ts.
 * We verify render output and input handling without a real terminal.
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { KeybindingsManager, setKeybindings, TUI_KEYBINDINGS } from "@mariozechner/pi-tui";

import { visibleWidth } from "@mariozechner/pi-tui";

describe("settings-selector", () => {
	beforeEach(() => {
		setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS));
	});

	async function getModule() {
		return import("../settings-selector.ts");
	}

	function createMockTheme() {
		return {
			fg: (_color: string, text: string) => text,
			bg: (_color: string, text: string) => text,
			bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
			italic: (text: string) => text,
		};
	}

	describe("createSettingsSelector", () => {
		it("creates a component with render, invalidate, and handleInput", async () => {
			const { createSettingsSelector } = await getModule();
			const settings = new Map<string, string>([
				["theFirm.requireConfirmationBeforeDelete", "true"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: () => {},
				onCancel: () => {},
			});

			expect(typeof component.render).toBe("function");
			expect(typeof component.invalidate).toBe("function");
			expect(typeof component.handleInput).toBe("function");
		});

		it("renders output without crashing", async () => {
			const { createSettingsSelector } = await getModule();
			const settings = new Map<string, string>([
				["theFirm.requireConfirmationBeforeDelete", "true"],
				["theFirm.autoSessionName", "true"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: () => {},
				onCancel: () => {},
			});

			const lines = component.render(80);
			expect(Array.isArray(lines)).toBe(true);
			expect(lines.length).toBeGreaterThan(0);
		});

		it("renders lines that do not exceed width", async () => {
			const { createSettingsSelector } = await getModule();
			const settings = new Map<string, string>([
				["theFirm.requireConfirmationBeforeDelete", "true"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: () => {},
				onCancel: () => {},
			});

			const width = 60;
			const lines = component.render(width);
			for (const line of lines) {
				expect(visibleWidth(line)).toBeLessThanOrEqual(width);
			}
		});
	});

	describe("tab navigation", () => {
		it("switches tabs on tab key", async () => {
			const { createSettingsSelector } = await getModule();
			const changes: Array<[string, string]> = [];
			const settings = new Map<string, string>([
				["theFirm.requireConfirmationBeforeDelete", "true"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: (id, val) => changes.push([id, val]),
				onCancel: () => {},
			});

			// Initial render
			component.render(80);

			// Press Tab to switch tab
			component.handleInput("\t");

			const linesAfter = component.render(80);

			// Tab content should change (different settings visible)
			// At minimum it should not crash
			expect(linesAfter.length).toBeGreaterThan(0);
		});
	});

	describe("setting toggle", () => {
		it("calls onChange when toggling a boolean setting", async () => {
			const { createSettingsSelector } = await getModule();
			const changes: Array<[string, string]> = [];
			const settings = new Map<string, string>([
				["theFirm.requireConfirmationBeforeDelete", "true"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: (id, val) => changes.push([id, val]),
				onCancel: () => {},
			});

			// Render first to initialize
			component.render(80);

			// Press Enter to toggle the first setting
			component.handleInput("\n");

			expect(changes.length).toBe(1);
			expect(changes[0]![0]).toBe("theFirm.requireConfirmationBeforeDelete");
			expect(changes[0]![1]).toBe("false");
		});
	});

	describe("cancel", () => {
		it("calls onCancel on Escape", async () => {
			const { createSettingsSelector } = await getModule();
			let cancelled = false;
			const settings = new Map<string, string>([
				["theFirm.requireConfirmationBeforeDelete", "true"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: () => {},
				onCancel: () => {
					cancelled = true;
				},
			});

			component.render(80);
			component.handleInput("\x1b"); // Escape

			expect(cancelled).toBe(true);
		});
	});

	describe("submenu interaction", () => {
		it("opens submenu on Enter for submenu-type setting", async () => {
			const { createSettingsSelector } = await getModule();
			const changes: Array<[string, string]> = [];
			const settings = new Map<string, string>([
				["theFirm.symbolPreset", "emoji"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: (id, val) => changes.push([id, val]),
				onCancel: () => {},
			});

			// Render to initialize
			component.render(80);

			// The first setting on General tab is "Confirm Before Delete" (boolean)
			// Navigate down to find a submenu setting (symbolPreset)
			// Let's navigate to the right setting by pressing down
			component.handleInput("\x1b[B"); // down
			component.handleInput("\x1b[B"); // down
			component.handleInput("\x1b[B"); // down
			component.handleInput("\x1b[B"); // down
			component.render(80);

			// Press Enter to open submenu
			component.handleInput("\n");

			// Should render without crash (submenu overlay)
			const submenuLines = component.render(80);
			expect(submenuLines.length).toBeGreaterThan(0);
		});

		it("selects a submenu option and calls onChange", async () => {
			const { createSettingsSelector } = await getModule();
			const changes: Array<[string, string]> = [];
			const settings = new Map<string, string>([
				["theFirm.symbolPreset", "emoji"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: (id, val) => changes.push([id, val]),
				onCancel: () => {},
			});

			// Navigate to symbolPreset (submenu setting)
			component.render(80);
			component.handleInput("\x1b[B"); // down
			component.handleInput("\x1b[B"); // down
			component.handleInput("\x1b[B"); // down
			component.handleInput("\x1b[B"); // down
			component.render(80);

			// Open submenu
			component.handleInput("\n");
			component.render(80);

			// Press down to change selection from emoji to unicode
			component.handleInput("\x1b[B");

			// Press Enter to select
			component.handleInput("\n");

			expect(changes.length).toBeGreaterThanOrEqual(1);
			expect(changes.some((c) => c[0] === "theFirm.symbolPreset" && c[1] === "unicode")).toBe(true);
		});

		it("cancels submenu on Escape without calling onChange", async () => {
			const { createSettingsSelector } = await getModule();
			const changes: Array<[string, string]> = [];
			const settings = new Map<string, string>([
				["theFirm.symbolPreset", "emoji"],
			]);

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: (id, val) => changes.push([id, val]),
				onCancel: () => {},
			});

			// Navigate to symbolPreset
			component.render(80);
			component.handleInput("\x1b[B"); // down x4
			component.handleInput("\x1b[B");
			component.handleInput("\x1b[B");
			component.handleInput("\x1b[B");
			component.render(80);

			// Open submenu
			component.handleInput("\n");
			component.render(80);

			// Press Escape to cancel submenu
			component.handleInput("\x1b");

			// Should be back to main list, no change
			expect(changes.length).toBe(0);

			// Main list should still render
			const mainLines = component.render(80);
			expect(mainLines.length).toBeGreaterThan(0);
		});

		it("renders all tabs without crashing", async () => {
			const { createSettingsSelector } = await getModule();
			const settings = new Map<string, string>();

			const component = createSettingsSelector({
				settings,
				theme: createMockTheme() as any,
				onChange: () => {},
				onCancel: () => {},
			});

			// Render all 4 tabs
			for (let i = 0; i < 4; i++) {
				const lines = component.render(80);
				expect(lines.length).toBeGreaterThan(0);
				expect(lines.every((l) => visibleWidth(l) <= 80)).toBe(true);
				component.handleInput("\t");
			}
		});
	});
});
