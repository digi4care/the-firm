/**
 * Dynamic Context Pruning — migrated from pi-dcp extension.
 *
 * Pure pruning workflow that operates on AgentMessage arrays.
 * No extension API dependencies. Configurable via DcpConfig.
 *
 * Rules (executed in order):
 * 1. deduplication — remove duplicate tool outputs
 * 2. error-purging — remove resolved errors
 * 3. superseded-writes — remove older file writes
 * 4. tool-pairing — protect tool_use/tool_result pairs (CRITICAL, runs last)
 * 5. recency — always keep last N messages (safety net, runs after tool-pairing)
 */

import type { AgentMessage } from '@digi4care/the-firm-agent-core';

// ─── Types ─────────────────────────────────────────────────────────────

export type DcpRuleName = 'deduplication' | 'error-purging' | 'recency' | 'superseded-writes' | 'tool-pairing';

export interface DcpConfig {
	/** Master enable/disable toggle */
	enabled: boolean;
	/** Always keep last N messages (default: 4) */
	keepRecentCount: number;
	/** Which rules to apply and in which order */
	rules: DcpRuleName[];
}

export interface MessageMeta {
	hash?: string;
	filePath?: string;
	isError?: boolean;
	errorResolved?: boolean;
	shouldPrune?: boolean;
	pruneReason?: string;
	hasToolUse?: boolean;
	hasToolResult?: boolean;
	toolUseIds?: string[];
	protectedByRecency?: boolean;
	protectedByToolPairing?: boolean;
}

interface MsgWithMeta {
	msg: AgentMessage;
	meta: MessageMeta;
}

// ─── Metadata helpers ──────────────────────────────────────────────────

function simpleHash(content: unknown): string {
	const str = typeof content === 'string' ? content : JSON.stringify(content);
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		const c = str.charCodeAt(i);
		h = ((h << 5) - h + c) | 0;
	}
	return h.toString(36);
}

function extractToolUseIds(msg: AgentMessage): string[] {
	const ids: string[] = [];
	const content = (msg as any).content;
	if (Array.isArray(content)) {
		for (const block of content) {
			if (block?.type === 'tool_use' && block.id) ids.push(block.id);
		}
	}
	return ids;
}

function hasToolUse(msg: AgentMessage): boolean {
	const content = (msg as any).content;
	if (Array.isArray(content)) return content.some((b: any) => b?.type === 'tool_use');
	return false;
}

function hasToolResult(msg: AgentMessage): boolean {
	const content = (msg as any).content;
	if (Array.isArray(content)) return content.some((b: any) => b?.type === 'tool_result');
	return msg.role === 'toolResult';
}

function isErrorMessage(msg: AgentMessage): boolean {
	const content = (msg as any).content;
	if (Array.isArray(content)) return content.some((b: any) => b?.is_error === true);
	return false;
}

function extractFilePath(msg: AgentMessage): string | undefined {
	const content = (msg as any).content;
	if (!Array.isArray(content)) return undefined;
	for (const block of content) {
		// Check tool_use input for path
		if (block?.type === 'tool_use' && block.input?.path) return block.input.path;
		// Check tool_result content for file path patterns
		if (block?.type === 'tool_result' && typeof block.content === 'string') {
			const match = block.content.match(/(?:wrote|edited|modified)\s+([^\s]+)/i);
			if (match) return match[1];
		}
	}
	return undefined;
}

function isSameOperation(a: AgentMessage, b: AgentMessage): boolean {
	// Compare tool operations by name and input (for tool_use messages)
	const aContent = (a as any).content;
	const bContent = (b as any).content;
	const aToolUse = Array.isArray(aContent) ? aContent.find((b: any) => b?.type === 'tool_use') : null;
	const bToolUse = Array.isArray(bContent) ? bContent.find((b: any) => b?.type === 'tool_use') : null;
	if (aToolUse && bToolUse) {
		return aToolUse.name === bToolUse.name && JSON.stringify(aToolUse.input) === JSON.stringify(bToolUse.input);
	}
	// If comparing tool_results, match by looking at the tool_call context
	// Use file path as a fallback heuristic
	const aPath = extractFilePath(a);
	const bPath = extractFilePath(b);
	if (aPath && bPath) return aPath === bPath;
	return false;
}

