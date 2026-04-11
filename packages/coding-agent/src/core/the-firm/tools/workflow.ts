import type { ToolResult } from "../types/pipeline.js";
import type {
	BacklogItem,
	DecisionEntry,
	WorkflowAction,
	WorkflowInput,
	WorkflowInstance,
	WorkflowPhase,
	WorkflowTemplate,
} from "../types/workflow.js";
import type { WorkflowRepository } from "../writing/workflow-repository.js";

// -- Gate check types (G2+G5) -------------------------------------------------

export interface GateCheckResult {
	passed: boolean;
	checked: { criterion: string; satisfied: boolean; finding: string | null }[];
	warnings: string[];
}

/**
 * Stop words filtered from keyword extraction.
 */
const stopWords = new Set([
	"a",
	"an",
	"the",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"have",
	"has",
	"had",
	"do",
	"does",
	"did",
	"will",
	"would",
	"could",
	"should",
	"may",
	"might",
	"must",
	"shall",
	"can",
	"need",
	"dare",
	"ought",
	"used",
	"to",
	"of",
	"in",
	"for",
	"on",
	"with",
	"at",
	"by",
	"from",
	"as",
	"into",
	"through",
	"during",
	"before",
	"after",
	"above",
	"below",
	"between",
	"out",
	"off",
	"over",
	"under",
	"again",
	"further",
	"then",
	"once",
	"and",
	"but",
	"or",
	"nor",
	"not",
	"so",
	"yet",
	"both",
	"either",
	"neither",
	"each",
	"every",
	"all",
	"any",
	"few",
	"more",
	"most",
	"other",
	"some",
	"such",
	"no",
	"only",
	"own",
	"same",
	"than",
	"too",
	"very",
	"just",
	"because",
	"if",
	"when",
	"where",
	"how",
	"what",
	"which",
	"who",
	"whom",
	"this",
	"that",
	"these",
	"those",
	"it",
	"its",
	"they",
	"them",
	"their",
	"we",
	"our",
	"you",
	"your",
	"he",
	"him",
	"his",
	"she",
	"her",
]);

// -- Stemming + synonym matching (G2+G5) ------------------------------------

/**
 * Common English suffix rules for simple stemming.
 * Not a full Porter stemmer — handles patterns seen in gate criteria
 * and retrospective findings.
 */
const stemRules: [RegExp, string][] = [
	[/ies$/, "y"],
	[/ied$/, "y"],
	[/ing$/, ""],
	[/tion$/, ""],
	[/sion$/, ""],
	[/ment$/, ""],
	[/ness$/, ""],
	[/able$/, ""],
	[/ible$/, ""],
	[/ful$/, ""],
	[/less$/, ""],
	[/ous$/, ""],
	[/ive$/, ""],
	[/al$/, ""],
	[/ed$/, ""],
	[/er$/, ""],
	[/ly$/, ""],
	[/es$/, ""],
	[/s$/, ""],
];

/**
 * Synonym groups — words in the same group match each other.
 */
const SYNONYM_GROUPS: string[][] = [
	["test", "spec", "specification", "verification", "validate", "validation", "check"],
	["implement", "build", "develop", "code", "write", "create"],
	["design", "architect", "structure", "plan", "model"],
	["review", "audit", "inspect", "examine"],
	["document", "doc", "docs", "documentation"],
	["deploy", "release", "ship", "publish"],
	["refactor", "restructur", "cleanup", "clean", "reorganiz"],
	["config", "configuration", "setup", "setting"],
	["error", "bug", "defect", "issue", "fault", "fail"],
	["security", "secur", "vulnerability", "auth", "protect"],
	["perform", "speed", "optimiz", "efficien", "fast", "latency"],
	["standard", "convention", "guideline", "rule", "policy"],
];

function stem(word: string): string {
	const lower = word.toLowerCase();
	for (const [regex, replacement] of stemRules) {
		if (regex.test(lower)) {
			return lower.replace(regex, replacement);
		}
	}
	return lower;
}

// Build synonym lookup: each stemmed word maps to its full stemmed group
const synonymMap = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
	const stemmedGroup = group.map((w) => stem(w));
	for (const word of stemmedGroup) {
		synonymMap.set(word, stemmedGroup);
	}
}

/**
 * Extract meaningful keywords from text for gate matching.
 * Returns stemmed keywords.
 */
