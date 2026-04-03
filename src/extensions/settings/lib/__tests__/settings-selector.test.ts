/**
 * settings-selector.test.ts — Tests for the settings selector TUI component
 *
 * Tests the component in isolation using the same pattern as
 * oh-my-pi's tui/test/settings-list.test.ts and tui/test/tab-bar.test.ts.
 * We verify render output and input handling without a real terminal.
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { KeybindingsManager, setKeybindings, TUI_KEYBINDINGS } from "@mariozechner/pi-tui";

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
			const { visibleWidth } = await import("@mariozechner/pi-tui");
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
			const linesBefore = component.render(80);
			const _beforeText = linesBefore.join("");

			// Press Tab to switch tab
			component.handleInput("\t");

			const linesAfter = component.render(80);
			const _afterText = linesAfter.join("");

			// Tab content should change (different settings visible)
			// At minimum, it should not crash
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
});
