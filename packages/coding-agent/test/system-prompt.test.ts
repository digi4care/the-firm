import { describe, expect, test } from "vitest";
import { buildSystemPrompt } from "../src/core/system-prompt.js";
import type { ToolDefinition } from "../src/core/extensions/types.js";

describe("buildSystemPrompt", () => {
	describe("empty tools", () => {
		test("shows (none) for empty tools list", () => {
			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
			});
			expect(prompt).toContain("Available tools:\n(none)");
		});
		test("shows file paths guideline even with no tools", () => {
			const prompt = buildSystemPrompt({
				selectedTools: [],
				contextFiles: [],
				skills: [],
			});
			expect(prompt).toContain("Show file paths clearly");
		});
	});

	describe("default tools", () => {
		test("includes all default tools when snippets are provided", () => {
			const prompt = buildSystemPrompt({
				toolSnippets: {
					read: "Read file contents",
					bash: "Execute bash commands",
					edit: "Make surgical edits",
					write: "Create or overwrite files",
				},
				contextFiles: [],
				skills: [],
			});
			expect(prompt).toContain("- read:");
			expect(prompt).toContain("- bash:");
			expect(prompt).toContain("- edit:");
			expect(prompt).toContain("- write:");
		});
	});

	describe("custom tool snippets", () => {
		test("includes custom tools in available tools section when promptSnippet is provided", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				toolSnippets: {
					dynamic_tool: "Run dynamic test behavior",
				},
				contextFiles: [],
				skills: [],
			});
			expect(prompt).toContain("- dynamic_tool: Run dynamic test behavior");
		});
		test("omits custom tools from available tools section when promptSnippet is not provided", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				contextFiles: [],
				skills: [],
			});
			expect(prompt).not.toContain("dynamic_tool");
		});
	});

	describe("prompt guidelines", () => {
		test("appends promptGuidelines to default guidelines", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				promptGuidelines: ["Use dynamic_tool for project summaries."],
				contextFiles: [],
				skills: [],
			});
			expect(prompt).toContain("- Use dynamic_tool for project summaries.");
		});
		test("deduplicates and trims promptGuidelines", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "dynamic_tool"],
				promptGuidelines: ["Use dynamic_tool for summaries.", "  Use dynamic_tool for summaries.  ", "   "],
				contextFiles: [],
				skills: [],
			});
			expect(prompt.match(/- Use dynamic_tool for summaries\./g)).toHaveLength(1);
		});
	});

	describe("repeatToolDescriptions", () => {
		const mockTools: ToolDefinition[] = [
			{
				name: "read",
				label: "Read",
				description: "Read the contents of a file.",
				parameters: { type: "object", properties: { path: { type: "string" } } } as any,
			},
			{
				name: "bash",
				label: "Bash",
				description: "Execute a bash command.",
				parameters: { type: "object", properties: { command: { type: "string" } } } as any,
			},
		];

		test("includes full tool descriptions when repeatToolDescriptions is true", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "bash"],
				toolSnippets: { read: "Read file", bash: "Run command" },
				repeatToolDescriptions: true,
				toolDefinitions: mockTools,
				contextFiles: [],
				skills: [],
			});
			expect(prompt).toContain("## Tool Descriptions");
			expect(prompt).toContain("read");
			expect(prompt).toContain("Read the contents of a file.");
			expect(prompt).toContain("bash");
			expect(prompt).toContain("Execute a bash command.");
		});

		test("omits full tool descriptions when repeatToolDescriptions is false", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "bash"],
				toolSnippets: { read: "Read file", bash: "Run command" },
				repeatToolDescriptions: false,
				toolDefinitions: mockTools,
				contextFiles: [],
				skills: [],
			});
			expect(prompt).not.toContain("## Tool Descriptions");
		});

		test("omits full tool descriptions when repeatToolDescriptions is undefined", () => {
			const prompt = buildSystemPrompt({
				selectedTools: ["read", "bash"],
				toolSnippets: { read: "Read file", bash: "Run command" },
				toolDefinitions: mockTools,
				contextFiles: [],
				skills: [],
			});
			expect(prompt).not.toContain("## Tool Descriptions");
		});
	});
});