function extractKeyWords(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.split(/\s+/)
		.filter((w) => w.length > 2 && !stopWords.has(w))
		.map((w) => stem(w));
}

/**
 * Check if two sets of keywords have sufficient overlap,
 * considering synonym groups and partial matches.
 */
function hasKeywordOverlap(
	criterionWords: string[],
	findingWords: string[],
	threshold = 2,
): boolean {
	let matchCount = 0;
	const findingSet = new Set(findingWords);

	for (const cw of criterionWords) {
		// Direct match
		if (findingSet.has(cw)) {
			matchCount++;
			continue;
		}
		// Synonym match
		const synonyms = synonymMap.get(cw);
		if (synonyms) {
			for (const syn of synonyms) {
				if (findingSet.has(syn)) {
					matchCount++;
					break;
				}
			}
			continue;
		}
		// Partial match (3+ char prefix overlap)
		if (cw.length >= 3) {
			for (const fw of findingWords) {
				if (fw.length >= 3 && (fw.startsWith(cw) || cw.startsWith(fw))) {
					matchCount++;
					break;
				}
			}
		}
	}

	return matchCount >= Math.min(threshold, criterionWords.length);
}

/**
 * kb-workflow — manages workflow template instances.
 *
 * Standalone tool (does NOT extend KBToolBase) because workflow operations
 * are fundamentally different from the scan→analyze→propose→write pipeline.
 * Workflow state is managed through the WorkflowRepository directly.
 *
 * Actions:
 * - list:    Show all deployed templates and active instances
 * - create:  Start a new workflow instance from a template
 * - status:  Show current state of a workflow instance
 * - advance: Move to the next phase (runs retrospective on current phase)
 * - update:  Add retrospective findings or backlog items to current phase
 * - close:   Mark instance as completed, run final retrospective
 * - stale:   Find instances that have been inactive too long
 */
export class WorkflowTool {
	readonly name = "kb-workflow";
	readonly description = "Manage workflow template instances";

	constructor(private readonly workflowRepo: WorkflowRepository) {}
	async execute(input: WorkflowInput): Promise<ToolResult> {
		const { action, template, name, spec, retrospective, backlog, artifacts, decisions } =
			input.options;

		try {
			switch (action) {
				case "list":
					return await this.handleList();
				case "create":
					return await this.handleCreate(template, name, spec);
				case "status":
					return await this.handleStatus(name);
				case "advance":
					return await this.handleAdvance(name, retrospective, artifacts);
				case "update":
					return await this.handleUpdate(name, retrospective, backlog, decisions);
				case "close":
					return await this.handleClose(name, retrospective);
				case "stale":
					return await this.handleStale(input.options.staleThresholdDays);
				case "sync-backlog":
					return await this.handleSyncBacklog(name);
				case "handoff":
					return await this.handleHandoff(name);
				case "resume":
					return await this.handleResume(name);
				default:
					return {
						status: "error",
						message: `Unknown action: ${action}`,
					};
			}
		} catch (error) {
			return {
				status: "error",
				message: error instanceof Error ? error.message : String(error),
			};
		}
	}

	// -- Action handlers ----------------------------------------------------

	private async handleList(): Promise<ToolResult> {
		const templates = await this.workflowRepo.listTemplates();
		const instanceFiles = await this.workflowRepo.listInstances();

		const instances: WorkflowInstance[] = [];
		for (const file of instanceFiles) {
			const instanceName = file.replace(/\.yaml$/, "");
			const instance = await this.workflowRepo.readInstance(instanceName);
			if (instance) {
				instances.push(instance);
			}
		}

		return {
			status: "success",
			message: `${templates.length} template(s), ${instances.length} instance(s)`,
			metadata: { templates, instances },
		};
	}

