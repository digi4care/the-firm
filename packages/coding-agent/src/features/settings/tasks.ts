/**
 * Tasks settings provider.
 * Task delegation, isolation, skills, commands.
 *
 * Upstream comparison (oh-my-pi Tasks tab):
 * ┌──────────────────────────────┬──────────┬─────────────────────────────┐
 * │ Setting                      │ Upstream │ The Firm                    │
 * ├──────────────────────────────┼──────────┼─────────────────────────────┤
 * │ task.isolation.mode          │ ✓        │ ✓ (none/worktree)           │
 * │ task.isolation.merge         │ ✓        │ ✓ (patch/branch)            │
 * │ task.isolation.commits       │ ✓        │ ✓ (generic/ai)              │
 * │ task.eager                   │ ✓        │ ✓                           │
 * │ task.maxConcurrency          │ ✓ (32)   │ ✓ (8)                       │
 * │ task.maxRecursionDepth       │ ✓ (2)    │ ✓ (2)                       │
 * │ task.disabledAgents          │ ✓        │ ✓                           │
 * │ task.agentModelOverrides     │ ✓        │ ✓                           │
 * │ tasks.todoClearDelay         │ ✓ (60s)  │ ✓ (60s)                     │
 * │ skills.enableSkillCommands   │ ✓        │ ✓                           │
 * │ skills.enableCodexUser       │ ✓        │ ✗ (The Firm: not applicable)│
 * │ skills.enableClaudeUser      │ ✓        │ ✗ (The Firm: not applicable)│
 * │ skills.enableClaudeProject   │ ✓        │ ✗ (The Firm: not applicable)│
 * └──────────────────────────────┴──────────┴─────────────────────────────┘
 *
 * Conscious divergences:
 * - fuse-overlay/fuse-projfs isolation modes omitted (Linux-only, niche)
 * - Codex/Claude-specific skill toggles omitted (The Firm is provider-agnostic)
 * - maxConcurrency reduced from 32 → 8 (practical default for typical dev machines)
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const tasksSettings: SettingsProvider = {
	id: "tasks",
	settings: {
		// ─── Isolation ─────────────────────────────────────────────
		"task.isolation.mode": {
			type: "enum",
			values: ["none", "worktree"] as const,
			default: "none",
			ui: {
				tab: "tasks",
				label: "Isolation Mode",
				description:
					"Isolation mode for subagents. 'none' runs in-tree, 'worktree' uses git worktrees for full isolation",
				submenu: true,
			},
		},

		"task.isolation.merge": {
			type: "enum",
			values: ["patch", "branch"] as const,
			default: "patch",
			ui: {
				tab: "tasks",
				label: "Merge Strategy",
				description: "How isolated task changes are integrated back (patch apply or branch merge)",
				submenu: true,
			},
		},

		"task.isolation.commits": {
			type: "enum",
			values: ["generic", "ai"] as const,
			default: "generic",
			ui: {
				tab: "tasks",
				label: "Commit Style",
				description: "Commit message style for isolated task changes (generic or AI-generated)",
				submenu: true,
			},
		},

		// ─── Delegation ────────────────────────────────────────────
		"task.eager": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tasks",
				label: "Prefer Task Delegation",
				description: "Encourage the agent to delegate work to subagents unless changes are trivial",
			},
		},

		"task.maxConcurrency": {
			type: "number",
			default: 8,
			ui: {
				tab: "tasks",
				label: "Max Concurrent Tasks",
				description: "Concurrent limit for subagents (1-100)",
				submenu: true,
			},
		},

		"task.maxRecursionDepth": {
			type: "number",
			default: 2,
			ui: {
				tab: "tasks",
				label: "Max Task Recursion",
				description: "How many levels deep subagents can spawn their own subagents",
				submenu: true,
			},
		},

		// ─── Agent configuration ───────────────────────────────────
		"task.disabledAgents": {
			type: "array",
			default: [] as string[],
		},

		"task.agentModelOverrides": {
			type: "record",
			default: {} as Record<string, string>,
		},

		// ─── Todo tracking ─────────────────────────────────────────
		"tasks.todoClearDelay": {
			type: "number",
			default: 60,
			ui: {
				tab: "tasks",
				label: "Todo Auto-clear Delay",
				description: "Seconds before removing completed/abandoned tasks from the list",
				submenu: true,
			},
		},

		// ─── Skills ────────────────────────────────────────────────
		"enableSkillCommands": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tasks",
				label: "Skill Commands",
				description: "Register skills as /skill:name commands",
			},
		},
	},
};
