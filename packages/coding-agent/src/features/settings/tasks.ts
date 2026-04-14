/**
 * Tasks settings provider.
 * Skills and commands.
 *
 * Upstream comparison (oh-my-pi Tasks tab):
 * ┌──────────────────────────────┬──────────┬─────────────────────────────┐
 * │ Setting                      │ Upstream │ The Firm                    │
 * ├──────────────────────────────┼──────────┼─────────────────────────────┤
 * │ enableSkillCommands          │ ✓        │ ✓                           │
 * ├──────────────────────────────┼──────────┼─────────────────────────────┤
 * │ task.isolation.mode          │ ✓        │ ✗ (no subagent system)      │
 * │ task.isolation.merge         │ ✓        │ ✗ (no subagent system)      │
 * │ task.isolation.commits       │ ✓        │ ✗ (no subagent system)      │
 * │ task.eager                   │ ✓        │ ✗ (no subagent system)      │
 * │ task.maxConcurrency          │ ✓        │ ✗ (no subagent system)      │
 * │ task.maxRecursionDepth       │ ✓        │ ✗ (no subagent system)      │
 * │ task.disabledAgents          │ ✓        │ ✗ (no subagent system)      │
 * │ task.agentModelOverrides     │ ✓        │ ✗ (no subagent system)      │
 * │ tasks.todoClearDelay         │ ✓        │ ✗ (no todo tool)            │
 * │ skills.enableCodexUser       │ ✓        │ ✗ (not applicable)          │
 * │ skills.enableClaudeUser      │ ✓        │ ✗ (not applicable)          │
 * │ skills.enableClaudeProject   │ ✓        │ ✗ (not applicable)          │
 * └──────────────────────────────┴──────────┴─────────────────────────────┘
 *
 * Conscious divergences:
 * - The Firm has no subagent/task delegation runtime, so all task delegation
 *   settings are removed to avoid dead UI toggles.
 * - Codex/Claude-specific skill toggles omitted (The Firm is provider-agnostic).
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const tasksSettings: SettingsProvider = {
	id: "tasks",
	settings: {
		// ─── Skills ────────────────────────────────────────────────
		enableSkillCommands: {
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
