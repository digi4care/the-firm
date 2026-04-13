import { describe, expect, it, beforeAll } from 'vitest';
import { SettingsManager } from '../src/core/settings-manager.js';
import { bootstrapSettings } from '../src/core/settings-bootstrap.js';

describe('Tools settings', () => {
	beforeAll(() => {
		bootstrapSettings();
	});

	describe('defaults', () => {
		it('should return default values for core tool toggles', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('grep.enabled')).toBe(true);
			expect(manager.get('find.enabled')).toBe(true);
			expect(manager.get('fetch.enabled')).toBe(true);
			expect(manager.get('web_search.enabled')).toBe(true);
			expect(manager.get('browser.enabled')).toBe(true);
			expect(manager.get('browser.headless')).toBe(true);
		});

		it('should return default values for grep context', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('grep.contextBefore')).toBe(0);
			expect(manager.get('grep.contextAfter')).toBe(0);
		});

		it('should return default values for artifact control', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('tools.artifactSpillThreshold')).toBe(50);
			expect(manager.get('tools.artifactTailBytes')).toBe(20);
			expect(manager.get('tools.artifactTailLines')).toBe(500);
		});

		it('should return default values for tool behavior', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('tools.intentTracing')).toBe(true);
			expect(manager.get('tools.maxTimeout')).toBe(0);
		});

		it('should return default values for todo settings', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('todo.enabled')).toBe(true);
			expect(manager.get('todo.reminders')).toBe(true);
			expect(manager.get('todo.reminders.max')).toBe(3);
			expect(manager.get('todo.eager')).toBe(false);
		});

		it('should return default values for advanced tool toggles', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('checkpoint.enabled')).toBe(false);
			expect(manager.get('github.enabled')).toBe(false);
			expect(manager.get('async.enabled')).toBe(false);
			expect(manager.get('async.maxJobs')).toBe(50);
		});

		it('should return default values for MCP settings', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('mcp.enableProjectConfig')).toBe(true);
			expect(manager.get('mcp.discoveryMode')).toBe(false);
			expect(manager.get('mcp.notifications')).toBe(false);
			expect(manager.get('mcp.notificationDebounceMs')).toBe(500);
		});
	});

	describe('overrides', () => {
		it('should allow disabling individual tools', () => {
			const manager = SettingsManager.inMemory({
				grep: { enabled: false },
				find: { enabled: false },
				web_search: { enabled: false },
			});

			expect(manager.get('grep.enabled')).toBe(false);
			expect(manager.get('find.enabled')).toBe(false);
			expect(manager.get('web_search.enabled')).toBe(false);
		});

		it('should allow configuring grep context', () => {
			const manager = SettingsManager.inMemory({
				grep: { contextBefore: 3, contextAfter: 5 },
			});

			expect(manager.get('grep.contextBefore')).toBe(3);
			expect(manager.get('grep.contextAfter')).toBe(5);
		});

		it('should allow configuring artifact thresholds', () => {
			const manager = SettingsManager.inMemory({
				tools: { artifactSpillThreshold: 100, artifactTailBytes: 40 },
			});

			expect(manager.get('tools.artifactSpillThreshold')).toBe(100);
			expect(manager.get('tools.artifactTailBytes')).toBe(40);
		});

		it('should allow enabling checkpoint and github tools', () => {
			const manager = SettingsManager.inMemory({
				checkpoint: { enabled: true },
				github: { enabled: true },
			});

			expect(manager.get('checkpoint.enabled')).toBe(true);
			expect(manager.get('github.enabled')).toBe(true);
		});

		it('should allow configuring MCP discovery', () => {
			const manager = SettingsManager.inMemory({
				mcp: {
					enableProjectConfig: false,
					discoveryMode: true,
					discoveryDefaultServers: ['server-a', 'server-b'],
				},
			});

			expect(manager.get('mcp.enableProjectConfig')).toBe(false);
			expect(manager.get('mcp.discoveryMode')).toBe(true);
			expect(manager.get('mcp.discoveryDefaultServers')).toEqual(['server-a', 'server-b']);
		});

		it('should allow configuring async execution', () => {
			const manager = SettingsManager.inMemory({
				async: { enabled: true, maxJobs: 25 },
			});

			expect(manager.get('async.enabled')).toBe(true);
			expect(manager.get('async.maxJobs')).toBe(25);
		});

		it('should allow setting screenshot directory', () => {
			const manager = SettingsManager.inMemory({
				browser: { screenshotDir: '~/Desktop' },
			});

			expect(manager.get('browser.screenshotDir')).toBe('~/Desktop');
		});

		it('should allow configuring todo behavior', () => {
			const manager = SettingsManager.inMemory({
				todo: { enabled: false, reminders: false, eager: true },
			});

			expect(manager.get('todo.enabled')).toBe(false);
			expect(manager.get('todo.reminders')).toBe(false);
			expect(manager.get('todo.eager')).toBe(true);
		});
	});
});
