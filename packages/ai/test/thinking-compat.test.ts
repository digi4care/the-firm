import { describe, expect, it } from "vitest";
import { getSupportedThinkingLevels, getThinkingCompat, resolveThinkingLevel } from "../src/thinking-compat.js";

describe("ThinkingCompat", () => {
	describe("getThinkingCompat", () => {
		it("returns profile for known provider", () => {
			const profile = getThinkingCompat("anthropic");
			expect(profile).toBeDefined();
			expect(profile!.provider).toBe("anthropic");
			expect(profile!.format).toBe("anthropic");
		});

		it("returns null for unknown provider", () => {
			expect(getThinkingCompat("nonexistent-provider")).toBeNull();
		});

		it("returns correct format for openai", () => {
			const profile = getThinkingCompat("openai");
			expect(profile!.format).toBe("reasoning_effort");
		});

		it("returns correct format for google", () => {
			const profile = getThinkingCompat("google");
			expect(profile!.format).toBe("thinking_level");
		});

		it("returns boolean format for zai", () => {
			const profile = getThinkingCompat("zai");
			expect(profile!.format).toBe("enable_thinking");
		});
	});

	describe("getSupportedThinkingLevels", () => {
		it("anthropic supports high but not xhigh by default", () => {
			const levels = getSupportedThinkingLevels("anthropic", "claude-sonnet-4");
			expect(levels).toContain("minimal");
			expect(levels).toContain("low");
			expect(levels).toContain("medium");
			expect(levels).toContain("high");
			expect(levels).not.toContain("xhigh");
		});

		it("openai supports xhigh for gpt-5.x models", () => {
			const levels = getSupportedThinkingLevels("openai", "gpt-5.2");
			expect(levels).toContain("xhigh");
		});

		it("openai does not support xhigh for gpt-4o", () => {
			const levels = getSupportedThinkingLevels("openai", "gpt-4o");
			expect(levels).not.toContain("xhigh");
		});

		it("zai only supports low/medium/high (binary thinking)", () => {
			const levels = getSupportedThinkingLevels("zai", "glm-5.1");
			expect(levels).toContain("low");
			expect(levels).toContain("high");
			expect(levels).not.toContain("xhigh");
		});

		it("google supports minimal through high", () => {
			const levels = getSupportedThinkingLevels("google", "gemini-2.5-pro");
			expect(levels).toContain("minimal");
			expect(levels).toContain("high");
			expect(levels).not.toContain("xhigh");
		});
	});

	describe("resolveThinkingLevel", () => {
		it("passes through valid level for anthropic", () => {
			const result = resolveThinkingLevel("anthropic", "claude-sonnet-4", "high");
			expect(result.resolved).toBe("high");
			expect(result.clamped).toBe(false);
		});

		it("clamps xhigh to high for anthropic", () => {
			const result = resolveThinkingLevel("anthropic", "claude-sonnet-4", "xhigh");
			expect(result.resolved).toBe("high");
			expect(result.clamped).toBe(true);
			expect(result.original).toBe("xhigh");
		});

		it("allows xhigh for gpt-5.2", () => {
			const result = resolveThinkingLevel("openai", "gpt-5.2", "xhigh");
			expect(result.resolved).toBe("xhigh");
			expect(result.clamped).toBe(false);
		});

		it("clamps xhigh for non-5.x openai models", () => {
			const result = resolveThinkingLevel("openai", "o3", "xhigh");
			expect(result.resolved).toBe("high");
			expect(result.clamped).toBe(true);
		});

		it("maps level for enable_thinking provider", () => {
			// zai only uses enable_thinking=true/false, so medium/high → true
			const result = resolveThinkingLevel("zai", "glm-5.1", "high");
			expect(result.resolved).toBe("high");
			expect(result.apiValue).toBe(true);
		});

		it("returns minimal as false for enable_thinking provider", () => {
			const result = resolveThinkingLevel("zai", "glm-5.1", "minimal");
			expect(result.apiValue).toBe(false);
		});

		it("unknown provider clamps xhigh as safe default", () => {
			const result = resolveThinkingLevel("unknown-provider", "some-model", "xhigh");
			expect(result.resolved).toBe("high");
			expect(result.clamped).toBe(true);
		});
	});
});
