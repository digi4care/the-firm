/**
 * Catalog Adapter — bridges @digi4care/the-firm-catalog into @digi4care/the-firm-ai.
 *
 * Maps catalog ResolvedModel → Model<Api> and merges with generated fallback.
 * Only this file knows about the catalog package. The rest of the-firm-ai
 * only sees standard Model<TApi> objects.
 */

import type { Api, Model } from "./types.js";
import { MODELS } from "./models.generated.js";

// Lazy-load catalog — if not available (e.g. catalog package missing), gracefully degrade
let catalogModule: typeof import("../../the-firm-catalog/src/index.js") | null = null;

async function ensureCatalog() {
	if (!catalogModule) {
		try {
			catalogModule = await import("../../the-firm-catalog/src/index.js");
		} catch {
			// Catalog not available — fall back to generated only
			catalogModule = null;
		}
	}
	return catalogModule;
}

// Sync loader for build-time when catalog dist exists
function loadCatalogSync() {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const fs = require("node:fs");
		const path = require("node:path");
		const providersDir = path.resolve(__dirname, "../../the-firm-catalog/dist/providers");
		if (!fs.existsSync(providersDir)) return null;

		const catalog = new Map();
		for (const file of fs.readdirSync(providersDir)) {
			if (!file.endsWith(".json")) continue;
			const data = JSON.parse(fs.readFileSync(path.join(providersDir, file), "utf-8"));
			catalog.set(data.provider.id, data);
		}
		return catalog;
	} catch {
		return null;
	}
}

interface CatalogResolvedModel {
	id: string;
	name: string;
	provider: string;
	api: string;
	base_url: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	context_window: number;
	max_tokens: number;
	cost: { input: number; output: number; cache_read: number; cache_write: number };
	sampling?: {
		temperature?: boolean | -1;
		top_p?: boolean | -1;
		top_k?: boolean | -1;
		min_p?: boolean | -1;
		presence_penalty?: boolean | -1;
		repetition_penalty?: boolean | -1;
	};
	subscriptions?: Record<string, unknown>;
}

/**
 * Convert a catalog TriState (true/false/-1) to a SamplingCapabilities boolean.
 * -1 (unknown) is treated as "forward to provider" → we don't set the override,
 * letting the API-level defaults decide.
 */
function tristateToOverride(value: boolean | -1 | undefined): boolean | undefined {
	if (value === undefined || value === -1) return undefined;
	return value;
}

/**
 * Map a catalog ResolvedModel to a Model<Api> object.
 */
function mapCatalogModel(cm: CatalogResolvedModel): Model<Api> {
	const samplingOverrides: Record<string, boolean> = {};
	if (cm.sampling) {
		const temp = tristateToOverride(cm.sampling.temperature);
		if (temp !== undefined) samplingOverrides.temperature = temp;
		const topP = tristateToOverride(cm.sampling.top_p);
		if (topP !== undefined) samplingOverrides.topP = topP;
		const topK = tristateToOverride(cm.sampling.top_k);
		if (topK !== undefined) samplingOverrides.topK = topK;
		const minP = tristateToOverride(cm.sampling.min_p);
		if (minP !== undefined) samplingOverrides.minP = minP;
		const pp = tristateToOverride(cm.sampling.presence_penalty);
		if (pp !== undefined) samplingOverrides.presencePenalty = pp;
		const rp = tristateToOverride(cm.sampling.repetition_penalty);
		if (rp !== undefined) samplingOverrides.repetitionPenalty = rp;
	}

	return {
		id: cm.id,
		name: cm.name,
		api: cm.api as Api,
		provider: cm.provider,
		baseUrl: cm.base_url,
		reasoning: cm.reasoning,
		input: cm.input,
		cost: {
			input: cm.cost.input,
			output: cm.cost.output,
			cacheRead: cm.cost.cache_read,
			cacheWrite: cm.cost.cache_write,
		},
		contextWindow: cm.context_window,
		maxTokens: cm.max_tokens,
		samplingCapabilities: Object.keys(samplingOverrides).length > 0 ? samplingOverrides : undefined,
	} as Model<Api>;
}

/**
 * Resolve a single model from the catalog.
 * Returns undefined if not found.
 */
export function resolveModelFromCatalog(providerId: string, modelId: string): Model<Api> | undefined {
	const catalog = loadCatalogSync();
	if (!catalog) return undefined;

	const entry = catalog.get(providerId);
	if (!entry) return undefined;

	const cm = entry.models?.find((m: CatalogResolvedModel) => m.id === modelId);
	if (!cm) return undefined;

	return mapCatalogModel(cm);
}

/**
 * Build a complete model registry from catalog data.
 * Returns Map<providerId, Map<modelId, Model<Api>>>.
 */
export function buildCatalogModelRegistry(): Map<string, Map<string, Model<Api>>> {
	const registry = new Map<string, Map<string, Model<Api>>>();
	const catalog = loadCatalogSync();
	if (!catalog) return registry;

	for (const [, entry] of catalog) {
		const models = new Map<string, Model<Api>>();
		for (const cm of entry.models ?? []) {
			models.set(cm.id, mapCatalogModel(cm));
		}
		registry.set(entry.provider.id, models);
	}

	return registry;
}

/**
 * Merge catalog data with generated models.
 * Catalog wins when both exist. Generated fills gaps.
 * Returns Map<providerId, Map<modelId, Model<Api>>>.
 */
export function mergeCatalogWithGenerated(): Map<string, Map<string, Model<Api>>> {
	const merged = new Map<string, Map<string, Model<Api>>>();

	// Start with all generated models
	for (const [provider, models] of Object.entries(MODELS)) {
		const providerModels = new Map<string, Model<Api>>();
		for (const [id, model] of Object.entries(models)) {
			providerModels.set(id, model as Model<Api>);
		}
		merged.set(provider, providerModels);
	}

	// Overlay catalog data — catalog wins
	const catalogRegistry = buildCatalogModelRegistry();
	for (const [providerId, catalogModels] of catalogRegistry) {
		if (!merged.has(providerId)) {
			merged.set(providerId, catalogModels);
		} else {
			const existing = merged.get(providerId)!;
			for (const [modelId, model] of catalogModels) {
				existing.set(modelId, model);
			}
		}
	}

	return merged;
}
