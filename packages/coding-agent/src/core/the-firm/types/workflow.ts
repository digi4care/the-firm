import type { ToolInput } from "./pipeline.js";

// -- Template types (deployed from defaults/workflows/) ---------------------

export interface WorkflowPhase {
	name: string;
	agent?: string;
	skills?: string[];
	gate: string[];
	retrospective: string[];
}

export interface WorkflowTemplate {
	name: string;
	description: string;
	type: string;
	phases: WorkflowPhase[];
}

// -- Instance types (live state in .firm/operations/workflows/instances/) ---

export type PhaseStatus = "not-started" | "in-progress" | "completed";

export interface BacklogItem {
	description: string;
	priority: "high" | "medium" | "low";
	deferredTo?: string;
	syncedToBeads?: string; // Beads issue ID after sync
}
export interface DecisionEntry {
	description: string;
	outcome: string;
	alternatives?: string[];
}

export interface PhaseState {
	status: PhaseStatus;
	completedAt?: string;
	retrospectiveFindings: string[];
	backlogItems: BacklogItem[];
	decisions: DecisionEntry[];
	artifacts: string[];
}

export type WorkflowInstanceStatus = "not-started" | "in-progress" | "completed" | "archived";

export interface WorkflowInstance {
	template: string;
	name: string;
	linkedSpec?: string;
	status: WorkflowInstanceStatus;
	currentPhase: string;
	created: string;
	updated: string;
	phaseState: Record<string, PhaseState>;
}

export type StaleReason = "not-started-too-long" | "no-recent-progress";

export interface StaleInstance {
	name: string;
	instance: WorkflowInstance;
	reason: StaleReason;
	staleDays: number;
}

// -- Tool input / action types ----------------------------------------------

export type WorkflowAction =
	| "list"
	| "create"
	| "status"
	| "advance"
	| "update"
	| "close"
	| "stale"
	| "sync-backlog"
	| "handoff"
	| "resume";

export interface WorkflowInput extends ToolInput {
	options: {
		action: WorkflowAction;
		template?: string;
		name?: string;
		spec?: string;
		retrospective?: string[];
		backlog?: BacklogItem[];
		decisions?: DecisionEntry[];
		staleThresholdDays?: number;
		artifacts?: string[];
	};
}

// -- File system paths (constants) ------------------------------------------

export const WORKFLOW_TEMPLATES_DIR = "operations/workflows/templates";
export const WORKFLOW_INSTANCES_DIR = "operations/workflows/instances";

// -- Structured output types ------------------------------------------------

/** Result of a plan-to-execution handoff between phases. */
export interface HandoffResult {
	instanceName: string;
	completedPhase: string;
	nextPhase: string;
	decisions: DecisionEntry[];
	artifacts: string[];
	deferredItems: BacklogItem[];
	gateCriteria: string[];
	gateCheck?: { passed: boolean; warnings: string[] };
	retrospective: string[];
}

/** Session-resume summary for cross-session continuity. */
export interface ResumeResult {
	instanceName: string;
	template: string;
	currentPhase: string;
	phaseStatus: PhaseStatus;
	completedDecisions: DecisionEntry[];
	activeBacklog: BacklogItem[];
	deferredFromPriorPhases: BacklogItem[];
	gateCriteria: string[];
	allArtifacts: string[];
	completedPhases: string[];
	remainingPhases: string[];
}