// ─── Rules ─────────────────────────────────────────────────────────────

type RuleFn = (msgs: MsgWithMeta[]) => void;

function deduplicationRule(msgs: MsgWithMeta[]): void {
	// Phase 1: hash all messages
	for (const m of msgs) {
		m.meta.hash = simpleHash(m.msg.content);
	}
	// Phase 2: mark duplicates
	const seen = new Set<string>();
	for (const m of msgs) {
		if (m.meta.shouldPrune) continue;
		if (m.msg.role === 'user') { seen.add(m.meta.hash!); continue; }
		if (seen.has(m.meta.hash!)) {
			m.meta.shouldPrune = true;
			m.meta.pruneReason = 'duplicate content';
		} else {
			seen.add(m.meta.hash!);
		}
	}
}

function errorPurgingRule(msgs: MsgWithMeta[]): void {
	// Extract file paths first (needed for matching)
	for (const m of msgs) {
		const path = extractFilePath(m.msg);
		if (path) m.meta.filePath = path;
	}

	// Identify error tool_results and check if resolved by later success
	for (let i = 0; i < msgs.length; i++) {
		const m = msgs[i];
		if (m.meta.shouldPrune) continue;
		const isError = isErrorMessage(m.msg);
		if (!isError) continue;

		// Find the tool_use that preceded this error result
		const errorToolUseIds: string[] = [];
		if (hasToolResult(m.msg)) {
			const content = (m.msg as any).content;
			if (Array.isArray(content)) {
				for (const block of content) {
					if (block?.tool_use_id) errorToolUseIds.push(block.tool_use_id);
				}
			}
		}

		// Look ahead for a successful result for the same file/tool operation
		let resolved = false;
		// First try to find the tool_use for this error result, get its file path
		let errorFilePath = m.meta.filePath;
		if (!errorFilePath) {
			// Look backward for the tool_use with matching tool_use_id
			for (const id of errorToolUseIds) {
				for (let k = i - 1; k >= 0; k--) {
					const prevIds = extractToolUseIds(msgs[k].msg);
					if (prevIds.includes(id) && msgs[k].meta.filePath) {
						errorFilePath = msgs[k].meta.filePath;
						break;
					}
				}
				if (errorFilePath) break;
			}
		}
		if (errorFilePath) {
			for (let j = i + 1; j < msgs.length; j++) {
				if (msgs[j].meta.filePath === errorFilePath && !isErrorMessage(msgs[j].msg)) {
					resolved = true;
					break;
				}
			}
		}
		if (!resolved) {
			// Match by same operation (tool name + input)
			for (let j = i + 1; j < msgs.length; j++) {
				if (!isErrorMessage(msgs[j].msg) && isSameOperation(msgs[j].msg, m.msg)) {
					resolved = true;
					break;
				}
			}
		}

		if (resolved) {
			m.meta.isError = true;
			m.meta.errorResolved = true;
			m.meta.shouldPrune = true;
			m.meta.pruneReason = 'error resolved by later success';
		}
	}
}

function supersededWritesRule(msgs: MsgWithMeta[]): void {
	// Extract file paths
	for (const m of msgs) {
		const path = extractFilePath(m.msg);
		if (path) m.meta.filePath = path;
	}
	// Mark superseded writes
	for (let i = 0; i < msgs.length; i++) {
		const m = msgs[i];
		if (m.meta.shouldPrune) continue;
		if (!m.meta.filePath) continue;
		if (m.msg.role === 'user') continue;
		// Check if there's a later write to the same file
		for (let j = i + 1; j < msgs.length; j++) {
			if (msgs[j].meta.filePath === m.meta.filePath) {
				m.meta.shouldPrune = true;
				m.meta.pruneReason = `superseded by later write to ${m.meta.filePath}`;
				break;
			}
		}
	}
}

