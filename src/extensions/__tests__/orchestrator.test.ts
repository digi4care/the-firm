/**
 * Tests for the Orchestrator extension (Andre)
 *
 * Tests cover:
 *   - Chain YAML parsing (including parallel_group)
 *   - Agent file parsing (including skills frontmatter)
 *   - FirmState detection
 *   - Chain execution flow (sequential + parallel groups)
 */

import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseAgentFile, parseChainYaml } from "../orchestrator.js";

// ── Chain YAML Parser ────────────────────────────

describe("parseChainYaml", () => {
	test("parses minimal chain with one step", () => {
		const yaml = `test:
  description: "Test chain"
  steps:
    - agent: builder
      prompt: Build $INPUT
`;
		const chains = parseChainYaml(yaml);
		expect(chains).toHaveLength(1);
		expect(chains[0].name).toBe("test");
		expect(chains[0].description).toBe("Test chain");
		expect(chains[0].steps).toHaveLength(1);
		expect(chains[0].steps[0].agent).toBe("builder");
	});

	test("parses chain with parallel_group", () => {
		const yaml = `adhoc:
  description: "Ad-hoc pipeline"
  steps:
    - agent: researcher-codebase
      parallel_group: research
      prompt: Research codebase
    - agent: researcher-external
      parallel_group: research
      prompt: Research external
    - agent: planner
      prompt: Plan it
`;
		const chains = parseChainYaml(yaml);
		expect(chains).toHaveLength(1);
		expect(chains[0].steps).toHaveLength(3);
		expect(chains[0].steps[0].parallelGroup).toBe("research");
		expect(chains[0].steps[1].parallelGroup).toBe("research");
		expect(chains[0].steps[2].parallelGroup).toBeUndefined();
	});

	test("parses multiple chains", () => {
		const yaml = `chain-a:
  description: "Chain A"
  steps:
    - agent: builder
      prompt: Build A

chain-b:
  description: "Chain B"
  steps:
    - agent: reviewer
      prompt: Review B
`;
		const chains = parseChainYaml(yaml);
		expect(chains).toHaveLength(2);
		expect(chains[0].name).toBe("chain-a");
		expect(chains[1].name).toBe("chain-b");
	});

	test("parses quoted description", () => {
		const yaml = `mychain:
  description: "A longer description here"
  steps:
    - agent: builder
      prompt: Do stuff
`;
		const chains = parseChainYaml(yaml);
		expect(chains[0].description).toBe("A longer description here");
	});

	test("handles empty YAML", () => {
		const chains = parseChainYaml("");
		expect(chains).toHaveLength(0);
	});

	test("parses two parallel groups (research + review)", () => {
		const yaml = `adhoc:
  description: "Full pipeline"
  steps:
    - agent: brainstormer
      prompt: Brainstorm
    - agent: researcher-codebase
      parallel_group: research
      prompt: Research code
    - agent: researcher-external
      parallel_group: research
      prompt: Research docs
    - agent: planner
      prompt: Plan
    - agent: builder
      prompt: Build
    - agent: reviewer-code
      parallel_group: review
      prompt: Review code
    - agent: reviewer-tests
      parallel_group: review
      prompt: Review tests
`;
		const chains = parseChainYaml(yaml);
		const steps = chains[0].steps;

		expect(steps).toHaveLength(7);
		expect(steps[0].parallelGroup).toBeUndefined(); // brainstormer
		expect(steps[1].parallelGroup).toBe("research"); // researcher-codebase
		expect(steps[2].parallelGroup).toBe("research"); // researcher-external
		expect(steps[3].parallelGroup).toBeUndefined(); // planner
		expect(steps[4].parallelGroup).toBeUndefined(); // builder
		expect(steps[5].parallelGroup).toBe("review"); // reviewer-code
		expect(steps[6].parallelGroup).toBe("review"); // reviewer-tests
	});
});

// ── Agent File Parser ────────────────────────────

describe("parseAgentFile", () => {
	const tmpDir = join(import.meta.dir, "__tmp_agent_test__");

	// Setup
	function setup() {
		if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
		mkdirSync(tmpDir, { recursive: true });
	}

	// Cleanup
	function cleanup() {
		if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
	}

	test("parses agent with full frontmatter", () => {
		setup();
		const filePath = join(tmpDir, "test-agent.md");
		writeFileSync(
			filePath,
			`---
name: test-agent
description: A test agent
tools: read,write,bash
skills: brainstorming,grill-me
---

# Test Agent

You are a test agent.`,
		);

		const result = parseAgentFile(filePath);
		expect(result).not.toBeNull();
		expect(result!.name).toBe("test-agent");
		expect(result!.description).toBe("A test agent");
		expect(result!.tools).toBe("read,write,bash");
		expect(result!.skills).toBe("brainstorming,grill-me");
		expect(result!.systemPrompt).toContain("You are a test agent.");

		cleanup();
	});

	test("parses agent without skills", () => {
		setup();
		const filePath = join(tmpDir, "minimal-agent.md");
		writeFileSync(
			filePath,
			`---
name: minimal
description: Minimal agent
tools: read
---

# Minimal

Do stuff.`,
		);

		const result = parseAgentFile(filePath);
		expect(result).not.toBeNull();
		expect(result!.name).toBe("minimal");
		expect(result!.skills).toBe("");
		expect(result!.tools).toBe("read");

		cleanup();
	});

	test("returns null for file without frontmatter", () => {
		setup();
		const filePath = join(tmpDir, "no-frontmatter.md");
		writeFileSync(filePath, "# No frontmatter\n\nJust content.");

		const result = parseAgentFile(filePath);
		expect(result).toBeNull();

		cleanup();
	});

	test("returns null for file without name", () => {
		setup();
		const filePath = join(tmpDir, "no-name.md");
		writeFileSync(
			filePath,
			`---
description: No name
tools: read
---

Content.`,
		);

		const result = parseAgentFile(filePath);
		expect(result).toBeNull();

		cleanup();
	});

	test("returns null for non-existent file", () => {
		const result = parseAgentFile("/nonexistent/path/agent.md");
		expect(result).toBeNull();
	});

	test("defaults tools to read,grep,find,ls when not specified", () => {
		setup();
		const filePath = join(tmpDir, "no-tools.md");
		writeFileSync(
			filePath,
			`---
name: no-tools
description: No tools specified
---

Content.`,
		);

		const result = parseAgentFile(filePath);
		expect(result).not.toBeNull();
		expect(result!.tools).toBe("read,grep,find,ls");

		cleanup();
	});
});

