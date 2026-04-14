import { Agent } from "@digi4care/the-firm-agent-core";
import { getModel } from "@digi4care/the-firm-ai";
import { describe, expect, it } from "vitest";
import { AgentSession } from "../src/core/agent-session.js";
import { AuthStorage } from "../src/core/auth-storage.js";
import { ModelRegistry } from "../src/core/model-registry.js";
import { SessionManager } from "../src/core/session-manager.js";
import { SettingsManager } from "../src/core/settings-manager.js";
import { createTestResourceLoader } from "./utilities.js";

function createSessionWithModel(provider: string, modelId: string) {
	const model = getModel(provider as any, modelId as any);
	if (!model) {
		throw new Error(`Model not found: ${provider}/${modelId}`);
	}

	const settingsManager = SettingsManager.inMemory();
	const sessionManager = SessionManager.inMemory();
	const authStorage = AuthStorage.inMemory();
	authStorage.setRuntimeApiKey(provider, "test-key");

	const session = new AgentSession({
		agent: new Agent({
			getApiKey: () => "test-key",
			initialState: {
				model,
				systemPrompt: "You are a helpful assistant.",
				tools: [],
				thinkingLevel: "high",
			},
		}),
		sessionManager,
		settingsManager,
		cwd: process.cwd(),
		modelRegistry: ModelRegistry.inMemory(authStorage),
		resourceLoader: createTestResourceLoader(),
	});

	return { session, model };
}

describe("AgentSession thinking-compat integration", () => {
	it("returns levels with xhigh for gpt-5.4 on openai-codex", () => {
		const { session } = createSessionWithModel("openai-codex", "gpt-5.4");
		try {
			const levels = session.getAvailableThinkingLevels();
			expect(levels).toContain("xhigh");
			expect(levels).toEqual(["off", "minimal", "low", "medium", "high", "xhigh"]);
		} finally {
			session.dispose();
		}
	});

	it("returns levels without xhigh for zai glm-4.5", () => {
		const { session } = createSessionWithModel("zai", "glm-4.5");
		try {
			const levels = session.getAvailableThinkingLevels();
			expect(levels).not.toContain("xhigh");
			expect(levels).toEqual(["off", "minimal", "low", "medium", "high"]);
		} finally {
			session.dispose();
		}
	});

	it("returns levels without xhigh for opencode glm-5.1", () => {
		const { session } = createSessionWithModel("opencode", "glm-5.1");
		try {
			const levels = session.getAvailableThinkingLevels();
			expect(levels).not.toContain("xhigh");
			expect(levels).toEqual(["off", "minimal", "low", "medium", "high"]);
		} finally {
			session.dispose();
		}
	});

	it("returns levels with xhigh for anthropic opus-4-6", () => {
		const { session } = createSessionWithModel("anthropic", "claude-opus-4-6");
		try {
			const levels = session.getAvailableThinkingLevels();
			expect(levels).toContain("xhigh");
			expect(levels).toEqual(["off", "minimal", "low", "medium", "high", "xhigh"]);
		} finally {
			session.dispose();
		}
	});

	it("supportsXhighThinking matches getAvailableThinkingLevels presence of xhigh", () => {
		const { session: sessionWith } = createSessionWithModel("openai-codex", "gpt-5.4");
		const { session: sessionWithout } = createSessionWithModel("zai", "glm-4.5");
		try {
			expect(sessionWith.supportsXhighThinking()).toBe(true);
			expect(sessionWithout.supportsXhighThinking()).toBe(false);
			expect(sessionWith.getAvailableThinkingLevels()).toContain("xhigh");
			expect(sessionWithout.getAvailableThinkingLevels()).not.toContain("xhigh");
		} finally {
			sessionWith.dispose();
			sessionWithout.dispose();
		}
	});
});