function toolPairingRule(msgs: MsgWithMeta[]): void {
	// Prepare: extract tool IDs
	for (const m of msgs) {
		m.meta.hasToolUse = hasToolUse(m.msg);
		m.meta.hasToolResult = hasToolResult(m.msg);
		m.meta.toolUseIds = extractToolUseIds(m.msg);
	}

	// Forward pass: cascade prune tool_results when tool_use is pruned
	for (let i = 0; i < msgs.length; i++) {
		const m = msgs[i];
		if (!m.meta.hasToolUse || !m.meta.toolUseIds?.length) continue;
		if (!m.meta.shouldPrune) continue;

		for (let j = i + 1; j < msgs.length; j++) {
			const n = msgs[j];
			if (!n.meta.hasToolResult || !n.meta.toolUseIds) continue;
			if (m.meta.toolUseIds.some((id) => n.meta.toolUseIds!.includes(id))) {
				if (!n.meta.shouldPrune) {
					n.meta.shouldPrune = true;
					n.meta.pruneReason = 'orphaned tool_result (tool_use was pruned)';
				}
			}
		}
	}

	// Backward pass: protect tool_use when tool_result is kept
	for (let i = msgs.length - 1; i >= 0; i--) {
		const m = msgs[i];
		if (!m.meta.hasToolResult || m.meta.shouldPrune) continue;
		if (!m.meta.toolUseIds?.length) continue;

		for (let j = i - 1; j >= 0; j--) {
			const n = msgs[j];
			if (!n.meta.hasToolUse || !n.meta.toolUseIds) continue;
			if (m.meta.toolUseIds.some((id) => n.meta.toolUseIds!.includes(id))) {
				if (n.meta.shouldPrune) {
					n.meta.shouldPrune = false;
					n.meta.pruneReason = undefined;
					n.meta.protectedByToolPairing = true;
				}
			}
		}
	}

	// Also protect tool_results of protected tool_uses
	for (let i = 0; i < msgs.length; i++) {
		const m = msgs[i];
		if (!m.meta.hasToolUse || m.meta.shouldPrune) continue;
		if (!m.meta.toolUseIds?.length) continue;

		for (let j = i + 1; j < msgs.length; j++) {
			const n = msgs[j];
			if (!n.meta.hasToolResult || !n.meta.toolUseIds) continue;
			if (m.meta.toolUseIds.some((id) => n.meta.toolUseIds!.includes(id))) {
				if (n.meta.shouldPrune) {
					n.meta.shouldPrune = false;
					n.meta.pruneReason = undefined;
					n.meta.protectedByToolPairing = true;
				}
			}
		}
	}
}

function recencyRule(msgs: MsgWithMeta[], keepCount: number): void {
	const threshold = msgs.length - keepCount;
	for (let i = 0; i < msgs.length; i++) {
		if (i >= threshold) {
			msgs[i].meta.shouldPrune = false;
			msgs[i].meta.pruneReason = undefined;
			msgs[i].meta.protectedByRecency = true;
		}
	}
}

// ─── Rule dispatch ─────────────────────────────────────────────────────

const RULE_MAP: Record<DcpRuleName, RuleFn | null> = {
	'deduplication': deduplicationRule,
	'error-purging': errorPurgingRule,
	'superseded-writes': supersededWritesRule,
	'tool-pairing': toolPairingRule,
	'recency': null, // handled specially
};

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Apply context pruning to a message array.
 *
 * Order:
 * 1. Run user-specified rules in order (but recency always runs last)
 * 2. Recency rule is the safety net that always runs after tool-pairing
 */
export function applyContextPruning(messages: AgentMessage[], config: DcpConfig): AgentMessage[] {
	if (!config.enabled || messages.length === 0) {
		return messages;
	}

	// Wrap with metadata
	const wrapped: MsgWithMeta[] = messages.map((msg) => ({ msg, meta: {} }));

	// Run non-recency rules in order
	for (const ruleName of config.rules) {
		if (ruleName === 'recency') continue; // recency runs last
		const ruleFn = RULE_MAP[ruleName];
		if (ruleFn) ruleFn(wrapped);
	}

	// Recency is the safety net — always runs last
	recencyRule(wrapped, config.keepRecentCount);

	// Filter
	return wrapped.filter((m) => !m.meta.shouldPrune).map((m) => m.msg);
}
