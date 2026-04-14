import { Agent } from "@digi4care/the-firm-agent-core";
import { getModel } from "@digi4care/the-firm-ai";
import { Type } from "@sinclair/typebox";
import { describe, expect, it } from "vitest";
import { AgentSession } from "../src/core/agent-session.js";
import { AuthStorage } from "../src/core/auth-storage.js";
import { ModelRegistry } from "../src/core/model-registry.js";
import { SessionManager } from "../src/core/session-manager.js";
import { SettingsManager } from "../src/core/settings-manager.js";
import { createTestResourceLoader } from "./utilities.js";

function createSessionWithRepeatToolDescriptions(repeatToolDescriptions: boolean) {
	const model = getModel("anthropic", "claude-sonnet-4-5")!;
	const settingsManager = SettingsManager.inMemory({
		repeatToolDescriptions,
	});
	const sessionManager = SessionManager.inMemory();
	const authStorage = AuthStorage.inMemory();
	authStorage.setRuntimeApiKey("anthropic", "test-key");

	const echoTool = {
		name: "echo",
		label: "Echo",
		description: "Echo text back to the user.",
		parameters: Type.Object({ text: Type.String() }),
		execute: async (_toolCallId: string, params: unknown) => {
			const { text } = params as { text: string };
			return {
				content: [{ type: "text" as const, text }],
				details: {},
			};
		},
	};

	const session = new AgentSession({
		agent: new Agent({
			getApiKey: () => "test-key",
			initialState: {
				model,
				systemPrompt: "You are a helpful assistant.",
				tools: [echoTool],
				thinkingLevel: "high",
			},
		}),
		sessionManager,
		settingsManager,
		cwd: process.cwd(),
		modelRegistry: ModelRegistry.inMemory(authStorage),
		resourceLoader: createTestResourceLoader(),
		baseToolsOverride: { echo: echoTool },
	});

	return { session, settingsManager };
}

describe("AgentSession repeatToolDescriptions integration", () => {
	it("includes full tool descriptions in system prompt when enabled", () => {
		const { session, settingsManager } = createSessionWithRepeatToolDescriptions(true);
		try {
			expect(settingsManager.getRepeatToolDescriptions()).toBe(true);
			const systemPrompt = session.agent.state.systemPrompt;
			expect(systemPrompt).toContain("## Tool Descriptions");
			expect(systemPrompt).toContain("echo");
			expect(systemPrompt).toContain("Echo text back to the user.");
		} finally {
			session.dispose();
		}
	});

	it("omits full tool descriptions in system prompt when disabled", () => {
		const { session, settingsManager } = createSessionWithRepeatToolDescriptions(false);
		try {
			expect(settingsManager.getRepeatToolDescriptions()).toBe(false);
			const systemPrompt = session.agent.state.systemPrompt;
			expect(systemPrompt).not.toContain("## Tool Descriptions");
		} finally {
			session.dispose();
		}
	});
});
