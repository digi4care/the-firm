import { Agent } from "@digi4care/the-firm-agent-core";
import { getModel } from "@digi4care/the-firm-ai";
import { describe, expect, it } from "vitest";
import { AgentSession } from "../src/core/agent-session.js";
import { AuthStorage } from "../src/core/auth-storage.js";
import { ModelRegistry } from "../src/core/model-registry.js";
import { SessionManager } from "../src/core/session-manager.js";
import { SettingsManager } from "../src/core/settings-manager.js";
import { createTestResourceLoader } from "./utilities.js";

function createAgentWithDcp(enabled: boolean, keepRecentCount = 4, existingTransform?: (messages: any[]) => any[]) {
	const model = getModel("anthropic", "claude-sonnet-4-5")!;
	const settingsManager = SettingsManager.inMemory({
		contextPruning: { enabled },
	});
	settingsManager.setContextPruningKeepRecentCount(keepRecentCount);
	const sessionManager = SessionManager.inMemory();
	const authStorage = AuthStorage.inMemory();
	authStorage.setRuntimeApiKey("anthropic", "test-key");

	const agent = new Agent({
		getApiKey: () => "test-key",
		initialState: {
			model,
			systemPrompt: "You are a helpful assistant.",
			tools: [],
		},
		transformContext: existingTransform ? async (messages) => existingTransform(messages) : undefined,
	});

	const session = new AgentSession({
		agent,
		sessionManager,
		settingsManager,
		cwd: process.cwd(),
		modelRegistry: ModelRegistry.inMemory(authStorage),
		resourceLoader: createTestResourceLoader(),
	});

	return { session, agent, settingsManager };
}

function userMsg(content: string): any {
	return { role: "user", content, timestamp: Date.now() };
}

function assistantMsg(content: string): any {
	return {
		role: "assistant",
		content: [{ type: "text", text: content }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-sonnet-4-5",
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

describe("AgentSession DCP integration", () => {
	it("prunes duplicate messages from LLM context when enabled", async () => {
		const { session, agent } = createAgentWithDcp(true, 1);
		try {
			// Seed agent state with duplicate assistant messages
			agent.state.messages = [
				userMsg("hello"),
				assistantMsg("same response"),
				userMsg("again"),
				assistantMsg("same response"),
				userMsg("final"),
			];

			const transformed = await agent.transformContext!(agent.state.messages, undefined);

			// Deduplication marks index 3 (second "same response") as duplicate.
			// With keepRecentCount=1, recency only protects index 4 (user "final").
			// So index 3 gets pruned. Index 1 (first "same response") stays.
			expect(transformed.length).toBe(4);
			expect(transformed.filter((m) => m.role === "assistant").length).toBe(1);
			expect(
				transformed.some((m) => m.role === "assistant" && (m as any).content[0]?.text === "same response"),
			).toBe(true);
		} finally {
			session.dispose();
		}
	});

	it("leaves messages unchanged when DCP is disabled", async () => {
		const { session, agent } = createAgentWithDcp(false);
		try {
			agent.state.messages = [
				userMsg("hello"),
				assistantMsg("same response"),
				userMsg("again"),
				assistantMsg("same response"),
			];

			const transformed = await agent.transformContext!(agent.state.messages, undefined);

			expect(transformed.length).toBe(4);
			expect(transformed).toEqual(agent.state.messages);
		} finally {
			session.dispose();
		}
	});

	it("composes DCP with an existing transformContext", async () => {
		const { session, agent } = createAgentWithDcp(true, 1, (messages) => messages.filter((m) => m.role !== "custom"));
		try {
			agent.state.messages = [
				userMsg("hello"),
				assistantMsg("same response"),
				assistantMsg("same response"),
				userMsg("final"),
				{ role: "custom", customType: "test", content: "ignored" } as any,
			];

			const transformed = await agent.transformContext!(agent.state.messages, undefined);

			// Existing transform removes custom messages; DCP removes duplicate assistant at index 2
			// Recency protects only the last message (user "final"), so index 2 is pruned.
			expect(transformed.some((m) => m.role === "custom")).toBe(false);
			expect(transformed.filter((m) => m.role === "assistant").length).toBe(1);
			expect(transformed.length).toBe(3); // user, assistant, user
		} finally {
			session.dispose();
		}
	});
});
