import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getModel } from "@digi4care/the-firm-ai";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentSession } from "../src/core/sdk.js";
import { SettingsManager } from "../src/core/settings-manager.js";

describe("createAgentSession interruptMode", () => {
	let tempDir: string;
	let cwd: string;
	let agentDir: string;

	beforeEach(() => {
		tempDir = join(tmpdir(), `pi-sdk-interrupt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

	it("wires interruptMode=immediate from settings to agent by default", async () => {
		const model = getModel("anthropic", "claude-sonnet-4-5");
		expect(model).toBeTruthy();

		const settingsManager = SettingsManager.inMemory();
		const { session } = await createAgentSession({
			cwd,
			agentDir,
			model: model!,
			settingsManager,
		});

		expect(session.agent.interruptMode).toBe("immediate");
		session.dispose();
	});

	it("wires interruptMode=wait from settings to agent", async () => {
		const model = getModel("anthropic", "claude-sonnet-4-5");
		expect(model).toBeTruthy();

		const settingsManager = SettingsManager.inMemory({
			interruptMode: "wait",
		});
		const { session } = await createAgentSession({
			cwd,
			agentDir,
			model: model!,
			settingsManager,
		});

		expect(session.agent.interruptMode).toBe("wait");
		session.dispose();
	});
});