	private async handleCreate(
		templateName?: string,
		instanceName?: string,
		spec?: string
	): Promise<ToolResult> {
		if (!templateName) {
			return {
				status: "error",
				message: "Missing required option: template",
			};
		}
		if (!instanceName) {
			return {
				status: "error",
				message: "Missing required option: name",
			};
		}

		const template = await this.loadTemplate(templateName);
		if (!template) {
			return {
				status: "error",
				message: `Template not found: ${templateName}`,
			};
		}

		// Check for duplicate instance name
		const existing = await this.workflowRepo.readInstance(instanceName);
		if (existing) {
			return {
				status: "error",
				message: `Instance already exists: ${instanceName}`,
			};
		}

		const instance = await this.workflowRepo.createInstance(template, instanceName, spec);

		// Auto-advance to first phase (mark it in-progress)
		instance.status = "in-progress";
		if (template.phases.length > 0) {
			instance.phaseState[template.phases[0].name].status = "in-progress";
		}
		await this.workflowRepo.writeInstance(instance);

		return {
			status: "success",
			message: `Created workflow instance "${instanceName}" from template "${templateName}"`,
			metadata: { instance },
		};
	}

	private async handleStatus(name?: string): Promise<ToolResult> {
		if (!name) {
			return {
				status: "error",
				message: "Missing required option: name",
			};
		}

		const instance = await this.workflowRepo.readInstance(name);
		if (!instance) {
			return {
				status: "error",
				message: `Instance not found: ${name}`,
			};
		}

		return {
			status: "success",
			message: `Instance "${name}" is ${instance.status}, phase: ${instance.currentPhase}`,
			metadata: { instance },
		};
	}

	private async handleAdvance(
		name?: string,
		retrospective?: string[],
		artifacts?: string[]
	): Promise<ToolResult> {
		if (!name) {
			return {
				status: "error",
				message: "Missing required option: name",
			};
		}

		const instance = await this.workflowRepo.readInstance(name);
		if (!instance) {
			return {
				status: "error",
				message: `Instance not found: ${name}`,
			};
		}

		if (instance.status === "completed" || instance.status === "archived") {
			return {
				status: "error",
				message: `Cannot advance a ${instance.status} instance`,
			};
		}

		// Load template for gate criteria
		const template = await this.loadTemplate(instance.template);
		const phases = template?.phases ?? [];
		const currentPhaseDef = phases.find((p) => p.name === instance.currentPhase);

		// Complete current phase with retrospective
		const currentPhaseState = instance.phaseState[instance.currentPhase];
		if (currentPhaseState) {
			currentPhaseState.status = "completed";
			currentPhaseState.completedAt = new Date().toISOString();
			if (retrospective) {
				currentPhaseState.retrospectiveFindings.push(...retrospective);
			}
			if (artifacts) {
				currentPhaseState.artifacts.push(...artifacts.filter((a) => a !== ""));
			}
		}

		// Gate check: verify retrospective findings address gate criteria
		const gateResult = this.checkGateCriteria(currentPhaseDef, currentPhaseState);

		// Find next phase
		const currentIdx = phases.findIndex((p) => p.name === instance.currentPhase);
		const nextIdx = currentIdx + 1;

		if (nextIdx >= phases.length) {
			// All phases complete
			instance.status = "completed";
			await this.workflowRepo.writeInstance(instance);

			const completionMessage = gateResult.passed
				? `All phases complete. Instance "${name}" marked as completed.`
				: `All phases complete (gate warnings). Instance "${name}" marked as completed.\nGate warnings:\n${gateResult.warnings.map((w) => `- ${w}`).join("\n")}`;

			return {
				status: "success",
				message: completionMessage,
				metadata: { instance, gateCheck: gateResult },
			};
		}

		// Advance to next phase
		const nextPhase = phases[nextIdx];
		instance.currentPhase = nextPhase.name;
		instance.phaseState[nextPhase.name].status = "in-progress";
		instance.updated = new Date().toISOString();
		await this.workflowRepo.writeInstance(instance);

		const gateWarningLines = gateResult.warnings.map((w) => `- ${w}`).join("\n");
		const gateMessage = gateResult.passed
			? ""
			: `\nGate warnings for completed phase:\n${gateWarningLines}`;

		return {
			status: "success",
			message: `Advanced to phase "${nextPhase.name}"${gateMessage}`,
			metadata: { instance, gateCheck: gateResult },
		};
	}

