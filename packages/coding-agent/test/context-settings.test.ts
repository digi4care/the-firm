import { describe, expect, it, beforeAll } from 'vitest';
import { SettingsManager } from '../src/core/settings-manager.js';
import { bootstrapSettings } from '../src/core/settings-bootstrap.js';

describe('Context settings', () => {
	beforeAll(() => {
		bootstrapSettings();
	});

	describe('core compaction defaults', () => {
		it('should return default values for core compaction', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('compaction.enabled')).toBe(true);
			expect(manager.get('compaction.strategy')).toBe('context-full');
			expect(manager.get('compaction.thresholdPercent')).toBe(90);
			expect(manager.get('compaction.thresholdTokens')).toBe(-1);
			expect(manager.get('compaction.reserveTokens')).toBe(16384);
			expect(manager.get('compaction.keepRecentTokens')).toBe(20000);
		});

		it('should return default values for handoff', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('compaction.handoffAutoContinue')).toBe(true);
			expect(manager.get('compaction.handoffSaveToDisk')).toBe(false);
		});
	});

	describe('remote and idle compaction defaults', () => {
		it('should return default values for remote compaction', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('compaction.remoteEnabled')).toBe(true);
		});

		it('should return default values for idle compaction', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('compaction.idleEnabled')).toBe(false);
			expect(manager.get('compaction.idleThresholdTokens')).toBe(200000);
			expect(manager.get('compaction.idleTimeoutSeconds')).toBe(300);
		});
	});

	describe('context promotion and branch summaries defaults', () => {
		it('should return default values for context promotion', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('contextPromotion.enabled')).toBe(true);
		});

		it('should return default values for branch summaries', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('branchSummary.enabled')).toBe(false);
		});

		it('should return default values for memories', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('memories.enabled')).toBe(false);
		});
	});

	describe('context pruning (DCP) defaults', () => {
		it('should return default values for context pruning', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('contextPruning.enabled')).toBe(false);
			expect(manager.get('contextPruning.keepRecentCount')).toBe(4);
		});
	});

	describe('TTSR defaults', () => {
		it('should return default values for TTSR', () => {
			const manager = SettingsManager.inMemory();

			expect(manager.get('ttsr.enabled')).toBe(true);
			expect(manager.get('ttsr.contextMode')).toBe('discard');
			expect(manager.get('ttsr.interruptMode')).toBe('always');
			expect(manager.get('ttsr.repeatMode')).toBe('once');
			expect(manager.get('ttsr.repeatGap')).toBe(10);
		});
	});

	describe('overrides', () => {
		it('should allow switching compaction strategy to handoff', () => {
			const manager = SettingsManager.inMemory({
				compaction: { strategy: 'handoff' },
			});
			expect(manager.get('compaction.strategy')).toBe('handoff');
		});

		it('should allow enabling idle compaction', () => {
			const manager = SettingsManager.inMemory({
				compaction: {
					idleEnabled: true,
					idleThresholdTokens: 100000,
					idleTimeoutSeconds: 120,
				},
			});
			expect(manager.get('compaction.idleEnabled')).toBe(true);
			expect(manager.get('compaction.idleThresholdTokens')).toBe(100000);
			expect(manager.get('compaction.idleTimeoutSeconds')).toBe(120);
		});

		it('should allow enabling context pruning', () => {
			const manager = SettingsManager.inMemory({
				contextPruning: { enabled: true, keepRecentCount: 8 },
			});
			expect(manager.get('contextPruning.enabled')).toBe(true);
			expect(manager.get('contextPruning.keepRecentCount')).toBe(8);
		});

		it('should allow configuring TTSR', () => {
			const manager = SettingsManager.inMemory({
				ttsr: {
					enabled: false,
					contextMode: 'keep',
					interruptMode: 'end',
					repeatMode: 'gap',
					repeatGap: 20,
				},
			});
			expect(manager.get('ttsr.enabled')).toBe(false);
			expect(manager.get('ttsr.contextMode')).toBe('keep');
			expect(manager.get('ttsr.interruptMode')).toBe('end');
			expect(manager.get('ttsr.repeatMode')).toBe('gap');
			expect(manager.get('ttsr.repeatGap')).toBe(20);
		});

		it('should allow enabling memories and branch summaries', () => {
			const manager = SettingsManager.inMemory({
				memories: { enabled: true },
				branchSummary: { enabled: true },
			});
			expect(manager.get('memories.enabled')).toBe(true);
			expect(manager.get('branchSummary.enabled')).toBe(true);
		});

		it('should allow disabling context promotion', () => {
			const manager = SettingsManager.inMemory({
				contextPromotion: { enabled: false },
			});
			expect(manager.get('contextPromotion.enabled')).toBe(false);
		});

		it('should allow disabling remote compaction', () => {
			const manager = SettingsManager.inMemory({
				compaction: { remoteEnabled: false },
			});
			expect(manager.get('compaction.remoteEnabled')).toBe(false);
		});
	});
});
