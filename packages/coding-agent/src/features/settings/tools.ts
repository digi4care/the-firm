/**
 * Tools settings provider.
 * Search, grep, find.
 *
 * Upstream comparison (oh-my-pi Tools tab):
 * ┌───────────────────────────────────┬──────────┬──────────────────────────────┐
 * │ Setting                           │ Upstream │ The Firm                     │
 * ├───────────────────────────────────┼──────────┼──────────────────────────────┤
 * │ grep.enabled                      │ ✓        │ ✓                            │
 * │ find.enabled                      │ ✓        │ ✓                            │
 * │ astGrep.enabled / ast.enabled     │ ✓        │ ✓ (code-intelligence)        │
 * │ astEdit.enabled / ast.editEnabled │ ✓        │ ✓ (code-intelligence)        │
 * ├───────────────────────────────────┼──────────┼──────────────────────────────┤
 * │ grep.contextBefore                │ ✓        │ ✗ (removed — tool uses a     │
 * │ grep.contextAfter                 │ ✓        │   single context param)      │
 * │ fetch.enabled                     │ ✓        │ ✗ (no fetch tool)            │
 * │ browser.enabled                   │ ✓        │ ✗ (no browser tool)          │
 * │ browser.headless                  │ ✓        │ ✗ (no browser tool)          │
 * │ browser.screenshotDir             │ ✓        │ ✗ (no browser tool)          │
 * │ web_search.enabled                │ ✓        │ ✗ (no web_search tool)       │
 * │ tools.artifactSpillThreshold      │ ✓        │ ✗ (artifact system not built)│
 * │ tools.artifactTailBytes           │ ✓        │ ✗ (artifact system not built)│
 * │ tools.artifactTailLines           │ ✓        │ ✗ (artifact system not built)│
 * │ tools.intentTracing               │ ✓        │ ✗ (not implemented)          │
 * │ tools.maxTimeout                  │ ✓        │ ✗ (not implemented)          │
 * │ todo.enabled                      │ ✓        │ ✗ (no todo tool)             │
 * │ todo.reminders                    │ ✓        │ ✗ (no todo tool)             │
 * │ todo.reminders.max                │ ✓        │ ✗ (no todo tool)             │
 * │ todo.eager                        │ ✓        │ ✗ (no todo tool)             │
 * │ checkpoint.enabled                │ ✓        │ ✗ (no checkpoint tool)       │
 * │ github.enabled                    │ ✓        │ ✗ (no github tool)           │
 * │ mcp.*                             │ ✓        │ ✗ (no MCP integration)       │
 * │ async.enabled                     │ ✓        │ ✗ (no async execution)       │
 * │ async.maxJobs                     │ ✓        │ ✗ (no async execution)       │
 * │ notebook.enabled                  │ ✓        │ ✗ (Jupyter not in scope)     │
 * │ renderMermaid.enabled             │ ✓        │ ✗ (use kroki-diagram-api)    │
 * │ debug.enabled                     │ ✓        │ ✗ (DAP not integrated)       │
 * │ calc.enabled                      │ ✓        │ ✗ (use bash/python)          │
 * │ inspect_image.enabled             │ ✓        │ ✗ (vision model handled)     │
 * │ marketplace.autoUpdate            │ ✓        │ ✗ (no marketplace)           │
 * │ dev.autoqa                        │ ✓        │ ✗ (not yet)                  │
 * └───────────────────────────────────┴──────────┴──────────────────────────────┘
 *
 * Conscious divergences:
 * - The Firm only keeps settings for tools that actually exist in the runtime.
 * - All other upstream tool settings are removed to avoid dead UI toggles.
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

export const toolsSettings: SettingsProvider = {
	id: "tools",
	settings: {
		// ─── Search tools ──────────────────────────────────────────
		"grep.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Grep",
				description: "Enable the grep tool for content searching",
			},
		},

		"find.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Find",
				description: "Enable the find tool for file searching",
			},
		},
	},
};
