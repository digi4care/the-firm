import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getModel } from "@digi4care/the-firm-ai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentSession } from "../src/core/sdk.js";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("createAgentSession sampling parameters", () => {
	let tempDir: string;
	let cwd: string;
	let agentDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-sdk-sampling-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		cwd = join(tempDir, "project");
		agentDir = join(tempDir, "agent");
		mkdirSync(cwd, { recursive: true });
		mkdirSync(agentDir, { recursive: true });
	});

	afterEach(() => {
		if (tempDir && existsSync(tempDir)) {
			rmSync(tempDir, { recursive: true, force: true });
		}
	});

	it("wires sampling parameters from settings to agent config", async () => {
		const model = getModel("anthropic", "claude-sonnet-4-5");
		expect(model).toBeTruthy();

		const settingsManager = SettingsManager.inMemory({
			sampling: {
				temperature: 0.7,
				topP: 0.9,
				topK: 50,
				minP: 0.05,
				presencePenalty: 0.6,
				repetitionPenalty: 1.2,
			},
		});

		const { session } = await createAgentSession({
			cwd,
			agentDir,
			model: model!,
			settingsManager,
		});

		// The Agent should have the sampling parameters from settings
		expect(session.agent.temperature).toBe(0.7);
		expect(session.agent.topP).toBe(0.9);
		expect(session.agent.topK).toBe(50);
		expect(session.agent.minP).toBe(0.05);
		expect(session.agent.presencePenalty).toBe(0.6);
		expect(session.agent.repetitionPenalty).toBe(1.2);

		session.dispose();
	});

	it("uses -1 (omit) as default for sampling parameters", async () => {
		const model = getModel("anthropic", "claude-sonnet-4-5");
		expect(model).toBeTruthy();

		const settingsManager = SettingsManager.inMemory();

		const { session } = await createAgentSession({
			cwd,
			agentDir,
			model: model!,
			settingsManager,
		});

		// Default should be -1 (meaning "omit" / use provider default)
		expect(session.agent.temperature).toBe(-1);
		expect(session.agent.topP).toBe(-1);
		expect(session.agent.topK).toBe(-1);
		expect(session.agent.minP).toBe(-1);
		expect(session.agent.presencePenalty).toBe(-1);
		expect(session.agent.repetitionPenalty).toBe(-1);

		session.dispose();
	});
});
