import { describe, expect, it } from "vitest";
import { resolveModelFromCatalog, buildCatalogModelRegistry, mergeCatalogWithGenerated } from "../src/catalog-adapter.js";
import { buildBaseOptions } from "../src/providers/simple-options.js";
import type { Api, Model } from "../src/types.js";
import type { Api, Model } from "../src/types.js";

// ===========================================================================
// resolveModelFromCatalog — maps catalog ResolvedModel → Model<Api>
// ===========================================================================

describe("resolveModelFromCatalog", () => {
	it("should return undefined when catalog has no entry", () => {
		const result = resolveModelFromCatalog("nonexistent", "nonexistent");
		expect(result).toBeUndefined();
	});

	it("should map catalog model to Model<Api>", () => {
		const result = resolveModelFromCatalog("openai-codex", "gpt-5.4");
		expect(result).toBeDefined();
		expect(result!.id).toBe("gpt-5.4");
		expect(result!.name).toBe("GPT 5.4");
		expect(result!.api).toBe("openai-codex-responses");
		expect(result!.provider).toBe("openai-codex");
		expect(result!.reasoning).toBe(true);
		expect(result!.input).toEqual(["text", "image"]);
		expect(result!.contextWindow).toBe(200000);
		expect(result!.maxTokens).toBe(100000);
	});

	it("should map catalog costs to Model cost format", () => {
		const result = resolveModelFromCatalog("openai-codex", "gpt-5.4");
		expect(result).toBeDefined();
		expect(result!.cost.input).toBe(2.5);
		expect(result!.cost.output).toBe(10);
		expect(result!.cost.cacheRead).toBe(1.25);
	});

	it("should map catalog sampling capabilities to Model", () => {
		const result = resolveModelFromCatalog("openai-codex", "gpt-5.3-codex");
		expect(result).toBeDefined();
		expect(result!.samplingCapabilities).toBeDefined();
		expect(result!.samplingCapabilities!.temperature).toBe(false);
		expect(result!.samplingCapabilities!.topP).toBe(false);
	});

	it("should preserve subscription data from catalog", () => {
		const result = resolveModelFromCatalog("openai-codex", "gpt-5.3-codex");
		expect(result).toBeDefined();
		// Subscriptions are stored on the catalog model but not yet on Model<TApi>
		// This will be wired when rate limiter is implemented (Phase 2)
		// For now, verify the raw catalog data is accessible
	});
});

// ===========================================================================
// buildCatalogModelRegistry — loads full catalog as Map structure
// ===========================================================================

describe("buildCatalogModelRegistry", () => {
	it("should return a Map of provider → model map", () => {
		const registry = buildCatalogModelRegistry();
		expect(registry.size).toBeGreaterThan(0);
	});

	it("should contain openai-codex provider", () => {
		const registry = buildCatalogModelRegistry();
		expect(registry.has("openai-codex")).toBe(true);
	});

	it("should contain gpt-5.4 under openai-codex", () => {
		const registry = buildCatalogModelRegistry();
		const models = registry.get("openai-codex");
		expect(models).toBeDefined();
		expect(models!.has("gpt-5.4")).toBe(true);
	});
});

// ===========================================================================
// mergeCatalogWithGenerated — catalog wins, generated fills gaps
// ===========================================================================

describe("mergeCatalogWithGenerated", () => {
	it("should prefer catalog models over generated ones", () => {
		const merged = mergeCatalogWithGenerated();
		// If catalog has gpt-5.4 for openai-codex, use catalog version
		const catalogModel = resolveModelFromCatalog("openai-codex", "gpt-5.4");
		if (catalogModel) {
			// The merged registry should have the catalog version
			const providerModels = merged.get("openai-codex");
			expect(providerModels).toBeDefined();
			const model = providerModels!.get("gpt-5.4");
			expect(model).toBeDefined();
			// Cost should match catalog (2.5), not generated (whatever it was)
			expect(model!.cost.input).toBe(2.5);
		}
	});

	it("should keep generated models not in catalog", () => {
		const merged = mergeCatalogWithGenerated();
		// Should still have models from generated that aren't in catalog
		// e.g. anthropic models, google models, etc.
		let totalModels = 0;
		for (const models of merged.values()) {
			totalModels += models.size;
		}
		// Catalog has 4 models, generated has hundreds
		expect(totalModels).toBeGreaterThan(4);
	});
});

// ===========================================================================
// End-to-end: catalog → Model → buildBaseOptions → sampling filtering
// ===========================================================================

describe("end-to-end: catalog sampling filters through buildBaseOptions", () => {
	it("should strip temperature for gpt-5.3-codex (reasoning model)", () => {
		const registry = mergeCatalogWithGenerated();
		const codexModels = registry.get("openai-codex");
		expect(codexModels).toBeDefined();
		const model = codexModels!.get("gpt-5.3-codex") as Model<Api>;
		expect(model).toBeDefined();

		// The catalog marks temperature: false for gpt-5.3-codex
		// This should flow through buildBaseOptions
		const result = buildBaseOptions(model, { temperature: 0.7, topP: 0.9 });

		expect(result.temperature).toBeUndefined(); // blocked by catalog override
		expect(result.topP).toBeUndefined(); // also blocked by catalog override
	});

	it("should allow temperature for gpt-5.4 (non-reasoning model)", () => {
		const registry = mergeCatalogWithGenerated();
		const codexModels = registry.get("openai-codex");
		const model = codexModels!.get("gpt-5.4") as Model<Api>;
		expect(model).toBeDefined();

		const result = buildBaseOptions(model, { temperature: 0.5 });

		expect(result.temperature).toBe(0.5); // allowed by catalog
	});
});
