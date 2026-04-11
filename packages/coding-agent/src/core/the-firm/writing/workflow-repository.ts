import type {
	BacklogItem,
	DecisionEntry,
	PhaseState,
	PhaseStatus,
	StaleInstance,
	WorkflowInstance,
	WorkflowPhase,
	WorkflowTemplate,
} from "../types/workflow.js";
import { WORKFLOW_INSTANCES_DIR, WORKFLOW_TEMPLATES_DIR } from "../types/workflow.js";
import type { FirmRepository } from "./firm-repository.js";

/**
 * Repository for workflow templates and instances.
 *
 * Templates are read-only YAML files deployed from defaults/.
 * Instances are mutable YAML files tracking per-workflow state.
 *
 * All paths are relative to the FirmRepository root (.firm/).
 */
export class WorkflowRepository {
	constructor(private readonly firmRepo: FirmRepository) {}

	// -- Template operations (read-only) ------------------------------------

	/** Read a workflow template by filename. Returns null if not found. */
	async readTemplate(fileName: string): Promise<WorkflowTemplate | null> {
		const raw = await this.firmRepo.read(`${WORKFLOW_TEMPLATES_DIR}/${fileName}`);
		if (raw === null) {
			return null;
		}
		return parseTemplateYaml(raw, fileName);
	}

	/** List all deployed template filenames. */
	async listTemplates(): Promise<string[]> {
		return await this.firmRepo.listFiles(WORKFLOW_TEMPLATES_DIR, ".yaml");
	}

	// -- Instance operations ------------------------------------------------

	/** Create a new workflow instance from a template. */
	async createInstance(
		template: WorkflowTemplate,
		instanceName: string,
		linkedSpec?: string
	): Promise<WorkflowInstance> {
		const now = new Date().toISOString();
		const firstPhase = template.phases[0]?.name ?? "";

		const phaseState: Record<string, PhaseState> = {};
		for (const phase of template.phases) {
			phaseState[phase.name] = {
				status: "not-started",
				retrospectiveFindings: [],
				backlogItems: [],
				decisions: [],
				artifacts: [],
			};
		}

		const instance: WorkflowInstance = {
			template: template.name,
			name: instanceName,
			linkedSpec,
			status: "not-started",
			currentPhase: firstPhase,
			created: now,
			updated: now,
			phaseState,
		};

		const fileName = instanceFileName(instanceName);
		await this.firmRepo.write(
			`${WORKFLOW_INSTANCES_DIR}/${fileName}`,
			serializeInstanceYaml(instance)
		);

		return instance;
	}

	/** Read a workflow instance by name. Returns null if not found. */
	async readInstance(instanceName: string): Promise<WorkflowInstance | null> {
		const fileName = instanceFileName(instanceName);
		const raw = await this.firmRepo.read(`${WORKFLOW_INSTANCES_DIR}/${fileName}`);
		if (raw === null) {
			return null;
		}
		return parseInstanceYaml(raw);
	}

	/** Write (update) a workflow instance. */
	async writeInstance(instance: WorkflowInstance): Promise<void> {
		instance.updated = new Date().toISOString();
		const fileName = instanceFileName(instance.name);
		await this.firmRepo.write(
			`${WORKFLOW_INSTANCES_DIR}/${fileName}`,
			serializeInstanceYaml(instance)
		);
	}

	/** List all instance filenames. */
	async listInstances(): Promise<string[]> {
		return await this.firmRepo.listFiles(WORKFLOW_INSTANCES_DIR, ".yaml");
	}

