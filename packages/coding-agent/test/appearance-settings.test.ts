import { describe, expect, it, beforeAll } from 'vitest';
import { SettingsManager } from '../src/core/settings-manager.js';
import { bootstrapSettings } from '../src/core/settings-bootstrap.js';

describe('Appearance settings', () => {
	beforeAll(() => {
		bootstrapSettings();
	});

	describe('theme defaults', () => {
		it('should return default values for theme settings', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('theme')).toBe('dark');
			expect(manager.get('theme.dark')).toBe('dark');
			expect(manager.get('theme.light')).toBe('light');
		});
	});

	describe('image defaults', () => {
		it('should return default values for image settings', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('terminal.showImages')).toBe(true);
			expect(manager.get('images.autoResize')).toBe(true);
			expect(manager.get('images.blockImages')).toBe(false);
		});
	});

	describe('removed dead settings', () => {
		it('should not register statusLine and display settings that have no runtime effect', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('statusLine.preset')).toBeUndefined();
			expect(manager.get('statusLine.separator')).toBeUndefined();
			expect(manager.get('statusLine.showHookStatus')).toBeUndefined();
			expect(manager.get('display.tabWidth')).toBeUndefined();
			expect(manager.get('display.showTokenUsage')).toBeUndefined();
		});
	});

	describe('editor defaults (The Firm unique)', () => {
		it('should return default values for editor settings', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('showHardwareCursor')).toBe(false);
			expect(manager.get('clearOnShrink')).toBe(false);
			expect(manager.get('editorPaddingX')).toBe(0);
			expect(manager.get('autocompleteMaxVisible')).toBe(5);
		});
	});

	describe('overrides', () => {
		it('should allow setting per-background themes', () => {
			const manager = SettingsManager.inMemory({
				theme: { dark: 'monokai', light: 'solarized' },
			});
			expect(manager.get('theme.dark')).toBe('monokai');
			expect(manager.get('theme.light')).toBe('solarized');
		});

		it('should allow blocking images', () => {
			const manager = SettingsManager.inMemory({
				images: { blockImages: true, autoResize: false },
			});
			expect(manager.get('images.blockImages')).toBe(true);
			expect(manager.get('images.autoResize')).toBe(false);
		});



		it('should allow configuring editor settings', () => {
			const manager = SettingsManager.inMemory({
				showHardwareCursor: true,
				editorPaddingX: 2,
				autocompleteMaxVisible: 10,
			});
			expect(manager.get('showHardwareCursor')).toBe(true);
			expect(manager.get('editorPaddingX')).toBe(2);
			expect(manager.get('autocompleteMaxVisible')).toBe(10);
		});
	});
});
