import { describe, expect, it } from "vitest";
import { Agent } from "../src/agent.js";

describe("Agent interruptMode", () => {
	it("defaults to wait", () => {
		const agent = new Agent();
		expect(agent.interruptMode).toBe("wait");
	});

	it("can be set to immediate", () => {
		const agent = new Agent({ interruptMode: "immediate" });
		expect(agent.interruptMode).toBe("immediate");
	});

	it("peekSteeringMessages returns false when no steering queued", async () => {
		const agent = new Agent({ interruptMode: "immediate" });
		const config = (agent as any).createLoopConfig();
		expect(config.peekSteeringMessages?.()).toBe(false);
	});

	it("peekSteeringMessages returns true when steering is queued", async () => {
		const agent = new Agent({ interruptMode: "immediate" });
		agent.steer({ role: "user", content: [{ type: "text", text: "stop" }], timestamp: Date.now() });
		const config = (agent as any).createLoopConfig();
		expect(config.peekSteeringMessages?.()).toBe(true);
	});
});