	/** Find instances that are stale based on update age and status. */
	async findStaleInstances(thresholdDays = 7): Promise<StaleInstance[]> {
		const instanceFiles = await this.listInstances();
		const stale: StaleInstance[] = [];
		const now = Date.now();

		for (const file of instanceFiles) {
			const name = file.replace(/\.yaml$/, "");
			const instance = await this.readInstance(name);
			if (!instance) {
				continue;
			}
			if (instance.status === "completed" || instance.status === "archived") {
				continue;
			}

			const updatedTime = new Date(instance.updated).getTime();
			if (Number.isNaN(updatedTime)) {
				continue;
			}
			const daysSinceUpdate = (now - updatedTime) / (24 * 60 * 60 * 1000);

			if (instance.status === "not-started" && daysSinceUpdate > Math.min(3, thresholdDays)) {
				stale.push({
					name,
					instance,
					reason: "not-started-too-long",
					staleDays: Math.round(daysSinceUpdate),
				});
			} else if (instance.status === "in-progress" && daysSinceUpdate > thresholdDays) {
				stale.push({
					name,
					instance,
					reason: "no-recent-progress",
					staleDays: Math.round(daysSinceUpdate),
				});
			}
		}

		return stale;
	}
}

// -- File naming ------------------------------------------------------------

/** Convert an instance name to a safe filename. */
export function instanceFileName(name: string): string {
	return `${name.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}.yaml`;
}

// -- YAML parsing (lightweight, no dependency) ------------------------------

/**
 * Parse a workflow template YAML string.
 * Expects top-level keys: name, description, type, phases.
 */
export function parseTemplateYaml(raw: string, source: string): WorkflowTemplate {
	const name = extractStringValue(raw, "name") ?? "";
	const description = extractStringValue(raw, "description") ?? "";
	const type = extractStringValue(raw, "type") ?? "";

	const phases = extractPhases(raw);

	if (!name) {
		throw new Error(`Template missing required 'name' field: ${source}`);
	}
	if (phases.length === 0) {
		throw new Error(`Template has no phases: ${source}`);
	}

	return { name, description, type, phases };
}

/**
 * Parse a workflow instance YAML string.
 * Handles nested phaseState with retrospectiveFindings and backlogItems.
 */
export function parseInstanceYaml(raw: string): WorkflowInstance {
	const name = extractStringValue(raw, "name") ?? "";
	const template = extractStringValue(raw, "template") ?? "";
	const rawLinkedSpec = extractStringValue(raw, "linkedSpec");
	const status = extractStringValue(raw, "status") ?? "not-started";
	const currentPhase = extractStringValue(raw, "currentPhase") ?? "";
	const created = extractStringValue(raw, "created") ?? "";
	const updated = extractStringValue(raw, "updated") ?? "";

	const phaseState = extractPhaseStates(raw);

	return {
		name,
		template,
		linkedSpec: rawLinkedSpec || undefined,
		status: status as WorkflowInstance["status"],
		currentPhase,
		created,
		updated,
		phaseState,
	};
}

/** Serialize a WorkflowInstance to YAML string. */
export function serializeInstanceYaml(instance: WorkflowInstance): string {
	const lines: string[] = [`template: "${instance.template}"`, `name: "${instance.name}"`];

	if (instance.linkedSpec) {
		lines.push(`linkedSpec: "${instance.linkedSpec}"`);
	}

	lines.push(
		`status: "${instance.status}"`,
		`currentPhase: "${instance.currentPhase}"`,
		`created: "${instance.created}"`,
		`updated: "${instance.updated}"`
	);

	lines.push("phaseState:");
	for (const [phaseName, state] of Object.entries(instance.phaseState)) {
		lines.push(`  ${phaseName}:`);
		lines.push(`    status: "${state.status}"`);
		if (state.completedAt) {
			lines.push(`    completedAt: "${state.completedAt}"`);
		}
		lines.push("    retrospectiveFindings:");
		for (const finding of state.retrospectiveFindings) {
			lines.push(`      - "${finding}"`);
		}
		lines.push("    backlogItems:");
		for (const item of state.backlogItems) {
			lines.push(`      - description: "${item.description}"`);
			lines.push(`        priority: "${item.priority}"`);
			if (item.deferredTo) {
				lines.push(`        deferredTo: "${item.deferredTo}"`);
			}
			if (item.syncedToBeads) {
				lines.push(`        syncedToBeads: "${item.syncedToBeads}"`);
			}
		}
		lines.push("    decisions:");
		for (const decision of state.decisions) {
			lines.push(`      - description: "${decision.description}"`);
			lines.push(`        outcome: "${decision.outcome}"`);
			if (decision.alternatives && decision.alternatives.length > 0) {
				lines.push("        alternatives:");
				for (const alt of decision.alternatives) {
					lines.push(`          - "${alt}"`);
				}
			}
		}
		lines.push("    artifacts:");
		for (const artifact of state.artifacts) {
			lines.push(`      - "${artifact}"`);
		}
	}

	return lines.join("\n");
}