	private async handleUpdate(
		name?: string,
		retrospective?: string[],
		backlog?: BacklogItem[],
		decisions?: DecisionEntry[]
	): Promise<ToolResult> {
		if (!name) {
			return {
				status: "error",
				message: "Missing required option: name",
			};
		}

		const instance = await this.workflowRepo.readInstance(name);
		if (!instance) {
			return {
				status: "error",
				message: `Instance not found: ${name}`,
			};
		}

		if (instance.status === "completed" || instance.status === "archived") {
			return {
				status: "error",
				message: `Cannot update a ${instance.status} instance`,
			};
		}

		const phaseState = instance.phaseState[instance.currentPhase];
		let addedFindings = 0;
		let addedItems = 0;
		let addedDecisions = 0;

		if (retrospective && phaseState) {
			phaseState.retrospectiveFindings.push(...retrospective);
			addedFindings = retrospective.length;
		}

		if (backlog && phaseState) {
			phaseState.backlogItems.push(...backlog);
			addedItems = backlog.length;
		}

		if (decisions && phaseState) {
			phaseState.decisions.push(...decisions);
			addedDecisions = decisions.length;
		}

		await this.workflowRepo.writeInstance(instance);

		return {
			status: "success",
			message: `Updated phase "${instance.currentPhase}": +${addedFindings} findings, +${addedItems} backlog items, +${addedDecisions} decisions`,
			metadata: { instance },
		};
	}

	private async handleClose(name?: string, retrospective?: string[]): Promise<ToolResult> {
		if (!name) {
			return {
				status: "error",
				message: "Missing required option: name",
			};
		}

		const instance = await this.workflowRepo.readInstance(name);
		if (!instance) {
			return {
				status: "error",
				message: `Instance not found: ${name}`,
			};
		}

		if (instance.status === "completed" || instance.status === "archived") {
			return {
				status: "error",
				message: `Instance is already ${instance.status}`,
			};
		}

		// Complete current phase if still in-progress
		const currentPhaseState = instance.phaseState[instance.currentPhase];
		if (currentPhaseState && currentPhaseState.status === "in-progress") {
			currentPhaseState.status = "completed";
			currentPhaseState.completedAt = new Date().toISOString();
			if (retrospective) {
				currentPhaseState.retrospectiveFindings.push(...retrospective);
			}
		}

		// Collect incomplete work warnings (G6)
		const warnings: string[] = [];

		// Check for incomplete phases (not-started or skipped)
		for (const [phaseName, state] of Object.entries(instance.phaseState)) {
			if (state.status === "not-started" || state.status === "in-progress") {
				warnings.push(`Phase "${phaseName}" is ${state.status}`);
			}
		}

		// Check for remaining backlog items across all phases
		const totalBacklog = Object.values(instance.phaseState)
			.flatMap((s) => s.backlogItems)
			.filter((item) => !item.deferredTo);
		if (totalBacklog.length > 0) {
			warnings.push(`${totalBacklog.length} unresolved backlog item(s) remain`);
		}

		instance.status = "completed";
		instance.updated = new Date().toISOString();
		await this.workflowRepo.writeInstance(instance);

		const warningLines = warnings.map((w) => `- ${w}`).join("\n");
		const warningMessage = warnings.length > 0 ? `\nWarnings:\n${warningLines}` : "";

		return {
			status: "success",
			message: `Instance "${name}" closed and marked as completed.${warningMessage}`,
			metadata: { instance, warnings },
		};
	}

	private async handleStale(thresholdDays?: number): Promise<ToolResult> {
		const stale = await this.workflowRepo.findStaleInstances(thresholdDays);
		return {
			status: "success",
			message:
				stale.length === 0 ? "No stale instances found" : `${stale.length} stale instance(s) found`,
			metadata: { stale },
		};
	}

	// -- G3: Backlog-to-Beads sync ------------------------------------------

