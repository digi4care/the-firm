/**
 * Tests for system prompt building — mode-aware prompt generation
 *
 * TDD: defines what Andre's system prompt looks like per mode.
 */

import { describe, expect, test } from "bun:test";

// ── Ad-hoc mode prompt ──────────────────────────

describe("buildSystemPrompt — ad-hoc mode", () => {
	test("contains Andre identity", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("ad-hoc");
		expect(prompt).toContain("Andre");
	});

	test("mentions subagent tool for delegation", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("ad-hoc");
		expect(prompt).toContain("subagent");
	});

	test("mentions run_chain is not used — subagent tool instead", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("ad-hoc");
		// Should NOT reference run_chain anymore
		expect(prompt).not.toContain("run_chain");
	});

	test("tells Andre to work directly for simple tasks", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("ad-hoc");
		expect(prompt).toMatch(/directly|zelf/i);
	});

	test("includes ad-hoc chain info: brainstorm → research → plan → build → review", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("ad-hoc");
		expect(prompt).toContain("brainstorm");
		expect(prompt).toContain("research");
		expect(prompt).toContain("plan");
		expect(prompt).toContain("build");
		expect(prompt).toContain("review");
	});
});

// ── Firm mode prompt ────────────────────────────

describe("buildSystemPrompt — firm mode", () => {
	test("contains Andre identity", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("firm");
		expect(prompt).toContain("Andre");
	});

	test("tells Andre to route to departments", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("firm");
		expect(prompt).toMatch(/department|route|doorsturen/i);
	});

	test("mentions /firm-pause command", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const prompt = buildSystemPrompt("firm");
		expect(prompt).toContain("/firm-pause");
	});
});

// ── Consistency ─────────────────────────────────

describe("buildSystemPrompt — consistency", () => {
	test("both modes mention Andre", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const adhoc = buildSystemPrompt("ad-hoc");
		const firm = buildSystemPrompt("firm");
		expect(adhoc).toContain("Andre");
		expect(firm).toContain("Andre");
	});

	test("both modes mention available commands", async () => {
		const { buildSystemPrompt } = await import("../system-prompt.js");
		const adhoc = buildSystemPrompt("ad-hoc");
		const firm = buildSystemPrompt("firm");
		expect(adhoc).toContain("/chain-status");
		expect(firm).toContain("/chain-status");
	});
});
