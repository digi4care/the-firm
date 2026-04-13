/**
 * Settings bootstrap — registers all settings providers into the global registry.
 *
 * This is the ONLY place where providers are coupled.
 * To add a new settings group:
 * 1. Create a provider file in features/settings/
 * 2. Import and register it here
 */

import { codeIntelligenceSettings } from "../features/settings/code-intelligence.js";
import { compactionSettings } from "../features/settings/compaction.js";
import { editingSettings } from "../features/settings/editing.js";
import { interactionSettings } from "../features/settings/interaction.js";
import { modelSettings } from "../features/settings/model.js";
import { tasksSettings } from "../features/settings/tasks.js";
import { themeSettings } from "../features/settings/theme.js";
import { toolsSettings } from "../features/settings/tools.js";
import { settingsRegistry } from "./settings-registry.js";

export function bootstrapSettings(): void {
	settingsRegistry.register(codeIntelligenceSettings);
	settingsRegistry.register(compactionSettings);
	settingsRegistry.register(editingSettings);
	settingsRegistry.register(interactionSettings);
	settingsRegistry.register(modelSettings);
	settingsRegistry.register(tasksSettings);
	settingsRegistry.register(themeSettings);
	settingsRegistry.register(toolsSettings);
}