	private async handleSyncBacklog(name?: string): Promise<ToolResult> {
		if (!name) {
			return { status: "error", message: "Missing required option: name" };
		}

		const instance = await this.workflowRepo.readInstance(name);
		if (!instance) {
			return { status: "error", message: `Instance not found: ${name}` };
		}

		// Collect all unresolved, unsynced backlog items
		const unsynced: Array<{ phaseName: string; item: BacklogItem }> = [];
		for (const [phaseName, state] of Object.entries(instance.phaseState)) {
			for (const item of state.backlogItems) {
				if (!item.deferredTo && !item.syncedToBeads) {
					unsynced.push({ phaseName, item });
				}
			}
		}

		if (unsynced.length === 0) {
			return {
				status: "success",
				message: "No unsynced backlog items to sync.",
				metadata: { synced: [] },
			};
		}

		const synced: Array<{ description: string; beadsId: string }> = [];
		const errors: string[] = [];

		for (const { phaseName, item } of unsynced) {
			const priorityFlag = mapPriority(item.priority);
			const title = `[${instance.name}/${phaseName}] ${item.description}`;
			try {
				const beadsId = await spawnBdCreate(title, priorityFlag);
				if (beadsId) {
					item.syncedToBeads = beadsId;
					synced.push({ description: item.description, beadsId });
				}
			} catch (err) {
				errors.push(
					`Failed to sync "${item.description}": ${err instanceof Error ? err.message : String(err)}`
				);
			}
		}

		await this.workflowRepo.writeInstance(instance);

		const messageParts = [`${synced.length} backlog item(s) synced to Beads.`];
		if (errors.length > 0) {
			messageParts.push(`${errors.length} error(s):`);
			for (const e of errors) {
				messageParts.push(`  - ${e}`);
			}
		}

		return {
			status: errors.length > 0 ? "error" : "success",
			message: messageParts.join("\n"),
			metadata: { synced, errors },
		};
	}

	// -- G7: Plan-to-execution handoff --------------------------------------

	private async handleHandoff(name?: string): Promise<ToolResult> {
		if (!name) {
			return { status: "error", message: "Missing required option: name" };
		}

		const instance = await this.workflowRepo.readInstance(name);
		if (!instance) {
			return { status: "error", message: `Instance not found: ${name}` };
		}

		if (instance.status !== "in-progress") {
			return { status: "error", message: `Instance is ${instance.status}, must be in-progress` };
		}

		const template = await this.loadTemplate(instance.template);
		const phases = template?.phases ?? [];
		const currentIdx = phases.findIndex((p) => p.name === instance.currentPhase);
		const prevIdx = currentIdx - 1;

		// Gather completed phase data
		const completedPhases = phases.filter((_, i) => i <= currentIdx);
		const decisions = completedPhases.flatMap((p) => instance.phaseState[p.name]?.decisions ?? []);
		const artifacts = completedPhases.flatMap((p) => instance.phaseState[p.name]?.artifacts ?? []);
		const deferredItems = completedPhases.flatMap(
			(p) => instance.phaseState[p.name]?.backlogItems.filter((bi) => bi.deferredTo) ?? []
		);
		const retrospective = completedPhases.flatMap(
			(p) => instance.phaseState[p.name]?.retrospectiveFindings ?? []
		);

		// Gate criteria for current phase
		const currentPhaseDef = phases[currentIdx];
		const gateCriteria = currentPhaseDef?.gate ?? [];

		// Gate check of prior phase if exists
		let gateCheck: { passed: boolean; warnings: string[] } | undefined;
		if (prevIdx >= 0) {
			const prevPhaseDef = phases[prevIdx];
			const prevPhaseState = instance.phaseState[prevPhaseDef.name];
			const check = this.checkGateCriteria(prevPhaseDef, prevPhaseState);
			gateCheck = { passed: check.passed, warnings: check.warnings };
		}

		const handoff = {
			instanceName: instance.name,
			completedPhase: prevIdx >= 0 ? phases[prevIdx].name : "(start)",
			nextPhase: instance.currentPhase,
			decisions,
			artifacts,
			deferredItems,
			gateCriteria,
			gateCheck,
			retrospective,
		};

		return {
			status: "success",
			message: `Handoff for "${instance.name}": ${completedPhases.length} phases done, entering "${instance.currentPhase}"`,
			metadata: { handoff },
		};
	}

	// -- G9: Cross-session resume -------------------------------------------

