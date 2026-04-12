import { beforeEach, describe, expect, it, vi } from "vitest";
import { getModel } from "../src/models.js";
import { AssistantMessageEventStream } from "../src/utils/event-stream.js";

const anthropicSpy = vi.fn();

vi.mock("../src/utils/oauth/kimi.js", () => ({
	getKimiCommonHeaders: vi.fn(async () => ({
		"X-Msh-Platform": "kimi_cli",
		"X-Msh-Device-Id": "device-123",
	})),
}));

vi.mock("../src/providers/anthropic.js", () => ({
	streamSimpleAnthropic: vi.fn((model, _context, options) => {
		anthropicSpy({ model, options });
		const stream = new AssistantMessageEventStream();
		stream.push({
			type: "done",
			reason: "stop",
			message: {
				role: "assistant",
				content: [{ type: "text", text: "ok" }],
				api: model.api,
				provider: model.provider,
				model: model.id,
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
			},
		});
		return stream;
	}),
}));

describe("Kimi provider wrapper", () => {
	beforeEach(() => {
		anthropicSpy.mockClear();
	});

	it("routes kimi-coding through anthropic with kimi headers", async () => {
		const { streamSimple } = await import("../src/stream.js");
		const model = getModel("kimi-coding", "kimi-k2-thinking");
		const stream = streamSimple(model, { messages: [] }, { apiKey: "kimi-test-key", headers: { "X-Test": "1" } });
		await stream.result();

		expect(anthropicSpy).toHaveBeenCalledTimes(1);
		const call = anthropicSpy.mock.calls[0]?.[0];
		expect(call.model.baseUrl).toBe("https://api.kimi.com/coding");
		expect(call.options.headers).toMatchObject({
			"X-Msh-Platform": "kimi_cli",
			"X-Msh-Device-Id": "device-123",
			"X-Test": "1",
		});
	});
});
