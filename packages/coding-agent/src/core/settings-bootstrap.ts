/**
 * Settings bootstrap — registers all settings providers into the global registry.
 *
 * This is the ONLY place where providers are coupled.
 * To add a new settings group:
 * 1. Create a provider file in features/settings/
 * 2. Import and register it here
 */
import { settingsRegistry } from "./settings-registry.js";
import { compactionSettings } from "../features/settings/compaction.js";
import { themeSettings } from "../features/settings/theme.js";
import { interactionSettings } from "../features/settings/interaction.js";
import { modelSettings } from "../features/settings/model.js";

export function bootstrapSettings(): void {
	settingsRegistry.register(compactionSettings);
	settingsRegistry.register(themeSettings);
	settingsRegistry.register(interactionSettings);
	settingsRegistry.register(modelSettings);
}