	private async handleResume(name?: string): Promise<ToolResult> {
		if (!name) {
			return { status: "error", message: "Missing required option: name" };
		}

		const instance = await this.workflowRepo.readInstance(name);
		if (!instance) {
			return { status: "error", message: `Instance not found: ${name}` };
		}

		if (instance.status !== "in-progress") {
			return { status: "error", message: `Instance is ${instance.status}, must be in-progress` };
		}

		const template = await this.loadTemplate(instance.template);
		const phases = template?.phases ?? [];

		// Completed phases and decisions
		const completedPhases = phases.filter(
			(p) => instance.phaseState[p.name]?.status === "completed"
		);
		const completedDecisions = completedPhases.flatMap(
			(p) => instance.phaseState[p.name]?.decisions ?? []
		);

		// Active backlog (not deferred, not synced) in current phase
		const currentPhaseState = instance.phaseState[instance.currentPhase];
		const activeBacklog = (currentPhaseState?.backlogItems ?? []).filter((bi) => !bi.deferredTo);

		// Deferred items from prior phases
		const deferredFromPriorPhases = completedPhases.flatMap(
			(p) => instance.phaseState[p.name]?.backlogItems.filter((bi) => bi.deferredTo) ?? []
		);

		// All artifacts
		const allArtifacts = phases.flatMap((p) => instance.phaseState[p.name]?.artifacts ?? []);

		// Gate criteria for current phase
		const currentPhaseDef = phases.find((p) => p.name === instance.currentPhase);
		const gateCriteria = currentPhaseDef?.gate ?? [];

		// Remaining phases
		const remainingPhases = phases
			.filter((p) => instance.phaseState[p.name]?.status !== "completed")
			.map((p) => p.name);

		const resume = {
			instanceName: instance.name,
			template: instance.template,
			currentPhase: instance.currentPhase,
			phaseStatus: currentPhaseState?.status ?? "not-started",
			completedDecisions,
			activeBacklog,
			deferredFromPriorPhases,
			gateCriteria,
			allArtifacts,
			completedPhases: completedPhases.map((p) => p.name),
			remainingPhases,
		};

		return {
			status: "success",
			message: `Resume "${instance.name}": phase ${instance.currentPhase}, ${completedPhases.length}/${phases.length} phases done`,
			metadata: { resume },
		};
	}

	// -- Helpers ------------------------------------------------------------

	/** Load a template by name, trying both with and without .yaml extension. */
	private async loadTemplate(templateName: string): Promise<WorkflowTemplate | null> {
		let fileName = templateName;
		if (!fileName.endsWith(".yaml")) {
			fileName = `${fileName}.yaml`;
		}

		const template = await this.workflowRepo.readTemplate(fileName);
		if (template) {
			return template;
		}

		// Try without extension in case user provided it
		if (templateName.endsWith(".yaml")) {
			return this.workflowRepo.readTemplate(templateName);
		}

		return null;
	}

	/**
	 * Check gate criteria for a completed phase.
	 * Verifies that retrospective findings address each gate criterion.
	 * Returns a structured result with pass/fail status and warnings.
	 */
	private checkGateCriteria(
		phaseDef: WorkflowPhase | undefined,
		phaseState: { retrospectiveFindings: string[]; backlogItems: BacklogItem[] } | undefined
	): GateCheckResult {
		const result: GateCheckResult = { passed: true, checked: [], warnings: [] };

		if (!phaseDef || !phaseState) {
			return result;
		}

		// No gate criteria — automatically passes
		if (phaseDef.gate.length === 0) {
			return result;
		}

		for (const criterion of phaseDef.gate) {
			const checked = { criterion, satisfied: false, finding: null as string | null };

			// Check if any retrospective finding addresses this criterion
			// Heuristic: finding contains key words from the criterion
			const criterionWords = extractKeyWords(criterion);
			for (const finding of phaseState.retrospectiveFindings) {
				const findingWords = extractKeyWords(finding);
				if (hasKeywordOverlap(criterionWords, findingWords)) {
					checked.satisfied = true;
					checked.finding = finding;
					break;
				}
			}

			result.checked.push(checked);
			if (!checked.satisfied) {
				result.passed = false;
				result.warnings.push(`Gate not addressed: "${criterion}"`);
			}
		}

		return result;
	}
}

// -- Beads integration (G3) --------------------------------------------------

function mapPriority(p: "high" | "medium" | "low"): string {
	switch (p) {
		case "high":
			return "1";
		case "medium":
			return "2";
		case "low":
			return "3";
	}
}

/**
 * Spawn `bd create` to sync a backlog item to Beads.
 * Returns the issue ID on success, null on failure.
 */
async function spawnBdCreate(title: string, priority: string): Promise<string | null> {
	try {
		const { execSync } = await import("node:child_process");
		const output = execSync(
			`bd create ${JSON.stringify(title)} --priority ${priority} --type task --silent`,
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		return output.trim() || null;
	} catch {
		return null;
	}
}
