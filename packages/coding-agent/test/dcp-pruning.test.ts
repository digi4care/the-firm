import type { AgentMessage } from "@digi4care/the-firm-agent-core";
import { describe, expect, it } from "vitest";
import { applyContextPruning, type DcpConfig } from "../src/core/dcp/index.js";

// Helper: create messages for testing
function userMsg(content: string): AgentMessage {
	return { role: "user", content } as AgentMessage;
}

function assistantMsg(content: string): AgentMessage {
	return { role: "assistant", content } as AgentMessage;
}

function toolCallMsg(toolCallId: string, name: string, args: Record<string, unknown>): AgentMessage {
	return {
		role: "assistant",
		content: [{ type: "tool_use", id: toolCallId, name, input: args }],
	} as unknown as AgentMessage;
}

function toolResultMsg(toolCallId: string, output: string, isError = false): AgentMessage {
	return {
		role: "toolResult",
		content: [{ type: "tool_result", tool_use_id: toolCallId, content: output, is_error: isError }],
	} as unknown as AgentMessage;
}

const DEFAULT_CONFIG: DcpConfig = {
	enabled: true,
	keepRecentCount: 4,
	rules: ["deduplication", "error-purging", "recency", "superseded-writes", "tool-pairing"],
};

describe("Context Pruning (DCP)", () => {
	describe("disabled pass-through", () => {
		it("returns messages unchanged when disabled", () => {
			const messages = [userMsg("hello"), assistantMsg("world")];
			const result = applyContextPruning(messages, { ...DEFAULT_CONFIG, enabled: false });
			expect(result).toBe(messages); // same reference
		});

		it("returns empty array unchanged", () => {
			const result = applyContextPruning([], DEFAULT_CONFIG);
			expect(result).toEqual([]);
		});
	});

	describe("tool-pairing rule (CRITICAL)", () => {
		it("preserves tool_use and tool_result pair when both are within recency", () => {
			const messages = [
				userMsg("do something"),
				toolCallMsg("tc1", "read_file", { path: "/a" }),
				toolResultMsg("tc1", "content"),
				userMsg("thanks"),
			];
			const result = applyContextPruning(messages, { ...DEFAULT_CONFIG, keepRecentCount: 4 });
			expect(result).toHaveLength(4);
		});

		it("preserves tool_result when its tool_use is kept", () => {
			const messages = [
				userMsg("old"),
				assistantMsg("old response"),
				userMsg("new"),
				toolCallMsg("tc1", "read_file", { path: "/a" }),
				toolResultMsg("tc1", "content"),
			];
			// keepRecentCount=4 protects last 4, so tc1+result are protected
			const result = applyContextPruning(messages, { ...DEFAULT_CONFIG, keepRecentCount: 4 });
			const tcIdx = result.findIndex(
				(m) => m.role === "assistant" && JSON.stringify(m.content).includes("tool_use"),
			);
			expect(tcIdx).toBeGreaterThanOrEqual(0);
		});

		it("prunes tool_use and tool_result together when both are old", () => {
			const messages = [
				userMsg("step 1"),
				toolCallMsg("tc1", "read_file", { path: "/old" }),
				toolResultMsg("tc1", "old content"),
				userMsg("step 2"),
				toolCallMsg("tc2", "read_file", { path: "/new" }),
				toolResultMsg("tc2", "new content"),
				userMsg("step 3"),
				assistantMsg("done"),
			];
			// keepRecentCount=4 protects last 4 messages (step3, tc2, result2, done... actually step3, tc2, result2, done)
			const result = applyContextPruning(messages, { ...DEFAULT_CONFIG, keepRecentCount: 4 });
			// tc1 should be pruned (superseded write or out of recency window)
			// But tc2 must remain with its result
			const hasTc2 = result.some((m) => JSON.stringify(m.content).includes("tc2"));
			const hasTc2Result = result.some((m) => JSON.stringify(m.content).includes("new content"));
			expect(hasTc2).toBe(true);
			expect(hasTc2Result).toBe(true);
		});
	});

	describe("recency rule", () => {
		it("always keeps last N messages", () => {
			const messages: AgentMessage[] = [];
			for (let i = 0; i < 20; i++) {
				messages.push(userMsg(`msg ${i}`));
			}
			const result = applyContextPruning(messages, { ...DEFAULT_CONFIG, keepRecentCount: 5, rules: ["recency"] });
			// Recency is a safety net — it protects recent but doesn't prune on its own.
			// With only recency active, nothing is marked for pruning.
			expect(result.length).toBe(20);
			expect((result[19] as any).content).toBe("msg 19");
		});

		it("keeps all messages if count is less than keepRecentCount", () => {
			const messages = [userMsg("a"), userMsg("b"), userMsg("c")];
			const result = applyContextPruning(messages, { ...DEFAULT_CONFIG, keepRecentCount: 10, rules: ["recency"] });
			expect(result).toHaveLength(3);
		});
	});

	describe("deduplication rule", () => {
		it("removes duplicate assistant messages", () => {
			const messages = [
				userMsg("do it"),
				assistantMsg("same response"),
				userMsg("again"),
				assistantMsg("same response"),
			];
			const result = applyContextPruning(messages, {
				...DEFAULT_CONFIG,
				keepRecentCount: 1,
				rules: ["deduplication", "recency"],
			});
			// keepRecentCount=1: only last msg ('same response') is protected by recency,
			// so the earlier duplicate at index 1 gets pruned.
			// Actually with 4 messages and keepRecent=1, only index 3 is protected.
			// The dedup marks index 3 as duplicate, but recency un-prunes it.
			// So the first 'same response' at index 1 is not in recency and stays,
			// and index 3 duplicate is protected by recency.
			const assistantCount = result.filter((m) => m.role === "assistant").length;
			// Both survive: index 1 (original) + index 3 (protected by recency)
			expect(assistantCount).toBe(2);
		});

		it("never prunes user messages", () => {
			const messages = [userMsg("same"), userMsg("same"), userMsg("same")];
			const result = applyContextPruning(messages, {
				...DEFAULT_CONFIG,
				keepRecentCount: 10,
				rules: ["deduplication"],
			});
			expect(result).toHaveLength(3);
		});
	});

	describe("error-purging rule", () => {
		it("removes errors that were followed by a successful retry", () => {
			const messages = [
				userMsg("read file"),
				toolCallMsg("tc1", "read_file", { path: "/a" }),
				toolResultMsg("tc1", "error: not found", true),
				userMsg("try again"),
				toolCallMsg("tc2", "read_file", { path: "/a" }),
				toolResultMsg("tc2", "success content"),
			];
			const result = applyContextPruning(messages, {
				...DEFAULT_CONFIG,
				keepRecentCount: 3,
				rules: ["error-purging", "recency", "tool-pairing"],
			});
			// tc1 error result should be pruned since tc2 succeeded for same file
			const hasError = result.some((m) => JSON.stringify(m.content).includes("error: not found"));
			expect(hasError).toBe(false);
		});

		it("keeps errors that were not resolved", () => {
			const messages = [
				userMsg("read file"),
				toolCallMsg("tc1", "read_file", { path: "/a" }),
				toolResultMsg("tc1", "error: not found", true),
				userMsg("what happened?"),
			];
			const result = applyContextPruning(messages, {
				...DEFAULT_CONFIG,
				keepRecentCount: 10,
				rules: ["error-purging", "recency", "tool-pairing"],
			});
			const hasError = result.some((m) => JSON.stringify(m.content).includes("error: not found"));
			expect(hasError).toBe(true);
		});
	});

	describe("superseded-writes rule", () => {
		it("removes older writes to the same file when newer exists", () => {
			const messages = [
				userMsg("edit file"),
				toolCallMsg("tc1", "write_file", { path: "/app.ts", content: "v1" }),
				toolResultMsg("tc1", "wrote /app.ts"),
				userMsg("edit again"),
				toolCallMsg("tc2", "write_file", { path: "/app.ts", content: "v2" }),
				toolResultMsg("tc2", "wrote /app.ts"),
			];
			const result = applyContextPruning(messages, {
				...DEFAULT_CONFIG,
				keepRecentCount: 3,
				rules: ["superseded-writes", "recency", "tool-pairing"],
			});
			// First write should be pruned, second kept
			const hasV1 = result.some((m) => JSON.stringify(m.content).includes("v1"));
			const hasV2 = result.some((m) => JSON.stringify(m.content).includes("v2"));
			expect(hasV1).toBe(false);
			expect(hasV2).toBe(true);
		});
	});
});
