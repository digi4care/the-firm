/**
 * Orchestrator Extension — "Andre"
 *
 * Always-active orchestrator that is mode-aware:
 *   - The Firm ACTIVE → routes work to departments
 *   - The Firm PAUSED → handles work with ad-hoc chain pipeline
 *   - No config → handles work with ad-hoc chain pipeline (default)
 *
 * Ad-hoc chain: brainstorm → research (parallel) → plan → build → review (parallel)
 *
 * Commands:
 *   /firm-pause     — pause The Firm, Andre takes over with ad-hoc chain
 *   /firm-resume    — resume The Firm, Andre routes to departments again
 *   /chain-status   — show current chain pipeline status
 *   /chain-widget   — toggle pipeline widget visibility (default: hidden)
 *
 * Based on the agent-chain pattern from pi-vs-claude-code.
 */

import { spawn } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

// ── Types ────────────────────────────────────────

interface ChainStep {
	agent: string;
	prompt: string;
	parallelGroup?: string;
}

interface ChainDef {
	name: string;
	description: string;
	steps: ChainStep[];
}

interface AgentDef {
	name: string;
	description: string;
	tools: string;
	skills: string;
	systemPrompt: string;
}

interface StepState {
	agent: string;
	status: "pending" | "running" | "done" | "error";
	elapsed: number;
	lastWork: string;
}

// ── FirmState ────────────────────────────────────

type FirmStateValue = "active" | "paused";

export function getFirmState(cwd: string): { hasFirm: boolean; state: FirmStateValue | undefined } {
	const configPath = join(cwd, ".pi", "firm", "config.json");
	if (!existsSync(configPath)) return { hasFirm: false, state: undefined };

	try {
		const raw = JSON.parse(readFileSync(configPath, "utf-8"));
		return {
			hasFirm: true,
			state: raw.firmState as FirmStateValue | undefined,
		};
	} catch {
		return { hasFirm: false, state: undefined };
	}
}

export function setFirmState(cwd: string, state: FirmStateValue): void {
	const configPath = join(cwd, ".pi", "firm", "config.json");
	const dir = join(cwd, ".pi", "firm");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	let config: Record<string, unknown> = {};
	if (existsSync(configPath)) {
		try {
			config = JSON.parse(readFileSync(configPath, "utf-8"));
		} catch {
			config = {};
		}
	}

	config.firmState = state;
	writeFileSync(configPath, `${JSON.stringify(config, null, "\t")}\n`, "utf-8");
}

// ── Display Name Helper ──────────────────────────

export function displayName(name: string): string {
	return name
		.split("-")
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(" ");
}

// ── Chain YAML Parser ────────────────────────────

export function parseChainYaml(raw: string): ChainDef[] {
	const chains: ChainDef[] = [];
	let current: ChainDef | null = null;
	let currentStep: ChainStep | null = null;

	for (const line of raw.split("\n")) {
		// Chain name: top-level key
		const chainMatch = line.match(/^(\S[^:]*):$/);
		if (chainMatch) {
			if (current && currentStep) {
				current.steps.push(currentStep);
				currentStep = null;
			}
			current = { name: chainMatch[1].trim(), description: "", steps: [] };
			chains.push(current);
			continue;
		}

		// Chain description
		const descMatch = line.match(/^\s+description:\s+(.+)$/);
		if (descMatch && current && !currentStep) {
			let desc = descMatch[1].trim();
			if (
				(desc.startsWith('"') && desc.endsWith('"')) ||
				(desc.startsWith("'") && desc.endsWith("'"))
			) {
				desc = desc.slice(1, -1);
			}
			current.description = desc;
			continue;
		}

		// "steps:" label — skip
		if (line.match(/^\s+steps:\s*$/) && current) {
			continue;
		}

		// Step agent line
		const agentMatch = line.match(/^\s+-\s+agent:\s+(.+)$/);
		if (agentMatch && current) {
			if (currentStep) {
				current.steps.push(currentStep);
			}
			currentStep = { agent: agentMatch[1].trim(), prompt: "" };
			continue;
		}

		// Step parallel_group
		const parallelMatch = line.match(/^\s+parallel_group:\s+(\S+)$/);
		if (parallelMatch && currentStep) {
			currentStep.parallelGroup = parallelMatch[1].trim();
			continue;
		}

		// Step prompt (multiline with |)
		const promptMatch = line.match(/^\s+prompt:\s*\|?\s*$/);
		if (promptMatch && currentStep) {
			continue; // prompt starts on next lines, we collect inline
		}

		// Prompt content (indented lines after prompt: |)
		const promptLineMatch = line.match(/^\s{8,}(.+)$/);
		if (promptLineMatch && currentStep && currentStep.prompt !== undefined) {
			const content = promptLineMatch[1];
			// Skip placeholder lines
			if (content.startsWith("$")) {
				currentStep.prompt += content;
			} else {
				currentStep.prompt += (currentStep.prompt ? "\n" : "") + content.trim();
			}
		}
	}

	if (current && currentStep) {
		current.steps.push(currentStep);
	}

	return chains;
}

