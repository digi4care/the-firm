import { describe, expect, it, beforeAll } from 'vitest';
import { SettingsManager } from '../src/core/settings-manager.js';
import { bootstrapSettings } from '../src/core/settings-bootstrap.js';

describe('P4 settings additions', () => {
	beforeAll(() => {
		bootstrapSettings();
	});

	describe('interruptMode (7vj.13)', () => {
		it('should default to immediate', () => {
			const manager = SettingsManager.inMemory();
			expect(manager.get('interruptMode')).toBe('immediate');
		});

		it('should allow setting to wait', () => {
			const manager = SettingsManager.inMemory({ interruptMode: 'wait' });
			expect(manager.get('interruptMode')).toBe('wait');
		});
	});

	describe('repeatToolDescriptions (7vj.14)', () => {
		it('should default to false', () => {
			const manager = SettingsManager.inMemory();
			expect(manager.get('repeatToolDescriptions')).toBe(false);
		});

		it('should allow enabling', () => {
			const manager = SettingsManager.inMemory({ repeatToolDescriptions: true });
			expect(manager.get('repeatToolDescriptions')).toBe(true);
		});
	});

	describe('startup.checkUpdate (7vj.16)', () => {
		it('should default to true', () => {
			const manager = SettingsManager.inMemory();
			expect(manager.get('startup.checkUpdate')).toBe(true);
		});

		it('should allow disabling', () => {
			const manager = SettingsManager.inMemory({ startup: { checkUpdate: false } });
			expect(manager.get('startup.checkUpdate')).toBe(false);
		});
	});

	describe('notifications (7vj.18)', () => {
		it('should return default notification values', () => {
			const manager = SettingsManager.inMemory();
			expect(manager.get('completion.notify')).toBe(true);
			expect(manager.get('ask.notify')).toBe(true);
			expect(manager.get('ask.timeout')).toBe(30);
		});

		it('should allow configuring notifications', () => {
			const manager = SettingsManager.inMemory({
				completion: { notify: false },
				ask: { notify: false, timeout: 60 },
			});
			expect(manager.get('completion.notify')).toBe(false);
			expect(manager.get('ask.notify')).toBe(false);
			expect(manager.get('ask.timeout')).toBe(60);
		});
	});

	describe('speech-to-text (7vj.19)', () => {
		it('should return default STT values', () => {
			const manager = SettingsManager.inMemory();
			expect(manager.get('stt.enabled')).toBe(false);
			expect(manager.get('stt.language')).toBe('en');
			expect(manager.get('stt.modelName')).toBe('base.en');
		});

		it('should allow configuring STT', () => {
			const manager = SettingsManager.inMemory({
				stt: { enabled: true, language: 'nl', modelName: 'small' },
			});
			expect(manager.get('stt.enabled')).toBe(true);
			expect(manager.get('stt.language')).toBe('nl');
			expect(manager.get('stt.modelName')).toBe('small');
		});
	});
});
