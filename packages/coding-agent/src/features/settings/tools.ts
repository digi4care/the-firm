/**
 * Tools settings provider.
 * Search, grep, browser, fetch, web search, MCP, async, artifact control.
 *
 * Upstream comparison (oh-my-pi Tools tab):
 * ┌───────────────────────────────────┬──────────┬──────────────────────────────┐
 * │ Setting                           │ Upstream │ The Firm                     │
 * ├───────────────────────────────────┼──────────┼──────────────────────────────┤
 * │ grep.enabled                      │ ✓        │ ✓                            │
 * │ grep.contextBefore                │ ✓        │ ✓                            │
 * │ grep.contextAfter                 │ ✓        │ ✓                            │
 * │ find.enabled                      │ ✓        │ ✓                            │
 * │ fetch.enabled                     │ ✓        │ ✓                            │
 * │ browser.enabled                   │ ✓        │ ✓                            │
 * │ browser.headless                  │ ✓        │ ✓                            │
 * │ browser.screenshotDir             │ ✓        │ ✓                            │
 * │ web_search.enabled                │ ✓        │ ✓                            │
 * │ astGrep.enabled / ast.enabled     │ ✓        │ ✓ (code-intelligence)        │
 * │ astEdit.enabled / ast.editEnabled │ ✓        │ ✓ (code-intelligence)        │
 * │ tools.artifactSpillThreshold      │ ✓        │ ✓                            │
 * │ tools.artifactTailBytes           │ ✓        │ ✓                            │
 * │ tools.artifactTailLines           │ ✓        │ ✓                            │
 * │ tools.intentTracing               │ ✓        │ ✓                            │
 * │ tools.maxTimeout                  │ ✓        │ ✓                            │
 * │ todo.enabled                      │ ✓        │ ✓                            │
 * │ todo.reminders                    │ ✓        │ ✓                            │
 * │ todo.reminders.max                │ ✓        │ ✓                            │
 * │ todo.eager                        │ ✓        │ ✓                            │
 * │ checkpoint.enabled                │ ✓        │ ✓                            │
 * │ github.enabled                    │ ✓        │ ✓                            │
 * │ mcp.enableProjectConfig           │ ✓        │ ✓                            │
 * │ mcp.discoveryMode                 │ ✓        │ ✓                            │
 * │ mcp.discoveryDefaultServers       │ ✓        │ ✓                            │
 * │ mcp.notifications                 │ ✓        │ ✓                            │
 * │ mcp.notificationDebounceMs        │ ✓        │ ✓                            │
 * │ async.enabled                     │ ✓        │ ✓                            │
 * │ async.maxJobs                     │ ✓ (100)  │ ✓ (50)                       │
 * ├───────────────────────────────────┼──────────┼──────────────────────────────┤
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
 * - notebook: Jupyter support not in scope for The Firm
 * - renderMermaid: The Firm uses kroki-diagram-api skill instead
 * - debug: DAP debugging not yet integrated
 * - calc: bash/python can handle calculations
 * - inspect_image: Vision model handling is provider-level, not a tool toggle
 * - marketplace: The Firm has no marketplace system
 * - dev.autoqa: Not yet applicable
 * - async.maxJobs: 50 vs upstream 100 (more conservative default)
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

		"grep.contextBefore": {
			type: "number",
			default: 0,
			ui: {
				tab: "tools",
				label: "Grep Context Before",
				description: "Lines of context before each grep match",
				submenu: true,
			},
		},

		"grep.contextAfter": {
			type: "number",
			default: 0,
			ui: {
				tab: "tools",
				label: "Grep Context After",
				description: "Lines of context after each grep match",
				submenu: true,
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

		// ─── Web tools ────────────────────────────────────────────
		"fetch.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Read URLs",
				description: "Allow the read tool to fetch and process URLs",
			},
		},

		"web_search.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Web Search",
				description: "Enable the web_search tool for web searching",
			},
		},

		// ─── Browser ──────────────────────────────────────────────
		"browser.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Browser",
				description: "Enable the browser tool for web browsing",
			},
		},

		"browser.headless": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Headless Browser",
				description: "Launch browser in headless mode (disable to show browser UI)",
			},
		},

		"browser.screenshotDir": {
			type: "string",
			default: undefined as unknown as string,
			ui: {
				tab: "tools",
				label: "Screenshot Directory",
				description: "Directory to save screenshots (supports ~). If unset, screenshots go to a temp file",
				submenu: true,
			},
		},

		// ─── Artifact control ─────────────────────────────────────
		"tools.artifactSpillThreshold": {
			type: "number",
			default: 50,
			ui: {
				tab: "tools",
				label: "Artifact Spill Threshold (KB)",
				description: "Tool output above this size is saved as an artifact; tail is kept inline",
				submenu: true,
			},
		},

		"tools.artifactTailBytes": {
			type: "number",
			default: 20,
			ui: {
				tab: "tools",
				label: "Artifact Tail Size (KB)",
				description: "Amount of tail content kept inline when output spills to artifact",
				submenu: true,
			},
		},

		"tools.artifactTailLines": {
			type: "number",
			default: 500,
			ui: {
				tab: "tools",
				label: "Artifact Tail Lines",
				description: "Maximum lines of tail content kept inline when output spills to artifact",
				submenu: true,
			},
		},

		// ─── Tool behavior ────────────────────────────────────────
		"tools.intentTracing": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Intent Tracing",
				description: "Ask the agent to describe the intent of each tool call before executing it",
			},
		},

		"tools.maxTimeout": {
			type: "number",
			default: 0,
			ui: {
				tab: "tools",
				label: "Max Tool Timeout",
				description: "Maximum timeout in seconds the agent can set for any tool (0 = no limit)",
				submenu: true,
			},
		},

		// ─── Todo tracking ────────────────────────────────────────
		"todo.enabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Todos",
				description: "Enable the todo_write tool for task tracking",
			},
		},

		"todo.reminders": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "Todo Reminders",
				description: "Remind agent to complete todos before stopping",
			},
		},

		"todo.reminders.max": {
			type: "number",
			default: 3,
			ui: {
				tab: "tools",
				label: "Todo Reminder Limit",
				description: "Maximum reminders to complete todos before giving up",
				submenu: true,
			},
		},

		"todo.eager": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tools",
				label: "Create Todos Automatically",
				description: "Automatically create a comprehensive todo list after the first message",
			},
		},

		// ─── Checkpoint/Rewind ────────────────────────────────────
		"checkpoint.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tools",
				label: "Checkpoint/Rewind",
				description: "Enable the checkpoint and rewind tools for context checkpointing",
			},
		},

		// ─── GitHub CLI ───────────────────────────────────────────
		"github.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tools",
				label: "GitHub CLI",
				description: "Enable read-only gh_* tools for GitHub repository, issue, and PR access",
			},
		},

		// ─── MCP ──────────────────────────────────────────────────
		"mcp.enableProjectConfig": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "MCP Project Config",
				description: "Load .mcp.json/mcp.json from project root",
			},
		},

		"mcp.discoveryMode": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tools",
				label: "MCP Tool Discovery",
				description: "Hide MCP tools by default and expose them through a tool discovery tool",
			},
		},

		"mcp.discoveryDefaultServers": {
			type: "array",
			default: [] as string[],
			ui: {
				tab: "tools",
				label: "MCP Discovery Default Servers",
				description: "Keep MCP tools from these servers visible while discovery mode hides other MCP tools",
			},
		},

		"mcp.notifications": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tools",
				label: "MCP Update Injection",
				description: "Inject MCP resource updates into the agent conversation",
			},
		},

		"mcp.notificationDebounceMs": {
			type: "number",
			default: 500,
			ui: {
				tab: "tools",
				label: "MCP Notification Debounce",
				description: "Debounce window for MCP resource update notifications before injecting into conversation",
				submenu: true,
			},
		},

		// ─── Async execution ──────────────────────────────────────
		"async.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tools",
				label: "Async Execution",
				description: "Enable async bash commands and background task execution",
			},
		},

		"async.maxJobs": {
			type: "number",
			default: 50,
			ui: {
				tab: "tools",
				label: "Max Async Jobs",
				description: "Maximum concurrent background jobs (1-100)",
				submenu: true,
			},
		},
	},
};