// ── Frontmatter Parser ───────────────────────────

export function parseAgentFile(filePath: string): AgentDef | null {
	try {
		const raw = readFileSync(filePath, "utf-8");
		const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
		if (!match) return null;

		const frontmatter: Record<string, string> = {};
		for (const line of match[1].split("\n")) {
			const idx = line.indexOf(":");
			if (idx > 0) {
				frontmatter[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
			}
		}

		if (!frontmatter.name) return null;

		return {
			name: frontmatter.name,
			description: frontmatter.description || "",
			tools: frontmatter.tools || "read,grep,find,ls",
			skills: frontmatter.skills || "",
			systemPrompt: match[2].trim(),
		};
	} catch {
		return null;
	}
}

function scanAgentDirs(cwd: string): Map<string, AgentDef> {
	const dirs = [join(cwd, "agents"), join(cwd, ".claude", "agents"), join(cwd, ".pi", "agents")];

	const agents = new Map<string, AgentDef>();

	for (const dir of dirs) {
		if (!existsSync(dir)) continue;
		try {
			for (const file of readdirSync(dir)) {
				if (!file.endsWith(".md")) continue;
				const fullPath = resolve(dir, file);
				const def = parseAgentFile(fullPath);
				if (def && !agents.has(def.name.toLowerCase())) {
					agents.set(def.name.toLowerCase(), def);
				}
			}
		} catch {}
	}

	return agents;
}

// ── Extension ────────────────────────────────────

export default function register(pi: ExtensionAPI) {
	let allAgents: Map<string, AgentDef> = new Map();
	let chains: ChainDef[] = [];
	let activeChain: ChainDef | null = null;
	let widgetCtx: any;
	let sessionDir = "";
	const agentSessions: Map<string, string | null> = new Map();

	// Per-step state for the active chain
	let stepStates: StepState[] = [];
	let pendingReset = false;
	let widgetVisible = false; // default OFF

	function loadChains(cwd: string) {
		sessionDir = join(cwd, ".pi", "agent-sessions");
		if (!existsSync(sessionDir)) {
			mkdirSync(sessionDir, { recursive: true });
		}

		allAgents = scanAgentDirs(cwd);

		agentSessions.clear();
		for (const [key] of allAgents) {
			const sessionFile = join(sessionDir, `chain-${key}.json`);
			agentSessions.set(key, existsSync(sessionFile) ? sessionFile : null);
		}

		const chainPath = join(cwd, ".pi", "agents", "adhoc-chain.yaml");
		if (existsSync(chainPath)) {
			try {
				chains = parseChainYaml(readFileSync(chainPath, "utf-8"));
			} catch {
				chains = [];
			}
		} else {
			chains = [];
		}
	}

	function activateChain(chain: ChainDef) {
		activeChain = chain;
		stepStates = chain.steps.map((s) => ({
			agent: s.agent,
			status: "pending" as const,
			elapsed: 0,
			lastWork: "",
		}));
		if (!pendingReset) {
			updateWidget();
		}
	}

	// ── Card Rendering ──────────────────────────

	function renderCard(state: StepState, colWidth: number, theme: any): string[] {
		const w = colWidth - 2;
		const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 3)}...` : s);

		const statusColor =
			state.status === "pending"
				? "dim"
				: state.status === "running"
					? "accent"
					: state.status === "done"
						? "success"
						: "error";
		const statusIcon =
			state.status === "pending"
				? "○"
				: state.status === "running"
					? "●"
					: state.status === "done"
						? "✓"
						: "✗";

		const name = displayName(state.agent);
		const nameStr = theme.fg("accent", theme.bold(truncate(name, w)));
		const nameVisible = Math.min(name.length, w);

		const statusStr = `${statusIcon} ${state.status}`;
		const timeStr = state.status !== "pending" ? ` ${Math.round(state.elapsed / 1000)}s` : "";
		const statusLine = theme.fg(statusColor, statusStr + timeStr);
		const statusVisible = statusStr.length + timeStr.length;

		const workRaw = state.lastWork || "";
		const workText = truncate(workRaw, Math.min(50, w - 1));
		const workLine = workText ? theme.fg("muted", workText) : theme.fg("dim", "—");
		const workVisible = workText ? workText.length : 1;

		const top = `┌${"─".repeat(w)}┐`;
		const bot = `└${"─".repeat(w)}┘`;
		const border = (content: string, visLen: number) =>
			theme.fg("dim", "│") + content + " ".repeat(Math.max(0, w - visLen)) + theme.fg("dim", "│");

		return [
			theme.fg("dim", top),
			border(` ${nameStr}`, 1 + nameVisible),
			border(` ${statusLine}`, 1 + statusVisible),
			border(` ${workLine}`, 1 + workVisible),
			theme.fg("dim", bot),
		];
	}

	function updateWidget() {
		if (!widgetCtx || !widgetVisible) return;

		widgetCtx.ui.setWidget("orchestrator", (_tui: any, theme: any) => {
			const text = new Text("", 0, 1);

			return {
				render(width: number): string[] {
					if (!activeChain || stepStates.length === 0) {
						text.setText(theme.fg("dim", "Andre ready. Use run_chain to start the pipeline."));
						return text.render(width);
					}

					// Group steps by parallelGroup for layout
					const groups: StepState[][] = [];
					let currentGroup: StepState[] = [];

					for (let i = 0; i < stepStates.length; i++) {
						const step = activeChain.steps[i];
						const state = stepStates[i];

						if (step.parallelGroup && i > 0) {
							const prevStep = activeChain.steps[i - 1];
							if (prevStep.parallelGroup === step.parallelGroup) {
								currentGroup.push(state);
								continue;
							}
						}

						// New group
						if (currentGroup.length > 0) {
							groups.push(currentGroup);
						}
						currentGroup = [state];
					}
					if (currentGroup.length > 0) {
						groups.push(currentGroup);
					}

					// Render each group
					const _arrowWidth = 5; // " ──▶ "
					const groupRenderings: { cards: string[][]; maxCols: number }[] = [];

					for (const group of groups) {
						const colWidth = Math.max(16, Math.floor((width - 10) / group.length));
						const cards = group.map((s) => renderCard(s, colWidth, theme));
						groupRenderings.push({ cards, maxCols: group.length });
					}

					const outputLines: string[] = [];
					for (let g = 0; g < groupRenderings.length; g++) {
						const { cards } = groupRenderings[g];
						const cardHeight = cards[0].length;

						for (let line = 0; line < cardHeight; line++) {
							let row = cards[0][line];
							for (let c = 1; c < cards.length; c++) {
								row += ` ${cards[c][line]}`;
							}
							outputLines.push(row);
						}

						// Arrow between groups
						if (g < groupRenderings.length - 1) {
							const arrow = " ".repeat(Math.floor(width / 2) - 2) + theme.fg("dim", "▼");
							outputLines.push(arrow);
						}
					}

					text.setText(outputLines.join("\n"));
					return text.render(width);
				},
				invalidate() {
					text.invalidate();
				},
			};
		});
	}

	// ── Run Agent (subprocess) ──────────────────

	function runAgent(
		agentDef: AgentDef,
		task: string,
		stepIndex: number,
		ctx: any,
	): Promise<{ output: string; exitCode: number; elapsed: number }> {
		const model = ctx.model
			? `${ctx.model.provider}/${ctx.model.id}`
			: "openrouter/google/gemini-3-flash-preview";

		const agentKey = agentDef.name.toLowerCase().replace(/\s+/g, "-");
		const agentSessionFile = join(sessionDir, `chain-${agentKey}.json`);
		const hasSession = agentSessions.get(agentKey);

		const args = [
			"--mode",
			"json",
			"-p",
			"--no-extensions",
			"--model",
			model,
			"--tools",
			agentDef.tools,
			"--thinking",
			"off",
			"--append-system-prompt",
			agentDef.systemPrompt,
			"--session",
			agentSessionFile,
		];

		// Inject skills if defined in frontmatter
		if (agentDef.skills) {
			for (const skill of agentDef.skills.split(",").map((s) => s.trim())) {
				args.push("--skill", skill);
			}
		}

		if (hasSession) {
			args.push("-c");
		}

		args.push(task);

		const textChunks: string[] = [];
		const startTime = Date.now();
		const state = stepStates[stepIndex];

		return new Promise((resolve) => {
			const proc = spawn("pi", args, {
				stdio: ["ignore", "pipe", "pipe"],
				env: { ...process.env },
			});

			const timer = setInterval(() => {
				state.elapsed = Date.now() - startTime;
				updateWidget();
			}, 1000);

			let buffer = "";

			proc.stdout?.setEncoding("utf-8");
			proc.stdout?.on("data", (chunk: string) => {
				buffer += chunk;
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";
				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const event = JSON.parse(line);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") {
								textChunks.push(delta.delta || "");
								const full = textChunks.join("");
								const last =
									full
										.split("\n")
										.filter((l: string) => l.trim())
										.pop() || "";
								state.lastWork = last;
								updateWidget();
							}
						}
					} catch {}
				}
			});

			proc.stderr?.setEncoding("utf-8");
			proc.stderr?.on("data", () => {});

			proc.on("close", (code) => {
				if (buffer.trim()) {
					try {
						const event = JSON.parse(buffer);
						if (event.type === "message_update") {
							const delta = event.assistantMessageEvent;
							if (delta?.type === "text_delta") textChunks.push(delta.delta || "");
						}
					} catch {}
				}

				clearInterval(timer);
				const elapsed = Date.now() - startTime;
				state.elapsed = elapsed;
				const output = textChunks.join("");
				state.lastWork =
					output
						.split("\n")
						.filter((l: string) => l.trim())
						.pop() || "";

				if (code === 0) {
					agentSessions.set(agentKey, agentSessionFile);
				}

				resolve({ output, exitCode: code ?? 1, elapsed });
			});

			proc.on("error", (err) => {
				clearInterval(timer);
				resolve({
					output: `Error spawning agent: ${err.message}`,
					exitCode: 1,
					elapsed: Date.now() - startTime,
				});
			});
		});
	}

	// ── Run parallel group ────────────────────────

	async function runParallelGroup(
		steps: { step: ChainStep; index: number }[],
		input: string,
		originalPrompt: string,
		ctx: any,
	): Promise<{ output: string; success: boolean }> {
		// Mark all as running
		for (const { index } of steps) {
			stepStates[index].status = "running";
		}
		updateWidget();

		// Run all agents in parallel
		const results = await Promise.all(
			steps.map(async ({ step, index }) => {
				const resolvedPrompt = step.prompt
					.replace(/\$INPUT/g, input)
					.replace(/\$ORIGINAL/g, originalPrompt);

				const agentDef = allAgents.get(step.agent.toLowerCase());
				if (!agentDef) {
					stepStates[index].status = "error";
					stepStates[index].lastWork = `Agent "${step.agent}" not found`;
					updateWidget();
					return {
						output: `Agent "${step.agent}" not found`,
						success: false,
						index,
					};
				}

				const result = await runAgent(agentDef, resolvedPrompt, index, ctx);

				if (result.exitCode !== 0) {
					stepStates[index].status = "error";
					updateWidget();
					return {
						output: `Error (${step.agent}): ${result.output}`,
						success: false,
						index,
					};
				}

				stepStates[index].status = "done";
				updateWidget();
				return { output: result.output, success: true, index };
			}),
		);

		// Check for failures
		const failures = results.filter((r) => !r.success);
		if (failures.length > 0) {
			return {
				output: failures.map((f) => f.output).join("\n"),
				success: false,
			};
		}

		// Merge outputs
		const merged = results.map((r) => r.output).join("\n\n---\n\n");
		return { output: merged, success: true };
	}

	// ── Run Chain (sequential with parallel groups) ──

	async function runChain(
		task: string,
		ctx: any,
	): Promise<{ output: string; success: boolean; elapsed: number }> {
		if (!activeChain) {
			return { output: "No chain active", success: false, elapsed: 0 };
		}

		const chainStart = Date.now();

		// Reset all steps to pending
		stepStates = activeChain.steps.map((s) => ({
			agent: s.agent,
			status: "pending" as const,
			elapsed: 0,
			lastWork: "",
		}));
		updateWidget();

		let input = task;
		const originalPrompt = task;

		// Group consecutive steps with the same parallelGroup
		let i = 0;
		while (i < activeChain.steps.length) {
			const step = activeChain.steps[i];
			const group = step.parallelGroup;

			if (group) {
				// Collect all consecutive steps with the same parallelGroup
				const groupSteps: { step: ChainStep; index: number }[] = [];
				while (i < activeChain.steps.length && activeChain.steps[i].parallelGroup === group) {
					groupSteps.push({ step: activeChain.steps[i], index: i });
					i++;
				}

				const result = await runParallelGroup(groupSteps, input, originalPrompt, ctx);
				if (!result.success) {
					return {
						output: result.output,
						success: false,
						elapsed: Date.now() - chainStart,
					};
				}
				input = result.output;
			} else {
				// Sequential step
				stepStates[i].status = "running";
				updateWidget();

				const resolvedPrompt = step.prompt
					.replace(/\$INPUT/g, input)
					.replace(/\$ORIGINAL/g, originalPrompt);

				const agentDef = allAgents.get(step.agent.toLowerCase());
				if (!agentDef) {
					stepStates[i].status = "error";
					stepStates[i].lastWork = `Agent "${step.agent}" not found`;
					updateWidget();
					return {
						output: `Error at step ${i + 1}: Agent "${step.agent}" not found. Available: ${Array.from(allAgents.keys()).join(", ")}`,
						success: false,
						elapsed: Date.now() - chainStart,
					};
				}

				const result = await runAgent(agentDef, resolvedPrompt, i, ctx);

				if (result.exitCode !== 0) {
					stepStates[i].status = "error";
					updateWidget();
					return {
						output: `Error at step ${i + 1} (${step.agent}): ${result.output}`,
						success: false,
						elapsed: Date.now() - chainStart,
					};
				}

				stepStates[i].status = "done";
				updateWidget();

				input = result.output;
				i++;
			}
		}

		return { output: input, success: true, elapsed: Date.now() - chainStart };
	}

	// ── Build mode-aware system prompt ────────────

	function buildSystemPrompt(cwd: string): string {
		const { hasFirm, state } = getFirmState(cwd);

		// Determine mode
		const firmActive = hasFirm && state === "active";

		// Build chain info
		let chainInfo = "";
		if (activeChain) {
			const flow = activeChain.steps
				.map((s, idx) => {
					// Mark parallel steps
					const nextStep = activeChain.steps[idx + 1];
					const prevStep = activeChain.steps[idx - 1];
					if (s.parallelGroup && nextStep?.parallelGroup === s.parallelGroup) {
						return null; // skip, rendered as part of group
					}
					if (s.parallelGroup && prevStep?.parallelGroup === s.parallelGroup) {
						return null; // skip, already rendered
					}

					// Check if this step starts a parallel group
					if (s.parallelGroup && nextStep?.parallelGroup === s.parallelGroup) {
						const group = activeChain.steps
							.filter((st) => st.parallelGroup === s.parallelGroup)
							.map((st) => displayName(st.agent))
							.join(" + ");
						return `${idx + 1}. ${group} (parallel)`;
					}
					return `${idx + 1}. ${displayName(s.agent)}`;
				})
				.filter(Boolean)
				.join("\n");

			chainInfo = `## Active Chain: ${activeChain.name}
${activeChain.description}

${flow}`;
		}

		if (firmActive) {
			return `You are Andre, the orchestrator for The Firm.

## Mode: THE FIRM ACTIVE
The Firm is running. You route work to the appropriate departments.

## When to route to departments
- Feature requests, bug fixes, new work → route through The Firm flow
- Use the department structure as defined in .pi/firm/config.json

## When to work directly
- Quick questions, status checks, small lookups
- Anything you can answer without needing a department

## Commands
- /firm-pause — pause The Firm, you handle work ad-hoc
- /chain-status — show pipeline status

${chainInfo}`;
		}

		// Ad-hoc mode (paused or no config)
		const modeLabel = hasFirm ? "THE FIRM PAUSED" : "AD-HOC";
		return `You are Andre, the orchestrator.

## Mode: ${modeLabel}
${hasFirm ? "The Firm is paused. You handle work directly using the ad-hoc chain pipeline." : "No The Firm engagement. You handle work directly using the ad-hoc chain pipeline."}

## How to Work
- Analyze the user's request
- For significant work (features, refactors, multi-file changes): use run_chain
- For simple tasks (reading files, quick edits, questions): do it directly
- After chain completes: review results and summarize for the user

## run_chain
Pass a clear task description. The pipeline runs:
1. Brainstormer — clarifies scope and requirements
2. Researchers (parallel) — codebase + external docs
3. Planner — creates TDD implementation plan
4. Builder — implements with tests
5. Reviewers (parallel) — code quality + test quality

Each step's output feeds into the next. Agents maintain session context.

## Commands
${hasFirm ? "- /firm-resume — resume The Firm\n" : ""}- /chain-status — show pipeline status

${chainInfo}`;
	}

	// ── run_chain Tool ──────────────────────────

	pi.registerTool({
		name: "run_chain",
		label: "Run Chain",
		description:
			"Execute the ad-hoc chain pipeline. Each step runs sequentially (with parallel research and review phases). Output from one step feeds into the next.",
		parameters: Type.Object({
			task: Type.String({
				description: "The task/prompt for the chain to process",
			}),
		}),

		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			const { task } = params as { task: string };

			if (onUpdate) {
				onUpdate({
					content: [
						{
							type: "text",
							text: `Starting chain: ${activeChain?.name}...`,
						},
					],
					details: { chain: activeChain?.name, task, status: "running" },
				});
			}

			const result = await runChain(task, ctx);

			const truncated =
				result.output.length > 8000
					? `${result.output.slice(0, 8000)}\n\n... [truncated]`
					: result.output;

			const status = result.success ? "done" : "error";
			const summary = `[chain:${activeChain?.name}] ${status} in ${Math.round(result.elapsed / 1000)}s`;

			return {
				content: [{ type: "text", text: `${summary}\n\n${truncated}` }],
				details: {
					chain: activeChain?.name,
					task,
					status,
					elapsed: result.elapsed,
					fullOutput: result.output,
				},
			};
		},

		renderCall(args, theme) {
			const task = (args as any).task || "";
			const preview = task.length > 60 ? `${task.slice(0, 57)}...` : task;
			return new Text(
				theme.fg("toolTitle", theme.bold("run_chain ")) +
					theme.fg("accent", activeChain?.name || "?") +
					theme.fg("dim", " — ") +
					theme.fg("muted", preview),
				0,
				0,
			);
		},

		renderResult(result, options, theme) {
			const details = result.details as any;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (options.isPartial || details.status === "running") {
				return new Text(
					theme.fg("accent", `● ${details.chain || "chain"}`) + theme.fg("dim", " running..."),
					0,
					0,
				);
			}

			const icon = details.status === "done" ? "✓" : "✗";
			const color = details.status === "done" ? "success" : "error";
			const elapsed = typeof details.elapsed === "number" ? Math.round(details.elapsed / 1000) : 0;
			const header = theme.fg(color, `${icon} ${details.chain}`) + theme.fg("dim", ` ${elapsed}s`);

			if (options.expanded && details.fullOutput) {
				const output =
					details.fullOutput.length > 4000
						? `${details.fullOutput.slice(0, 4000)}\n... [truncated]`
						: details.fullOutput;
				return new Text(`${header}\n${theme.fg("muted", output)}`, 0, 0);
			}

			return new Text(header, 0, 0);
		},
	});

	// ── Commands ─────────────────────────────────

	pi.registerCommand("firm-pause", {
		description: "Pause The Firm — Andre handles work with ad-hoc chain",
		handler: async (_args, ctx) => {
			widgetCtx = ctx;
			const cwd = process.cwd();
			const { hasFirm } = getFirmState(cwd);

			if (!hasFirm) {
				ctx.ui.notify("No The Firm engagement to pause. Running in ad-hoc mode.", "info");
				return;
			}

			setFirmState(cwd, "paused");
			ctx.ui.setStatus("orchestrator", "Andre (The Firm paused)");
			ctx.ui.notify(
				"The Firm paused. Andre handles work with ad-hoc chain.\nUse /firm-resume to reactivate.",
				"info",
			);
		},
	});

	pi.registerCommand("firm-resume", {
		description: "Resume The Firm — Andre routes work to departments",
		handler: async (_args, ctx) => {
			widgetCtx = ctx;
			const cwd = process.cwd();
			const { hasFirm } = getFirmState(cwd);

			if (!hasFirm) {
				ctx.ui.notify("No The Firm engagement. Use /tf-intake to start one.", "warning");
				return;
			}

			setFirmState(cwd, "active");
			ctx.ui.setStatus("orchestrator", "Andre (The Firm active)");
			ctx.ui.notify("The Firm resumed. Andre routes work to departments.", "info");
		},
	});

	pi.registerCommand("chain-status", {
		description: "Show current chain pipeline status",
		handler: async (_args, ctx) => {
			widgetCtx = ctx;
			if (!activeChain) {
				ctx.ui.notify("No chain active.", "info");
				return;
			}

			const steps = activeChain.steps
				.map((s, i) => {
					const state = stepStates[i];
					const icon =
						state.status === "pending"
							? "○"
							: state.status === "running"
								? "●"
								: state.status === "done"
									? "✓"
									: "✗";
					const time = state.status !== "pending" ? ` (${Math.round(state.elapsed / 1000)}s)` : "";
					const parallel = s.parallelGroup ? ` [${s.parallelGroup}]` : "";
					return `${icon} ${i + 1}. ${displayName(s.agent)}${parallel}${time}`;
				})
				.join("\n");

			ctx.ui.notify(`Chain: ${activeChain.name}\n${activeChain.description}\n\n${steps}`, "info");
		},
	});

	pi.registerCommand("chain-widget", {
		description: "Toggle the chain pipeline status widget",
		handler: async (_args, ctx) => {
			widgetCtx = ctx;
			toggleWidget(ctx);
		},
	});

	// ── Widget Toggle ────────────────────────────

	function toggleWidget(ctx: any): void {
		widgetVisible = !widgetVisible;
		if (widgetVisible) {
			updateWidget();
			ctx.ui.notify("Chain widget visible.", "info");
		} else {
			ctx.ui.setWidget("orchestrator", undefined);
			ctx.ui.notify("Chain widget hidden.", "info");
		}
	}

	// ── System Prompt Override ───────────────────

	pi.on("before_agent_start", async (_event, _ctx) => {
		// Force widget reset on first turn after /new
		if (pendingReset && activeChain) {
			pendingReset = false;
			widgetCtx = _ctx;
			stepStates = activeChain.steps.map((s) => ({
				agent: s.agent,
				status: "pending" as const,
				elapsed: 0,
				lastWork: "",
			}));
			updateWidget();
		}

		return {
			systemPrompt: buildSystemPrompt(_ctx.cwd),
		};
	});

	// ── Session Start ───────────────────────────

	pi.on("session_start", async (_event, _ctx) => {
		// Clear widget from previous session
		if (widgetCtx) {
			widgetCtx.ui.setWidget("orchestrator", undefined);
		}
		_ctx.ui.setWidget("orchestrator", undefined);
		widgetCtx = _ctx;

		// Reset execution state
		stepStates = [];
		activeChain = null;
		pendingReset = true;

		// Wipe chain session files — reset agent context on /new and launch
		if (existsSync(sessionDir)) {
			for (const f of readdirSync(sessionDir)) {
				if (f.startsWith("chain-") && f.endsWith(".json")) {
					try {
						unlinkSync(join(sessionDir, f));
					} catch {}
				}
			}
		}

		// Load chains + agents
		loadChains(_ctx.cwd);

		// Determine mode
		const { hasFirm, state } = getFirmState(_ctx.cwd);
		const firmActive = hasFirm && state === "active";

		// Activate first chain (adhoc)
		if (chains.length > 0) {
			activateChain(chains[0]);
		}

		const modeLabel = firmActive
			? "The Firm active"
			: hasFirm
				? "The Firm paused (ad-hoc)"
				: "Ad-hoc mode";

		_ctx.ui.setStatus("orchestrator", `Andre (${modeLabel})`);

		const flow = activeChain
			? activeChain.steps.map((s) => displayName(s.agent)).join(" → ")
			: "No chain loaded";

		const notifyLines = [
			`Andre — ${modeLabel}`,
			`Chain: ${activeChain?.name || "none"} (${activeChain?.steps.length || 0} steps)`,
			`Flow: ${flow}`,
			"",
		];

		if (hasFirm) {
			notifyLines.push(
				firmActive
					? "/firm-pause     Pause The Firm → ad-hoc mode"
					: "/firm-resume    Resume The Firm",
			);
		}
		notifyLines.push("/chain-status  Show pipeline status");
		notifyLines.push("/chain-widget  Toggle pipeline widget");

		_ctx.ui.notify(notifyLines.join("\n"), "info");

		// Do NOT override Pi's footer — let Pi handle it

		updateWidget();
	});
}
