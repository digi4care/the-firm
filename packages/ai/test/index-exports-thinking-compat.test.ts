import { describe, expect, it } from "vitest";
import {
	getThinkingCompat,
	getSupportedThinkingLevels,
	resolveThinkingLevel,
	supportsXhigh,
} from "../src/index.js";

describe("index.ts exports thinking-compat", () => {
	it("exports getThinkingCompat", () => {
		const profile = getThinkingCompat("anthropic");
		expect(profile).toBeDefined();
		expect(profile!.provider).toBe("anthropic");
	});

	it("exports getSupportedThinkingLevels", () => {
		const levels = getSupportedThinkingLevels("anthropic", "claude-sonnet-4");
		expect(levels).toContain("high");
		expect(levels).not.toContain("xhigh");
	});

	it("exports resolveThinkingLevel", () => {
		const result = resolveThinkingLevel("openai", "gpt-5.2", "xhigh");
		expect(result.resolved).toBe("xhigh");
		expect(result.clamped).toBe(false);
	});

	it("exports supportsXhigh from thinking-compat", () => {
		expect(supportsXhigh("openai", "gpt-5.2")).toBe(true);
		expect(supportsXhigh("zai", "glm-5.1")).toBe(false);
	});
});
