/**
 * Tasks settings provider.
 * Task delegation, isolation, skills, commands.
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const tasksSettings: SettingsProvider = {
	id: "tasks",
	settings: {
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
