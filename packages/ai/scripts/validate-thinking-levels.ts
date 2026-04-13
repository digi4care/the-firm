#!/usr/bin/env npx tsx
/**
 * Thinking Level Validation Tool
 *
 * Scans all reasoning=true models in models.generated.ts and reports
 * their thinking compatibility profile, supported levels, and any gaps.
 *
 * Usage: npx tsx scripts/validate-thinking-levels.ts
 */

import { MODELS } from '../src/models.generated.js';
import { getThinkingCompat, getSupportedThinkingLevels, supportsXhigh } from '../src/thinking-compat.js';

interface ModelReport {
	provider: string;
	modelId: string;
	profileFound: boolean;
	format: string;
	supportedLevels: string[];
	supportsXhigh: boolean;
}

function main() {
	const allModels = Object.values(MODELS).flatMap((providerModels) => Object.values(providerModels as Record<string, any>));
	const reasoningModels = allModels.filter((m: any) => m.reasoning === true);

	console.log(`\n=== Thinking Level Validation Report ===`);
	console.log(`Total models: ${allModels.length}`);
	console.log(`Reasoning models: ${reasoningModels.length}\n`);

	// Group by provider
	const byProvider = new Map<string, ModelReport[]>();
	let noProfile = 0;

	for (const model of reasoningModels) {
		const provider = model.provider as string;
		const modelId = model.id as string;
		const profile = getThinkingCompat(provider);

		const report: ModelReport = {
			provider,
			modelId,
			profileFound: !!profile,
			format: profile?.format ?? 'UNKNOWN',
			supportedLevels: getSupportedThinkingLevels(provider, modelId),
			supportsXhigh: supportsXhigh(provider, modelId),
		};

		if (!profile) noProfile++;

		const existing = byProvider.get(provider) ?? [];
		existing.push(report);
		byProvider.set(provider, existing);
	}

	// Report per provider
	const sortedProviders = [...byProvider.keys()].sort();
	for (const provider of sortedProviders) {
		const reports = byProvider.get(provider)!;
		const profile = getThinkingCompat(provider);

		console.log(`\n── ${provider} (${reports.length} models) ──`);
		if (profile) {
			console.log(`  Format: ${profile.format}`);
			console.log(`  Default max: ${profile.maxLevel}`);
			console.log(`  Unsupported behavior: ${profile.unsupportedBehavior}`);
			if (profile.modelOverrides && profile.modelOverrides.length > 0) {
				console.log(`  Model overrides:`);
				for (const o of profile.modelOverrides) {
					console.log(`    - "${o.pattern}" → max ${o.maxLevel}`);
				}
			}
		} else {
			console.log(`  ⚠️  NO PROFILE DEFINED`);
		}

		// Show xhigh models
		const xhighModels = reports.filter((r) => r.supportsXhigh);
		if (xhighModels.length > 0) {
			console.log(`  xhigh supported (${xhighModels.length}):`);
			for (const m of xhighModels.slice(0, 10)) {
				console.log(`    ✓ ${m.modelId}`);
			}
			if (xhighModels.length > 10) {
				console.log(`    ... and ${xhighModels.length - 10} more`);
			}
		}
	}

	// Summary
	console.log(`\n=== Summary ===`);
	console.log(`Providers with reasoning models: ${byProvider.size}`);
	console.log(`Providers with NO profile: ${noProfile} models`);
	console.log(`Providers with profiles: ${byProvider.size - (noProfile > 0 ? 1 : 0)}`);

	// Warnings
	if (noProfile > 0) {
		console.log(`\n⚠️  WARNING: ${noProfile} reasoning models have no thinking compat profile.`);
		console.log(`   These will use safe defaults (maxLevel=high, clamp xhigh).`);
	}

	console.log();
}

main();
