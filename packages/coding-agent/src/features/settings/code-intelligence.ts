/**
 * Code Intelligence settings provider.
 *
 * LSP and AST tool configuration following Mario's philosophy:
 * - Default disabled (no "dark matter")
 * - Opt-in via explicit settings
 * - LSP diagnostics only after batch complete (not during edit)
 *
 * @module features/settings/code-intelligence
 */
import type { SettingsProvider } from "../../core/settings-registry.js";

/**
 * Settings provider for LSP (Language Server Protocol) and AST tools.
 *
 * Design principles:
 * 1. Minimal by default — all features disabled unless explicitly enabled
 * 2. No interruptions during editing — LSP runs at natural sync points
 * 3. Granular control — master toggles + sub-options
 */
export const codeIntelligenceSettings: SettingsProvider = {
	id: "codeIntelligence",
	settings: {
		// ═══════════════════════════════════════════════════════════════════
		// LSP Settings — Editing tab
		// ═══════════════════════════════════════════════════════════════════

		/**
		 * Master toggle for LSP integration.
		 * Default: false (Mario's philosophy — no dark matter)
		 */
		"lsp.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "editing",
				label: "LSP Tool",
				description: "Enable the lsp tool for language server protocol integration",
			},
		},

		/**
		 * When to return LSP diagnostics.
		 * - off: Never return diagnostics
		 * - onWrite: Return diagnostics after each file write
		 * - onBatchComplete: Return diagnostics after batch complete (default)
		 *
		 * Note: "onBatchComplete" follows Mario's philosophy — no interruptions
		 * during the edit flow. The natural synchronization point is when the
		 * agent thinks it's done.
		 */
		"lsp.diagnosticsMode": {
			type: "enum",
			values: ["off", "onWrite", "onBatchComplete"] as const,
			default: "onBatchComplete",
			ui: {
				tab: "editing",
				label: "LSP Diagnostics Mode",
				description: "When to return LSP diagnostics (off / after write / after batch complete)",
				submenu: true,
				scopeSelector: true,
			},
		},

		/**
		 * Automatically format code files using LSP after writing.
		 * Default: false (opt-in)
		 */
		"lsp.formatOnWrite": {
			type: "boolean",
			default: false,
			ui: {
				tab: "editing",
				label: "Format on Write",
				description: "Automatically format code files using LSP after writing",
				scopeSelector: true,
			},
		},

		// ═══════════════════════════════════════════════════════════════════
		// AST Settings — Tools tab
		// ═══════════════════════════════════════════════════════════════════

		/**
		 * Master toggle for AST tools.
		 * Default: false (Mario's philosophy — no dark matter)
		 */
		"ast.enabled": {
			type: "boolean",
			default: false,
			ui: {
				tab: "tools",
				label: "AST Tools",
				description: "Enable ast_grep and ast_edit tools for structural code search/rewrite",
			},
		},

		/**
		 * Enable structural AST search (ast_grep tool).
		 * Only effective when ast.enabled is true.
		 * Default: true (when AST is enabled)
		 */
		"ast.grepEnabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "AST Grep",
				description: "Enable structural AST search (requires AST Tools to be enabled)",
				scopeSelector: true,
			},
		},

		/**
		 * Enable structural AST rewrites (ast_edit tool).
		 * Only effective when ast.enabled is true.
		 * Default: true (when AST is enabled)
		 */
		"ast.editEnabled": {
			type: "boolean",
			default: true,
			ui: {
				tab: "tools",
				label: "AST Edit",
				description: "Enable structural AST rewrites (requires AST Tools to be enabled)",
				scopeSelector: true,
			},
		},
	},
};