// -- Internal helpers -------------------------------------------------------

function extractStringValue(raw: string, key: string): string | null {
	const regex = new RegExp(`^${key}:\\s*"?(.+?)"?\\s*$`, "m");
	const match = regex.exec(raw);
	if (!match) {
		return null;
	}
	return match[1].trim();
}

function extractPhases(raw: string): WorkflowPhase[] {
	const phases: WorkflowPhase[] = [];
	const phasesMatch = /^phases:\s*$/m.exec(raw);
	if (!phasesMatch) {
		return phases;
	}

	const afterPhases = raw.slice(phasesMatch.index + phasesMatch[0].length);
	const phaseBlocks = afterPhases.split(/\n[\t ]{2}- name:/).slice(1);

	for (const block of phaseBlocks) {
		const name = block.match(/^\s*"?(.+?)"?\s*$/m)?.[1]?.trim() ?? "";
		const rawAgent = block
			.match(/agent:\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");
		const skillsMatch = block.match(/skills:\s*\[(.+?)\]/);
		const skills = skillsMatch
			? skillsMatch[1].split(",").map((s: string) => s.trim().replace(/^"|"$/g, ""))
			: undefined;

		const gate = extractStringArray(block, "gate");
		const retrospective = extractStringArray(block, "retrospective");

		phases.push({
			name,
			...(rawAgent ? { agent: rawAgent } : {}),
			...(skills ? { skills } : {}),
			gate,
			retrospective,
		});
	}

	return phases;
}

function extractStringArray(block: string, key: string): string[] {
	// Match inline array: key: [a, b, c]
	const inlineMatch = block.match(new RegExp(`${key}:\\s*\\[(.+?)\\]`));
	if (inlineMatch) {
		return inlineMatch[1].split(",").map((s: string) => s.trim().replace(/^"|"$/g, ""));
	}

	// Match YAML list: key:\n  - "item"
	const items: string[] = [];
	const listRegex = new RegExp(`${key}:\\s*\\n((?:\\s+- "?[^\\n]+"?\\n?)+)`);
	const listMatch = listRegex.exec(block);
	if (listMatch) {
		const listBlock = listMatch[1];
		const itemRegex = /-\s*"?(.+?)"?\s*$/gm;
		let itemMatch = itemRegex.exec(listBlock);
		while (itemMatch !== null) {
			items.push(itemMatch[1].replace(/"$/, "").trim());
			itemMatch = itemRegex.exec(listBlock);
		}
	}

	return items;
}

function extractPhaseStates(raw: string): Record<string, PhaseState> {
	const states: Record<string, PhaseState> = {};

	const psMatch = /^phaseState:\s*$/m.exec(raw);
	if (!psMatch) {
		return states;
	}

	const afterPs = raw.slice(psMatch.index + psMatch[0].length);

	// Each phase block starts with "  phaseName:" at exactly 2-space indent.
	// Sub-keys (status, retrospectiveFindings, etc.) are at 4+ spaces.
	const phaseRegex = /^\s{2}(\S[^:]*):\s*$/gm;
	const phaseRanges: { name: string; contentStart: number; blockEnd: number }[] = [];

	let phaseMatch = phaseRegex.exec(afterPs);
	while (phaseMatch !== null) {
		phaseRanges.push({
			name: phaseMatch[1],
			contentStart: phaseMatch.index + phaseMatch[0].length,
			blockEnd: phaseMatch.index,
		});
		phaseMatch = phaseRegex.exec(afterPs);
	}

	for (let i = 0; i < phaseRanges.length; i++) {
		const { name, contentStart } = phaseRanges[i];
		const endIndex = i + 1 < phaseRanges.length ? phaseRanges[i + 1].blockEnd : afterPs.length;
		const block = afterPs.slice(contentStart, endIndex);

		const rawStatus = block.match(/status:\s*"?(.+?)"?\s*$/m)?.[1]?.trim() ?? "not-started";
		const rawCompletedAt = block
			.match(/completedAt:\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");

		const retrospectiveFindings = extractStringArray(block, "retrospectiveFindings");
		const backlogItems = extractBacklogItems(block);
		const decisions = extractDecisions(block);
		const artifacts = extractStringArray(block, "artifacts");

		const state: PhaseState = {
			status: rawStatus as PhaseStatus,
			retrospectiveFindings,
			backlogItems,
			decisions,
			artifacts,
		};
		if (rawCompletedAt) {
			state.completedAt = rawCompletedAt;
		}

		states[name] = state;
	}

	return states;
}

function extractBacklogItems(block: string): BacklogItem[] {
	const items: BacklogItem[] = [];

	// Find 'backlogItems:' line. If followed by [] or nothing, return empty.
	const biKeyMatch = /backlogItems:\s*$/m.exec(block);
	if (!biKeyMatch) {
		return items;
	}

	// Collect all lines after backlogItems: that are indented (part of the list)
	const afterKey = block.slice(biKeyMatch.index + biKeyMatch[0].length);
	const lines = afterKey.split("\n");
	const listLines: string[] = [];
	for (const line of lines) {
		if (line.trim().length === 0) {
			continue;
		}
		// Lines belonging to backlogItems are indented with 6+ spaces
		// (2 for phase, 4 for sub-block, 2+ for list item content)
		if (line.match(/^\s{6,}/)) {
			listLines.push(line);
		} else {
			break;
		}
	}

	if (listLines.length === 0) {
		return items;
	}

	// Reconstruct the text block and split into individual items
	const biBlock = listLines.join("\n");
	const itemBlocks = biBlock.split(/- description:/).slice(1);

	for (const itemBlock of itemBlocks) {
		const description = itemBlock
			.match(/^\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");
		const priority = itemBlock
			.match(/priority:\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");
		const deferredTo = itemBlock
			.match(/deferredTo:\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");
		const syncedToBeads = itemBlock
			.match(/syncedToBeads:\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");

		if (description && priority) {
			items.push({
				description,
				priority: priority as BacklogItem["priority"],
				...(deferredTo ? { deferredTo } : {}),
				...(syncedToBeads ? { syncedToBeads } : {}),
			});
		}
	}

	return items;
}
function extractDecisions(block: string): DecisionEntry[] {
	const decisions: DecisionEntry[] = [];

	const decKeyMatch = /decisions:\s*$/m.exec(block);
	if (!decKeyMatch) {
		return decisions;
	}

	// Collect indented lines after 'decisions:'
	const afterKey = block.slice(decKeyMatch.index + decKeyMatch[0].length);
	const lines = afterKey.split("\n");
	const listLines: string[] = [];
	for (const line of lines) {
		if (line.trim().length === 0) {
			continue;
		}
		if (line.match(/^\s{6,}/)) {
			listLines.push(line);
		} else {
			break;
		}
	}

	if (listLines.length === 0) {
		return decisions;
	}

	// Split into individual decision entries (each starts with "- description:")
	const decBlock = listLines.join("\n");
	const entryBlocks = decBlock.split(/- description:/).slice(1);

	for (const entryBlock of entryBlocks) {
		const description = entryBlock
			.match(/^\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");
		const outcome = entryBlock
			.match(/outcome:\s*"?(.+?)"?\s*$/m)?.[1]
			?.trim()
			?.replace(/"$/, "");

		if (!description || !outcome) {
			continue;
		}

		const alts = extractStringArray(entryBlock, "alternatives");

		decisions.push({
			description,
			outcome,
			...(alts.length > 0 ? { alternatives: alts } : {}),
		});
	}

	return decisions;
}
