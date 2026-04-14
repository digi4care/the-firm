import { describe, expect, it } from "vitest";
import { bootstrapSettings } from "../src/core/settings-bootstrap.js";
import { SettingsManager } from "../src/core/settings-manager.js";
import { createBashToolDefinition } from "../src/core/tools/bash.js";

describe("bash interceptor", () => {
	it("blocks find commands when interceptor is enabled", async () => {
		const tool = createBashToolDefinition("/tmp", { interceptorEnabled: true });
		const result = await tool.execute("test", { command: "find . -name '*.ts'" });
		const text = result.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
		expect(text).toContain("intercepted");
		expect(text).toContain("find");
	});

	it("blocks grep commands when interceptor is enabled", async () => {
		const tool = createBashToolDefinition("/tmp", { interceptorEnabled: true });
		const result = await tool.execute("test", { command: "grep -r 'pattern' src/" });
		const text = result.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
		expect(text).toContain("intercepted");
		expect(text).toContain("grep");
	});

	it("blocks cat commands when interceptor is enabled", async () => {
		const tool = createBashToolDefinition("/tmp", { interceptorEnabled: true });
		const result = await tool.execute("test", { command: "cat package.json" });
		const text = result.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
		expect(text).toContain("intercepted");
		expect(text).toContain("read");
	});

	it("does not block when interceptor is disabled", async () => {
		const tool = createBashToolDefinition("/tmp", { interceptorEnabled: false });
		// This will actually try to run the command, so use a harmless one
		const result = await tool.execute("test", { command: "echo hello" });
		const text = result.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
		expect(text).not.toContain("intercepted");
	});

	it("does not block when interceptor is not set", async () => {
		const tool = createBashToolDefinition("/tmp");
		const result = await tool.execute("test", { command: "echo hello" });
		const text = result.content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
		expect(text).not.toContain("intercepted");
	});
});
