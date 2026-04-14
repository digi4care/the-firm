import { describe, expect, it, beforeAll } from 'vitest';
import { SettingsManager } from '../src/core/settings-manager.js';
import { bootstrapSettings } from '../src/core/settings-bootstrap.js';

describe('Tools settings', () => {
	beforeAll(() => {
		bootstrapSettings();
	});

	describe('defaults', () => {
		it('should return default values for wired tool toggles', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('grep.enabled')).toBe(true);
			expect(manager.get('find.enabled')).toBe(true);
		});

		it('should not register settings for non-existent features', () => {
			const manager = SettingsManager.inMemory();

			// These features don't exist in The Firm, so their settings should be undefined
			expect(manager.get('fetch.enabled')).toBeUndefined();
			expect(manager.get('web_search.enabled')).toBeUndefined();
			expect(manager.get('browser.enabled')).toBeUndefined();
			expect(manager.get('browser.headless')).toBeUndefined();
			expect(manager.get('browser.screenshotDir')).toBeUndefined();
			expect(manager.get('grep.contextBefore')).toBeUndefined();
			expect(manager.get('grep.contextAfter')).toBeUndefined();
			expect(manager.get('tools.artifactSpillThreshold')).toBeUndefined();
			expect(manager.get('tools.artifactTailBytes')).toBeUndefined();
			expect(manager.get('tools.artifactTailLines')).toBeUndefined();
			expect(manager.get('tools.intentTracing')).toBeUndefined();
			expect(manager.get('tools.maxTimeout')).toBeUndefined();
			expect(manager.get('todo.enabled')).toBeUndefined();
			expect(manager.get('todo.reminders')).toBeUndefined();
			expect(manager.get('todo.reminders.max')).toBeUndefined();
			expect(manager.get('todo.eager')).toBeUndefined();
			expect(manager.get('checkpoint.enabled')).toBeUndefined();
			expect(manager.get('github.enabled')).toBeUndefined();
			expect(manager.get('mcp.enableProjectConfig')).toBeUndefined();
			expect(manager.get('mcp.discoveryMode')).toBeUndefined();
			expect(manager.get('mcp.discoveryDefaultServers')).toBeUndefined();
			expect(manager.get('mcp.notifications')).toBeUndefined();
			expect(manager.get('mcp.notificationDebounceMs')).toBeUndefined();
			expect(manager.get('async.enabled')).toBeUndefined();
			expect(manager.get('async.maxJobs')).toBeUndefined();
		});
	});

	describe('overrides', () => {
		it('should allow disabling individual tools', () => {
			const manager = SettingsManager.inMemory({
				grep: { enabled: false },
				find: { enabled: false },
			});

			expect(manager.get('grep.enabled')).toBe(false);
			expect(manager.get('find.enabled')).toBe(false);
		});
	});
});