// ── Actual agent files ───────────────────────────

describe("Agent definition files", () => {
	const agentsDir = join(import.meta.dir, "..", "..", "agents");

	test("brainstormer.md parses correctly", () => {
		const result = parseAgentFile(join(agentsDir, "brainstormer.md"));
		expect(result).not.toBeNull();
		expect(result!.name).toBe("brainstormer");
		expect(result!.skills).toContain("brainstorming");
		expect(result!.skills).toContain("grill-me");
	});

	test("researcher-codebase.md parses correctly", () => {
		const result = parseAgentFile(join(agentsDir, "researcher-codebase.md"));
		expect(result).not.toBeNull();
		expect(result!.name).toBe("researcher-codebase");
		expect(result!.skills).toContain("repo-analysis");
		expect(result!.tools).toContain("grep");
	});

	test("researcher-external.md parses correctly", () => {
		const result = parseAgentFile(join(agentsDir, "researcher-external.md"));
		expect(result).not.toBeNull();
		expect(result!.name).toBe("researcher-external");
		expect(result!.skills).toContain("context7");
		expect(result!.skills).toContain("pi-encyclopedia");
	});

	test("planner.md parses correctly", () => {
		const result = parseAgentFile(join(agentsDir, "planner.md"));
		expect(result).not.toBeNull();
		expect(result!.name).toBe("planner");
		expect(result!.skills).toContain("writing-plans");
		expect(result!.skills).toContain("planning-with-beads");
	});

	test("builder.md parses correctly", () => {
		const result = parseAgentFile(join(agentsDir, "builder.md"));
		expect(result).not.toBeNull();
		expect(result!.name).toBe("builder");
		expect(result!.tools).toContain("write");
		expect(result!.tools).toContain("edit");
		expect(result!.skills).toContain("test-driven-development");
	});

	test("reviewer-code.md parses correctly", () => {
		const result = parseAgentFile(join(agentsDir, "reviewer-code.md"));
		expect(result).not.toBeNull();
		expect(result!.name).toBe("reviewer-code");
		expect(result!.skills).toContain("review");
	});

	test("reviewer-tests.md parses correctly", () => {
		const result = parseAgentFile(join(agentsDir, "reviewer-tests.md"));
		expect(result).not.toBeNull();
		expect(result!.name).toBe("reviewer-tests");
		expect(result!.skills).toContain("test");
	});
});

// ── Chain config file ────────────────────────────

describe("adhoc-chain.yaml", () => {
	const chainPath = join(import.meta.dir, "..", "..", "agents", "adhoc-chain.yaml");

	test("file exists", () => {
		expect(existsSync(chainPath)).toBe(true);
	});

	test("parses with correct structure", () => {
		const { readFileSync } = require("node:fs");
		const chains = parseChainYaml(readFileSync(chainPath, "utf-8"));
		expect(chains).toHaveLength(1);
		expect(chains[0].name).toBe("adhoc");
		expect(chains[0].steps).toHaveLength(7);
	});

	test("has parallel research group", () => {
		const { readFileSync } = require("node:fs");
		const chains = parseChainYaml(readFileSync(chainPath, "utf-8"));
		const researchSteps = chains[0].steps.filter((s: any) => s.parallelGroup === "research");
		expect(researchSteps).toHaveLength(2);
		expect(researchSteps[0].agent).toBe("researcher-codebase");
		expect(researchSteps[1].agent).toBe("researcher-external");
	});

	test("has parallel review group", () => {
		const { readFileSync } = require("node:fs");
		const chains = parseChainYaml(readFileSync(chainPath, "utf-8"));
		const reviewSteps = chains[0].steps.filter((s: any) => s.parallelGroup === "review");
		expect(reviewSteps).toHaveLength(2);
		expect(reviewSteps[0].agent).toBe("reviewer-code");
		expect(reviewSteps[1].agent).toBe("reviewer-tests");
	});

	test("sequential steps have no parallelGroup", () => {
		const { readFileSync } = require("node:fs");
		const chains = parseChainYaml(readFileSync(chainPath, "utf-8"));
		const sequentialSteps = chains[0].steps.filter((s: any) => s.parallelGroup === undefined);
		expect(sequentialSteps).toHaveLength(3); // brainstormer, planner, builder
		expect(sequentialSteps[0].agent).toBe("brainstormer");
		expect(sequentialSteps[1].agent).toBe("planner");
		expect(sequentialSteps[2].agent).toBe("builder");
	});
});
