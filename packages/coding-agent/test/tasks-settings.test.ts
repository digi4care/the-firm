import { describe, expect, it, beforeAll } from 'vitest';
import { SettingsManager } from '../src/core/settings-manager.js';
import { bootstrapSettings } from '../src/core/settings-bootstrap.js';

describe('Tasks settings', () => {
	beforeAll(() => {
		bootstrapSettings();
	});
	describe('defaults', () => {
		it('should return default values for task settings', () => {
			const manager = SettingsManager.inMemory();

			// Isolation defaults
			expect(manager.get('task.isolation.mode')).toBe('none');
			expect(manager.get('task.isolation.merge')).toBe('patch');
			expect(manager.get('task.isolation.commits')).toBe('generic');

			// Delegation defaults
			expect(manager.get('task.eager')).toBe(false);
			expect(manager.get('task.maxConcurrency')).toBe(8);
			expect(manager.get('task.maxRecursionDepth')).toBe(2);

			// Todo defaults
			expect(manager.get('tasks.todoClearDelay')).toBe(60);

			// Skills default
			expect(manager.get('enableSkillCommands')).toBe(true);
		});
	});

	describe('isolation mode', () => {
		it('should accept worktree isolation mode', () => {
			const manager = SettingsManager.inMemory({
				task: { isolation: { mode: 'worktree' } },
			});
			expect(manager.get('task.isolation.mode')).toBe('worktree');
		});

		it('should accept merge strategy branch', () => {
			const manager = SettingsManager.inMemory({
				task: { isolation: { merge: 'branch' } },
			});
			expect(manager.get('task.isolation.merge')).toBe('branch');
		});

		it('should accept AI commit style', () => {
			const manager = SettingsManager.inMemory({
				task: { isolation: { commits: 'ai' } },
			});
			expect(manager.get('task.isolation.commits')).toBe('ai');
		});
	});

	describe('delegation', () => {
		it('should allow enabling eager delegation', () => {
			const manager = SettingsManager.inMemory({
				task: { eager: true },
			});
			expect(manager.get('task.eager')).toBe(true);
		});

		it('should allow setting concurrency limit', () => {
			const manager = SettingsManager.inMemory({
				task: { maxConcurrency: 16 },
			});
			expect(manager.get('task.maxConcurrency')).toBe(16);
		});

		it('should allow setting recursion depth', () => {
			const manager = SettingsManager.inMemory({
				task: { maxRecursionDepth: 3 },
			});
			expect(manager.get('task.maxRecursionDepth')).toBe(3);
		});
	});

	describe('agent configuration', () => {
		it('should allow disabled agents list', () => {
			const manager = SettingsManager.inMemory({
				task: { disabledAgents: ['browser', 'bowser'] },
			});
			expect(manager.get('task.disabledAgents')).toEqual(['browser', 'bowser']);
		});

		it('should allow model overrides per agent', () => {
			const manager = SettingsManager.inMemory({
				task: { agentModelOverrides: { researcher: 'gpt-5.2' } },
			});
			expect(manager.get('task.agentModelOverrides')).toEqual({ researcher: 'gpt-5.2' });
		});
	});
});
